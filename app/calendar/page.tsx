'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CalendarDays,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Sparkles,
  Users,
} from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { mockLeads, mockTasks, mockTransactions } from '@/lib/mock-data'
import type { Task } from '@/types/action'

type CalendarView = 'day' | 'week' | 'month'
type EventSource = 'task' | 'appointment' | 'deadline'

type CalendarEvent = {
  id: string
  source: EventSource
  title: string
  owner: string
  date: string
  start: number
  end: number
  aiAdded?: boolean
  conflict?: boolean
  outsideAvailability?: boolean
  suggestedStart?: number
  note: string
  type?: Task['type']
}

const DEMO_DATE = '2026-04-18'
const WEEK_DAYS = [
  { label: 'Mon', date: '2026-04-13', day: 13 },
  { label: 'Tue', date: '2026-04-14', day: 14 },
  { label: 'Wed', date: '2026-04-15', day: 15 },
  { label: 'Thu', date: '2026-04-16', day: 16 },
  { label: 'Fri', date: '2026-04-17', day: 17 },
  { label: 'Sat', date: '2026-04-18', day: 18 },
  { label: 'Sun', date: '2026-04-19', day: 19 },
]
const MONTH_DAYS = Array.from({ length: 30 }, (_, idx) => idx + 1)
const WORK_WINDOWS = [
  { label: 'Morning', start: 9 * 60, end: 12 * 60 },
  { label: 'Afternoon', start: 13 * 60, end: 17 * 60 },
]
const TIME_ROWS = Array.from({ length: 9 }, (_, index) => 9 * 60 + index * 60)

