'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppData } from '@/components/data/AppDataProvider'
import type { RecommendedAction, Task } from '@/types/action'
import type { Lead } from '@/types/lead'

type TaskFilter = 'all' | 'scheduled' | 'today' | 'week' | 'month' | 'overdue' | 'finished'

type CrmTask = {
  id: string
  actionId?: string
  title: string
  type: Task['type']
  lead?: Lead | null
  dueDate: string | null
  dueTime: string | null
  pipeline: string
  origin: 'AI' | 'Manual'
  completed: boolean
  summary: string
  priority?: number
}

type AddTaskFormState = {
  title: string
  description: string
  actionType: 'call' | 'text' | 'email' | 'schedule_followup'
  personId: string
  dueDate: string
  dueTime: string
}

const COMPLETED_ACTIONS_KEY = 'lofty:completedActions'

const FILTER_LABELS: Record<TaskFilter, string> = {
  all: 'All Tasks',
  scheduled: 'Scheduled',
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  overdue: 'Overdue',
  finished: 'Finished',
}

const TASK_TYPE_META: Record<Task['type'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  call: { label: 'Call', icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  text: { label: 'Text', icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
  email: { label: 'Email', icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  other: { label: 'Task', icon: ClipboardList, color: 'text-gray-600', bg: 'bg-gray-100' },
}

function readStoredActionIds() {
  if (typeof window === 'undefined') return new Set<string>()
  try {
    const current = JSON.parse(window.localStorage.getItem(COMPLETED_ACTIONS_KEY) ?? '[]') as unknown
    return new Set(Array.isArray(current) ? current.filter((id): id is string => typeof id === 'string') : [])
  } catch {
    return new Set<string>()
  }
}

function writeStoredActionIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(COMPLETED_ACTIONS_KEY, JSON.stringify(Array.from(ids).slice(-50)))
  } catch {
    // Local storage keeps the demo state in sync between pages.
  }
}

function notifyActionCompleted(actionId: string) {
  window.dispatchEvent(new CustomEvent('lofty:action-completed', {
    detail: { actionId },
  }))
}

function notifyActionRestored(actionId: string) {
  window.dispatchEvent(new CustomEvent('lofty:action-restored', {
    detail: { actionId },
  }))
}

function notifyAppDataRefresh() {
  window.dispatchEvent(new Event('lofty:app-data-refresh'))
}

async function persistCompletedAction(actionId: string) {
  try {
    const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/complete`, {
      method: 'POST',
    })
    if (response.ok) notifyAppDataRefresh()
  } catch (error) {
    console.error('[Tasks] Could not persist completed action:', error)
  }
}

async function persistRestoredAction(actionId: string) {
  try {
    const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/undo`, {
      method: 'POST',
    })
    if (response.ok) notifyAppDataRefresh()
  } catch (error) {
    console.error('[Tasks] Could not restore action:', error)
  }
}

