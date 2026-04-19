'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buildActionEmailPlan, type ActionEmailPlan } from '@/lib/actions/action-email'
import type { RecommendedAction, Transaction } from '@/types/action'
import type { Lead } from '@/types/lead'
import type { Property } from '@/types/property'

type ExecutePhase = 'review' | 'executing' | 'done'
type SendStatus = 'queued' | 'sending' | 'sent' | 'skipped' | 'error'

type PlannedAction = {
  action: RecommendedAction
  lead: Lead | null
  property: Property | null
  transaction: Transaction | null
  emailPlan: ActionEmailPlan | null
}

interface ExecuteDayDialogProps {
  open: boolean
  actions: RecommendedAction[]
  leads: Lead[]
  properties: Property[]
  transactions: Transaction[]
  onClose: () => void
  onActionDone: (action: RecommendedAction) => void
}

const ACTION_ICON: Record<RecommendedAction['type'], React.ElementType> = {
  call: Phone,
  text: MessageSquare,
  email: Mail,
  send_listing: Send,
  review_transaction: Clock,
  schedule_followup: CalendarDays,
}

export function ExecuteDayDialog({
  open,
  actions,
  leads,
  properties,
  transactions,
  onClose,
  onActionDone,
}: ExecuteDayDialogProps) {
  const [phase, setPhase] = useState<ExecutePhase>('review')
  const [statuses, setStatuses] = useState<Record<string, SendStatus>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  const plannedActions = useMemo<PlannedAction[]>(() => {
    return actions.map((action) => {
      const transaction = action.transactionId
        ? transactions.find((item) => item.id === action.transactionId) ?? null
        : null
      const leadId = action.leadId ?? transaction?.leadId
      const lead = leadId ? leads.find((item) => item.id === leadId) ?? null : null
      const property = action.propertyId
        ? properties.find((item) => item.id === action.propertyId) ?? null
        : null

      return {
        action,
        lead,
        property,
        transaction,
        emailPlan: buildActionEmailPlan(action, lead, property, transaction),
      }
    })
  }, [actions, leads, properties, transactions])

  const readyCount = plannedActions.filter((item) => item.emailPlan).length
  const skippedCount = plannedActions.length - readyCount
  const sentCount = Object.values(statuses).filter((status) => status === 'sent').length
  const hasErrors = Object.values(statuses).some((status) => status === 'error')
  const isBusy = phase === 'executing'

  if (!open) return null

  async function handleExecuteDay() {
    if (isBusy || readyCount === 0) return

    setPhase('executing')
    setErrors({})

    for (const item of plannedActions) {
      if (!item.emailPlan) {
        setStatuses((current) => ({ ...current, [item.action.id]: 'skipped' }))
        continue
      }

      setStatuses((current) => ({ ...current, [item.action.id]: 'sending' }))

      try {
        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: item.emailPlan.to,
            recipientName: item.emailPlan.recipientName,
            subject: item.emailPlan.subject,
            body: item.emailPlan.body,
            actionId: item.action.id,
          }),
        })
        const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null

        if (!response.ok || !result?.ok) {
          throw new Error(result?.error ?? 'Email could not be sent through SES.')
        }

        setStatuses((current) => ({ ...current, [item.action.id]: 'sent' }))
        onActionDone(item.action)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email could not be sent.'
        setErrors((current) => ({ ...current, [item.action.id]: message }))
        setStatuses((current) => ({ ...current, [item.action.id]: 'error' }))
      }
    }

    setPhase('done')
  }

  function handleClose() {
    if (!isBusy) onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/30 px-4 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="execute-day-title"
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Sparkles className="h-5 w-5 text-[#1a6bcc]" />
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-blue-100 text-[#1a6bcc]">Execute My Day</Badge>
                <Badge className="border-0 bg-emerald-100 text-emerald-700">
                  {readyCount} email-ready
                </Badge>
                {skippedCount > 0 && (
                  <Badge className="border-0 bg-amber-100 text-amber-700">
                    {skippedCount} need review
                  </Badge>
                )}
              </div>
              <h2 id="execute-day-title" className="text-base font-bold text-gray-900">
                Review what Copilot will send
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
                Calls and texts stay manual for the hackathon, so Copilot will send email fallbacks
                where a lead email is available. Successful sends are marked done across the dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isBusy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Close execute my day"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto bg-gray-50/60 px-5 py-4">
          {plannedActions.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-white p-8 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-9 w-9 text-emerald-500" />
              <p className="text-sm font-semibold text-gray-900">No pending actions to execute.</p>
              <p className="mt-1 text-xs text-gray-500">Your visible recommendation list is already clear.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plannedActions.map((item, index) => (
                <ExecutePlanCard
                  key={item.action.id}
                  index={index + 1}
                  item={item}
                  status={statuses[item.action.id] ?? 'queued'}
                  error={errors[item.action.id]}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-gray-100 bg-white px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-gray-700">
              {phase === 'done'
                ? `${sentCount} draft${sentCount === 1 ? '' : 's'} sent${hasErrors ? ' with one or more issues.' : '.'}`
                : `${readyCount} email draft${readyCount === 1 ? '' : 's'} ready to send.`}
            </p>
            <p className="mt-0.5 text-[11px] text-gray-400">
              You can review every subject and message before confirming.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={isBusy}
              onClick={handleClose}
            >
              {phase === 'done' ? 'Back to Dashboard' : 'Cancel'}
            </Button>
            {phase !== 'done' && (
              <Button
                size="sm"
                className="h-8 bg-[#1a6bcc] text-xs text-white hover:bg-[#1558a8]"
                disabled={isBusy || readyCount === 0}
                onClick={handleExecuteDay}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Sending drafts...
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5" />
                    Send {readyCount} email draft{readyCount === 1 ? '' : 's'}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ExecutePlanCard({
  index,
  item,
  status,
  error,
}: {
  index: number
  item: PlannedAction
  status: SendStatus
  error?: string
}) {
  const Icon = ACTION_ICON[item.action.type]
  const emailPlan = item.emailPlan

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1a6bcc] text-[11px] font-bold text-white">
          {index}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <Icon className="h-4 w-4 text-[#1a6bcc]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{item.action.title}</p>
            {emailPlan ? (
              <Badge className="border-0 bg-emerald-100 text-emerald-700">
                {emailPlan.channelLabel}
              </Badge>
            ) : (
              <Badge className="border-0 bg-amber-100 text-amber-700">
                Missing lead email
              </Badge>
            )}
            <StatusBadge status={status} />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.action.summary}</p>

          {emailPlan ? (
            <div className="mt-3 rounded-xl border border-[#1a6bcc]/10 bg-blue-50/50 p-3">
              <div className="grid gap-2 text-xs sm:grid-cols-[120px_1fr]">
                <span className="text-gray-400">To</span>
                <span className="font-medium text-gray-700">
                  {emailPlan.recipientName} · {emailPlan.to}
                </span>
                <span className="text-gray-400">Subject</span>
                <span className="font-medium text-gray-700">{emailPlan.subject}</span>
                <span className="text-gray-400">Plan</span>
                <span className="text-gray-600">{emailPlan.note}</span>
              </div>
              <div className="mt-3 rounded-lg border border-white bg-white/80 p-3">
                <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700">
                  {emailPlan.body}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-xs leading-relaxed text-amber-700">
                Copilot will skip this one because there is no lead email attached. It will stay pending.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
              <p className="text-xs leading-relaxed text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: SendStatus }) {
  if (status === 'sending') {
    return (
      <Badge className="border-0 bg-blue-100 text-[#1a6bcc]">
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Sending
      </Badge>
    )
  }

  if (status === 'sent') {
    return (
      <Badge className="border-0 bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Sent
      </Badge>
    )
  }

  if (status === 'skipped') {
    return <Badge className="border-0 bg-amber-100 text-amber-700">Skipped</Badge>
  }

  if (status === 'error') {
    return <Badge className="border-0 bg-red-100 text-red-700">Needs attention</Badge>
  }

  return <Badge className="border-0 bg-gray-100 text-gray-500">Ready</Badge>
}