const appointments: CalendarEvent[] = [
  {
    id: 'appt-robert-11',
    source: 'appointment',
    title: 'Showing: 182 Saint Peter St',
    owner: 'Robert Nguyen',
    date: DEMO_DATE,
    start: 11 * 60,
    end: 11 * 60 + 45,
    note: 'Client showing already booked from IDX request.',
  },
  {
    id: 'appt-annette-2',
    source: 'appointment',
    title: 'Showing: 26096 Dougherty Pl',
    owner: 'Annette Black',
    date: DEMO_DATE,
    start: 14 * 60,
    end: 14 * 60 + 45,
    note: 'Luxury buyer appointment synced to calendar.',
  },
]

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>('day')
  const calendar = useMemo(() => buildCalendarEvents(), [])
  const conflicts = calendar.filter((event) => event.conflict || event.outsideAvailability)
  const taskEvents = calendar.filter((event) => event.source === 'task')

  return (
    <AppShell>
      <main className="min-w-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-[1500px] space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/dashboard"
                className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#1a6bcc] hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to overview
              </Link>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#1a6bcc]" />
                <h1 className="text-xl font-bold text-gray-900">Calendar</h1>
                <Badge className="border-0 bg-blue-50 text-[#1a6bcc]">
                  {taskEvents.length} AI-added tasks
                </Badge>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                AI places tasks on the agent&apos;s calendar, detects conflicts, and suggests open windows.
              </p>
            </div>

            <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {(['day', 'week', 'month'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setView(item)}
                  className={[
                    'rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-colors',
                    view === item ? 'bg-[#1a6bcc] text-white' : 'text-gray-500 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <MetricCard label="AI-added Tasks" value={taskEvents.length} sub="From Today's Tasks" color="text-[#1a6bcc]" />
            <MetricCard label="Conflicts Found" value={conflicts.length} sub="Needs reschedule" color="text-red-600" />
            <MetricCard label="Free Windows" value={4} sub="Inside agent availability" color="text-emerald-600" />
            <MetricCard label="Work Hours" value={8} sub="9 AM - 5 PM, lunch protected" color="text-violet-600" />
          </div>

          <section
            data-assistant-id="section:calendar"
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <p className="text-sm font-bold text-gray-900">Saturday, April 18</p>
                <p className="text-xs text-gray-400">AI calendar draft for James Carter</p>
              </div>
              <Badge className="border-0 bg-emerald-50 text-emerald-700">
                Agent availability applied
              </Badge>
            </div>

            {view === 'day' && <DayView events={calendar} />}
            {view === 'week' && <WeekView events={calendar} />}
            {view === 'month' && <MonthView events={calendar} />}
          </section>

          <div
            data-assistant-id="section:calendar-conflicts"
            className="grid grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-4"
          >
            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#1a6bcc]" />
                <p className="text-sm font-bold text-gray-900">AI scheduling notes</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {conflicts.map((event) => (
                  <ConflictCard key={event.id} event={event} />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-bold text-gray-900">Agent free time</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {WORK_WINDOWS.map((slot) => (
                  <div key={slot.label} className="rounded-xl bg-emerald-50 px-3 py-3">
                    <p className="text-xs font-semibold text-emerald-800">{slot.label}</p>
                    <p className="mt-1 text-xs text-emerald-600">
                      {formatTime(slot.start)} - {formatTime(slot.end)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-gray-500">
                Future message sends should use these windows and avoid existing showings, calls, and lunch.
              </p>
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  )
}

function buildCalendarEvents(): CalendarEvent[] {
  const taskEvents: CalendarEvent[] = mockTasks.map((task, index) => {
    const lead = task.leadId ? mockLeads.find((item) => item.id === task.leadId) : null
    const start = resolveTaskStart(task, index)
    return {
      id: `task:${task.id}`,
      source: 'task',
      title: task.title,
      owner: lead?.name ?? 'Lofty task',
      date: DEMO_DATE,
      start,
      end: start + 30,
      aiAdded: true,
      note: task.dueTime === 'Anytime'
        ? 'AI placed this anytime task into the first useful open slot.'
        : 'AI added this existing task to the calendar.',
      type: task.type,
    }
  })

  const deadlineEvents: CalendarEvent[] = mockTransactions
    .filter((tx) => tx.daysUntilDeadline <= 2)
    .map((tx) => ({
      id: `deadline:${tx.id}`,
      source: 'deadline',
      title: tx.nextDeadlineLabel,
      owner: tx.address.split(',')[0],
      date: tx.daysUntilDeadline === 1 ? '2026-04-19' : DEMO_DATE,
      start: 16 * 60,
      end: 16 * 60 + 30,
      note: 'Transaction deadline added for visibility.',
    }))

  const combined = [...taskEvents, ...appointments, ...deadlineEvents]
  return combined.map((event, _index, all) => {
    const overlaps = all.some((other) =>
      other.id !== event.id &&
      other.date === event.date &&
      event.start < other.end &&
      event.end > other.start,
    )
    const outsideAvailability = !isInsideAvailability(event.start, event.end)

    return {
      ...event,
      conflict: overlaps,
      outsideAvailability,
      suggestedStart: overlaps || outsideAvailability ? findSuggestedStart(event, all) : undefined,
    }
  })
}

function resolveTaskStart(task: Task, index: number) {
  if (task.dueTime === '10:00 AM') return 10 * 60
  if (task.dueTime === '11:00 AM') return 11 * 60
  if (task.dueTime === '12:00 PM') return 12 * 60
  if (task.dueTime === '2:00 PM') return 14 * 60
  return 9 * 60 + (index + 1) * 30
}

function isInsideAvailability(start: number, end: number) {
  return WORK_WINDOWS.some((window) => start >= window.start && end <= window.end)
}

function findSuggestedStart(event: CalendarEvent, all: CalendarEvent[]) {
  for (const window of WORK_WINDOWS) {
    for (let start = window.start; start <= window.end - 30; start += 30) {
      const overlaps = all.some((other) =>
        other.id !== event.id &&
        other.date === event.date &&
        start < other.end &&
        start + 30 > other.start,
      )
      if (!overlaps) return start
    }
  }
  return undefined
}

function DayView({ events }: { events: CalendarEvent[] }) {
  const dayEvents = events.filter((event) => event.date === DEMO_DATE)

  return (
    <div className="divide-y divide-gray-100">
      {TIME_ROWS.map((time) => {
        const rowEvents = dayEvents.filter((event) => event.start >= time && event.start < time + 60)
        return (
          <div key={time} className="grid min-h-28 grid-cols-[104px_1fr]">
            <div className="border-r border-gray-100 px-5 py-5 text-xs font-medium text-gray-400">
              {formatTime(time)}
            </div>
            <div className="space-y-3 px-5 py-4">
              {rowEvents.length === 0 ? (
                <div className="h-16 rounded-xl border border-dashed border-gray-100 bg-gray-50/60" />
              ) : (
                rowEvents.map((event) => <EventCard key={event.id} event={event} />)
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function WeekView({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[960px] grid-cols-7 divide-x divide-gray-100">
        {WEEK_DAYS.map((day) => {
          const dayEvents = events.filter((event) => event.date === day.date)
          return (
            <div key={day.date} className={day.date === DEMO_DATE ? 'bg-blue-50/30' : ''}>
              <div className="border-b border-gray-100 px-4 py-4">
                <p className="text-xs font-semibold text-gray-400">{day.label}</p>
                <p className="text-lg font-bold text-gray-900">{day.day}</p>
              </div>
              <div className="min-h-[420px] space-y-3 p-4">
                {dayEvents.map((event) => (
                  <EventChip key={event.id} event={event} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthView({ events }: { events: CalendarEvent[] }) {
  return (
    <div className="grid grid-cols-7 gap-px bg-gray-100 p-px">
      {MONTH_DAYS.map((day) => {
        const date = `2026-04-${String(day).padStart(2, '0')}`
        const dayEvents = events.filter((event) => event.date === date)
        return (
          <div
            key={day}
            className={`min-h-32 bg-white p-3 ${date === DEMO_DATE ? 'ring-2 ring-inset ring-[#1a6bcc]' : ''}`}
          >
            <p className="mb-2 text-xs font-bold text-gray-700">{day}</p>
            <div className="space-y-1">
              {dayEvents.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={`truncate rounded px-2 py-1.5 text-[10px] font-medium ${event.conflict ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-[#1a6bcc]'}`}
                >
                  {event.title}
                </div>
              ))}
              {dayEvents.length > 3 && <p className="text-[10px] text-gray-400">+{dayEvents.length - 3} more</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EventCard({ event }: { event: CalendarEvent }) {
  const Icon = event.source === 'appointment' ? Users : event.type === 'email' ? Mail : event.type === 'text' ? MessageSquare : Phone

  return (
    <div
      data-assistant-id={event.id}
      className={[
        'rounded-xl border p-4',
        event.conflict || event.outsideAvailability
          ? 'border-red-200 bg-red-50'
          : event.source === 'appointment'
            ? 'border-emerald-100 bg-emerald-50'
            : 'border-blue-100 bg-blue-50',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
            <Icon className="h-4 w-4 text-[#1a6bcc]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900">{event.title}</p>
              {event.aiAdded && <Badge className="border-0 bg-white text-[#1a6bcc]">AI added</Badge>}
              {(event.conflict || event.outsideAvailability) && (
                <Badge className="border-0 bg-red-100 text-red-700">Needs reschedule</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {event.owner} · {formatTime(event.start)}-{formatTime(event.end)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">{event.note}</p>
          </div>
        </div>
        {event.suggestedStart !== undefined && (
          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-semibold text-emerald-700">
            Suggest {formatTime(event.suggestedStart)}
          </span>
        )}
      </div>
    </div>
  )
}

function EventChip({ event }: { event: CalendarEvent }) {
  return (
    <div
      data-assistant-id={event.id}
      className={`rounded-lg px-3 py-2 text-xs ${event.conflict ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-[#1a6bcc]'}`}
    >
      <p className="truncate font-semibold">{event.title}</p>
      <p className="text-[10px] opacity-70">{formatTime(event.start)}</p>
    </div>
  )
}

function ConflictCard({ event }: { event: CalendarEvent }) {
  return (
    <div className="rounded-xl border border-red-100 bg-red-50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
        <p className="text-xs font-bold text-red-700">{event.title}</p>
      </div>
      <p className="text-xs leading-relaxed text-red-600">
        {event.outsideAvailability
          ? 'This falls outside the agent availability window.'
          : 'This overlaps with an existing appointment or task.'}
      </p>
      {event.suggestedStart !== undefined && (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          AI suggestion: move to {formatTime(event.suggestedStart)}.
        </p>
      )}
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: number
  sub: string
  color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Bot className="h-3.5 w-3.5 text-gray-300" />
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-gray-400">{sub}</p>
    </div>
  )
}

function formatTime(minutes: number) {
  const hour24 = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const hour = hour24 % 12 || 12
  return `${hour}:${String(minute).padStart(2, '0')} ${suffix}`
}