export default function TasksPage() {
  const { data, reload } = useAppData()
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all')
  const [completedActionIds, setCompletedActionIds] = useState<Set<string>>(() => readStoredActionIds())
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const today = useMemo(() => getTodayDateString(), [])
  const tasks = useMemo(
    () => buildCrmTasks(data.actions, data.tasks, data.leads, completedActionIds),
    [completedActionIds, data.actions, data.leads, data.tasks],
  )
  const counts = useMemo(() => getFilterCounts(tasks, today), [tasks, today])
  const visibleTasks = tasks.filter((task) => matchesFilter(task, activeFilter, today))

  useEffect(() => {
    const handleActionCompleted = (event: Event) => {
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail?.actionId
      if (!actionId) return
      setCompletedActionIds((prev) => new Set([...prev, actionId]))
    }
    const handleActionRestored = (event: Event) => {
      const actionId = (event as CustomEvent<{ actionId?: string }>).detail?.actionId
      if (!actionId) return
      setCompletedActionIds((prev) => {
        const next = new Set(prev)
        next.delete(actionId)
        return next
      })
    }

    window.addEventListener('lofty:action-completed', handleActionCompleted)
    window.addEventListener('lofty:action-restored', handleActionRestored)
    return () => {
      window.removeEventListener('lofty:action-completed', handleActionCompleted)
      window.removeEventListener('lofty:action-restored', handleActionRestored)
    }
  }, [])

  function markDone(task: CrmTask) {
    if (!task.actionId) return
    setCompletedActionIds((prev) => {
      const next = new Set(prev)
      next.add(task.actionId as string)
      writeStoredActionIds(next)
      return next
    })
    notifyActionCompleted(task.actionId)
    void persistCompletedAction(task.actionId)
  }

  function undoTask(task: CrmTask) {
    if (!task.actionId) return
    setCompletedActionIds((prev) => {
      const next = new Set(prev)
      next.delete(task.actionId as string)
      writeStoredActionIds(next)
      return next
    })
    notifyActionRestored(task.actionId)
    void persistRestoredAction(task.actionId)
  }

  async function createTask(form: AddTaskFormState) {
    setSaving(true)
    setSaveError(null)

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error ?? 'Task could not be created.')
      }

      setAddTaskOpen(false)
      notifyAppDataRefresh()
      await reload()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Task could not be created.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell>
      <div className="flex min-w-0 flex-1 bg-[#F8FAFC]">
        <aside className="w-44 shrink-0 border-r border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-4">
            <p className="text-sm font-bold uppercase tracking-widest text-gray-900">My Tasks</p>
          </div>
          <nav className="py-1">
            {(Object.keys(FILTER_LABELS) as TaskFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={[
                  'flex w-full items-center justify-between px-4 py-2.5 text-left text-xs transition-colors',
                  activeFilter === filter
                    ? 'bg-gray-100 font-semibold text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                ].join(' ')}
              >
                <span>{FILTER_LABELS[filter]}</span>
                <span className="text-gray-400">{counts[filter]}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main data-assistant-id="section:tasks" className="min-w-0 flex-1 overflow-y-auto">
          <div className="flex h-9 items-center justify-between border-b border-gray-200 bg-white">
            <div className="flex h-full items-center">
              <FilterButton label="Task Type" />
              <FilterButton label="Pipeline" />
              <FilterButton label="Task Origin" />
            </div>
            <Button
              className="h-9 rounded-none bg-[#3154d4] px-4 text-xs text-white hover:bg-[#2747b8]"
              onClick={() => setAddTaskOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add New
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="p-4">
            <div className="mb-4 grid grid-cols-4 gap-3">
              <TaskMetric label="Open Tasks" value={counts.all - counts.finished} icon={ClipboardList} color="text-[#1a6bcc]" />
              <TaskMetric label="Scheduled" value={counts.scheduled} icon={CalendarDays} color="text-violet-600" />
              <TaskMetric label="Due Today" value={counts.today} icon={Clock} color="text-amber-600" />
              <TaskMetric label="Finished" value={counts.finished} icon={CheckCircle2} color="text-emerald-600" />
            </div>

            {visibleTasks.length > 0 ? (
              <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                <div className="grid grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr_0.7fr] gap-3 border-b border-gray-100 bg-gray-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  <span>Task</span>
                  <span>Pipeline</span>
                  <span>Due</span>
                  <span>Origin</span>
                  <span className="text-right">Action</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {visibleTasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onMarkDone={markDone}
                      onUndo={undoTask}
                    />
                  ))}
                </div>
              </section>
            ) : (
              <section className="rounded-sm border border-gray-200 bg-white px-8 py-9">
                <div className="flex items-center gap-5">
                  <ClipboardList className="h-10 w-10 text-gray-200" />
                  <div>
                    <p className="text-sm text-gray-400">There are no tasks that match these filters.</p>
                    <p className="mt-1 text-xs text-gray-400">
                      Please click <span className="font-semibold text-[#3154d4]">+ Add New</span> to create one.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        {addTaskOpen && (
          <AddTaskDialog
            leads={data.leads}
            today={today}
            saving={saving}
            error={saveError}
            onClose={() => {
              if (!saving) {
                setAddTaskOpen(false)
                setSaveError(null)
              }
            }}
            onSubmit={createTask}
          />
        )}
      </div>
    </AppShell>
  )
}

function FilterButton({ label }: { label: string }) {
  return (
    <button className="flex h-full items-center gap-1 border-r border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50">
      {label}
      <ChevronDown className="h-3 w-3 text-gray-400" />
    </button>
  )
}

function AddTaskDialog({
  leads,
  today,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  leads: Lead[]
  today: string
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (form: AddTaskFormState) => Promise<void>
}) {
  const [form, setForm] = useState<AddTaskFormState>({
    title: '',
    description: '',
    actionType: 'schedule_followup',
    personId: leads[0]?.id ?? '',
    dueDate: today,
    dueTime: '09:00',
  })

  function updateField<K extends keyof AddTaskFormState>(key: K, value: AddTaskFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(form)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/30 px-4 backdrop-blur-[1px]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <ClipboardList className="h-5 w-5 text-[#1a6bcc]" />
            </div>
            <div>
              <Badge className="mb-2 border-0 bg-blue-50 text-[#1a6bcc]">New CRM Task</Badge>
              <h2 className="text-base font-bold text-gray-900">Add a task</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                This creates a task in the same action stream used by Calendar, Overview, and the briefing.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Close add task"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Task title</span>
            <input
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              placeholder="Follow up about showing availability"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a6bcc] focus:ring-2 focus:ring-[#1a6bcc]/10"
              required
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-gray-700">Details</span>
            <textarea
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              placeholder="Add the context the agent should remember."
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a6bcc] focus:ring-2 focus:ring-[#1a6bcc]/10"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Task type</span>
              <select
                value={form.actionType}
                onChange={(event) => updateField('actionType', event.target.value as AddTaskFormState['actionType'])}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a6bcc] focus:ring-2 focus:ring-[#1a6bcc]/10"
              >
                <option value="schedule_followup">General task</option>
                <option value="call">Call</option>
                <option value="text">Text</option>
                <option value="email">Email</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Lead</span>
              <select
                value={form.personId}
                onChange={(event) => updateField('personId', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a6bcc] focus:ring-2 focus:ring-[#1a6bcc]/10"
              >
                <option value="">No lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Due date</span>
              <input
                type="date"
                value={form.dueDate}
                onChange={(event) => updateField('dueDate', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a6bcc] focus:ring-2 focus:ring-[#1a6bcc]/10"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold text-gray-700">Time</span>
              <input
                type="time"
                value={form.dueTime}
                onChange={(event) => updateField('dueTime', event.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#1a6bcc] focus:ring-2 focus:ring-[#1a6bcc]/10"
              />
            </label>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
              <p className="text-xs leading-relaxed text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            className="h-8 bg-[#1a6bcc] text-xs text-white hover:bg-[#1558a8]"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function TaskMetric({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function TaskRow({
  task,
  onMarkDone,
  onUndo,
}: {
  task: CrmTask
  onMarkDone: (task: CrmTask) => void
  onUndo: (task: CrmTask) => void
}) {
  const meta = TASK_TYPE_META[task.type]
  const Icon = meta.icon

  return (
    <div
      data-assistant-id={task.actionId ? `action:${task.actionId}` : undefined}
      className="grid grid-cols-[1.35fr_0.85fr_0.85fr_0.85fr_0.7fr] gap-3 px-4 py-3"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
          <Icon className={`h-4 w-4 ${meta.color}`} />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
            {task.completed && <Badge className="border-0 bg-emerald-100 text-emerald-700">Finished</Badge>}
            {task.priority !== undefined && (
              <Badge className="border-0 bg-blue-50 text-[#1a6bcc]">Score {Math.round(task.priority)}</Badge>
            )}
          </div>
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{task.summary}</p>
          {task.lead && (
            <p className="mt-1 text-[11px] text-gray-400">{task.lead.name} · {task.lead.email}</p>
          )}
        </div>
      </div>
      <div className="flex items-center text-xs capitalize text-gray-600">{task.pipeline}</div>
      <div className="flex items-center text-xs text-gray-600">
        {task.dueDate ? `${formatShortDate(task.dueDate)}${task.dueTime ? ` · ${task.dueTime}` : ''}` : 'No due time'}
      </div>
      <div className="flex items-center">
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-[#1a6bcc]">
          {task.origin === 'AI' && <Sparkles className="h-3 w-3" />}
          {task.origin}
        </span>
      </div>
      <div className="flex items-center justify-end">
        {task.completed ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-xs"
            disabled={!task.actionId}
            onClick={() => onUndo(task)}
          >
            <RotateCcw className="h-3 w-3" />
            Undo
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-7 bg-[#1a6bcc] text-xs text-white hover:bg-[#1558a8]"
            disabled={!task.actionId}
            onClick={() => onMarkDone(task)}
          >
            Mark Done
          </Button>
        )}
      </div>
    </div>
  )
}

function buildCrmTasks(
  actions: RecommendedAction[],
  tasks: Task[],
  leads: Lead[],
  completedActionIds: Set<string>,
): CrmTask[] {
  const actionTasks: CrmTask[] = actions.map((action) => {
    const lead = action.leadId ? leads.find((item) => item.id === action.leadId) ?? null : null
    const due = parseTaskDate(action.scheduledFor)
    const type: Task['type'] = action.type === 'call'
      ? 'call'
      : action.type === 'text'
        ? 'text'
        : action.type === 'email' || action.type === 'send_listing'
          ? 'email'
          : 'other'

    return {
      id: `action:${action.id}`,
      actionId: action.id,
      title: action.title,
      type,
      lead,
      dueDate: due.date,
      dueTime: due.time,
      pipeline: lead?.stage ?? 'crm',
      origin: action.id.startsWith('manual_task_') ? 'Manual' as const : 'AI' as const,
      completed: action.status === 'done' || completedActionIds.has(action.id),
      summary: action.summary,
      priority: action.priorityScore,
    }
  })

  const actionIds = new Set(actionTasks.map((task) => task.actionId))
  const looseTasks: CrmTask[] = tasks
    .filter((task) => !task.id.startsWith('task:') || !actionIds.has(task.id.replace(/^task:/, '')))
    .map((task) => {
      const lead = task.leadId ? leads.find((item) => item.id === task.leadId) ?? null : null
      const due = parseTaskDate(task.scheduledFor)

      return {
        id: task.id,
        title: task.title,
        type: task.type,
        lead,
        dueDate: due.date,
        dueTime: task.dueTime ?? due.time,
        pipeline: lead?.stage ?? 'crm',
        origin: 'Manual' as const,
        completed: task.completed,
        summary: lead ? `Follow-up for ${lead.name}.` : 'CRM task.',
      }
    })

  return [...actionTasks, ...looseTasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1
    if (!a.dueDate && b.dueDate) return 1
    if (a.dueDate && !b.dueDate) return -1
    return (b.priority ?? 0) - (a.priority ?? 0)
  })
}

function getFilterCounts(tasks: CrmTask[], today: string) {
  return {
    all: tasks.length,
    scheduled: tasks.filter((task) => !!task.dueDate && !task.completed).length,
    today: tasks.filter((task) => task.dueDate === today && !task.completed).length,
    week: tasks.filter((task) => isWithinDays(task.dueDate, today, 7) && !task.completed).length,
    month: tasks.filter((task) => isSameMonth(task.dueDate, today) && !task.completed).length,
    overdue: tasks.filter((task) => !!task.dueDate && task.dueDate < today && !task.completed).length,
    finished: tasks.filter((task) => task.completed).length,
  }
}

function matchesFilter(task: CrmTask, filter: TaskFilter, today: string) {
  if (filter === 'all') return true
  if (filter === 'scheduled') return !!task.dueDate && !task.completed
  if (filter === 'today') return task.dueDate === today && !task.completed
  if (filter === 'week') return isWithinDays(task.dueDate, today, 7) && !task.completed
  if (filter === 'month') return isSameMonth(task.dueDate, today) && !task.completed
  if (filter === 'overdue') return !!task.dueDate && task.dueDate < today && !task.completed
  return task.completed
}

function parseTaskDate(value?: string) {
  if (!value) return { date: null, time: null }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return { date: value.slice(0, 10) || null, time: null }

  return {
    date: parsed.toISOString().slice(0, 10),
    time: parsed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  }
}

function getTodayDateString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function isWithinDays(date: string | null, today: string, days: number) {
  if (!date) return false
  const start = new Date(`${today}T00:00:00`)
  const target = new Date(`${date}T00:00:00`)
  if (Number.isNaN(target.getTime())) return false
  const diff = target.getTime() - start.getTime()
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

function isSameMonth(date: string | null, today: string) {
  if (!date) return false
  return date.slice(0, 7) === today.slice(0, 7)
}

function formatShortDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
