'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Home,
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
import { buildActionEmailPlan } from '@/lib/actions/action-email'
import { buildMailtoHref, buildSmsHref, buildTelHref, defaultLeadMessage, listingMessage } from '@/lib/contact-links'
import type { RecommendedAction, Transaction } from '@/types/action'
import type { Lead } from '@/types/lead'
import type { Property } from '@/types/property'

type ExecutionPhase = 'review' | 'executing' | 'done'

interface ActionExecutionDialogProps {
  action: RecommendedAction | null
  lead?: Lead | null
  property?: Property | null
  transaction?: Transaction | null
  open: boolean
  onClose: () => void
  onConfirm: (action: RecommendedAction) => void
}

const ACTION_META: Record<
  RecommendedAction['type'],
  {
    label: string
    icon: React.ElementType
    accent: string
    bg: string
    primary: string
    done: string
  }
> = {
  call: {
    label: 'Call Lead',
    icon: Phone,
    accent: 'text-blue-600',
    bg: 'bg-blue-50',
    primary: 'Mark Call Complete',
    done: 'Call task marked complete.',
  },
  text: {
    label: 'Send Text',
    icon: MessageSquare,
    accent: 'text-violet-600',
    bg: 'bg-violet-50',
    primary: 'Send Text',
    done: 'Text sent and logged.',
  },
  email: {
    label: 'Send Email',
    icon: Mail,
    accent: 'text-emerald-600',
    bg: 'bg-emerald-50',
    primary: 'Send Email',
    done: 'Email sent and logged.',
  },
  send_listing: {
    label: 'Send Listing',
    icon: Send,
    accent: 'text-[#1a6bcc]',
    bg: 'bg-blue-50',
    primary: 'Send Now',
    done: 'Listing email sent and logged.',
  },
  review_transaction: {
    label: 'Review Transaction',
    icon: Clock,
    accent: 'text-orange-600',
    bg: 'bg-orange-50',
    primary: 'Acknowledge Review',
    done: 'Transaction review acknowledged.',
  },
  schedule_followup: {
    label: 'Schedule Follow-up',
    icon: CalendarDays,
    accent: 'text-gray-600',
    bg: 'bg-gray-50',
    primary: 'Confirm Follow-up',
    done: 'Follow-up scheduled.',
  },
}

export function ActionExecutionDialog({
  action,
  lead,
  property,
  transaction,
  open,
  onClose,
  onConfirm,
}: ActionExecutionDialogProps) {
  const [phase, setPhase] = useState<ExecutionPhase>('review')
  const [error, setError] = useState<string | null>(null)

  const talkingPoints = useMemo(() => {
    if (!action) return []
    return [
      ...action.reasons.slice(0, 3),
      action.consequenceIfIgnored ? `If ignored: ${action.consequenceIfIgnored}` : null,
    ].filter(Boolean) as string[]
  }, [action])

  if (!open || !action) return null

  const meta = ACTION_META[action.type]
  const Icon = meta.icon
  const isBusy = phase === 'executing'
  const isDone = phase === 'done'
  const sendsEmail = isEmailDeliveryAction(action)

  async function handleConfirm() {
    if (!action || isBusy || isDone) return
    setError(null)
    setPhase('executing')

    try {
      if (isEmailDeliveryAction(action)) {
        const emailPayload = buildActionEmailPlan(action, lead, property, transaction)

        if (!emailPayload) {
          throw new Error('This action needs a lead email before it can be sent.')
        }

        const response = await fetch('/api/email/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: emailPayload.to,
            recipientName: emailPayload.recipientName,
            subject: emailPayload.subject,
            body: emailPayload.body,
            actionId: action.id,
          }),
        })
        const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null

        if (!response.ok || !result?.ok) {
          throw new Error(result?.error ?? 'Email could not be sent through SES.')
        }
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 450))
      }

      onConfirm(action)
      setPhase('done')
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'The action could not be completed.')
      setPhase('review')
    }
  }

  function handleClose() {
    if (!isBusy) onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/30 px-4 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-execution-title"
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}>
              <Icon className={`h-4 w-4 ${meta.accent}`} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <Badge className={`${meta.bg} ${meta.accent} border-0`}>{meta.label}</Badge>
                {isDone && (
                  <Badge className="border-0 bg-emerald-100 text-emerald-700">
                    Done
                  </Badge>
                )}
              </div>
              <h2 id="action-execution-title" className="text-base font-bold text-gray-900">
                {action.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">{action.summary}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isBusy}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {isDone ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{meta.done}</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-gray-500">
                The action has moved from pending to done. Your dashboard is updated for the next best move.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <ExecutionBody
                action={action}
                lead={lead}
                property={property}
                transaction={transaction}
                talkingPoints={talkingPoints}
              />

              <div className="rounded-xl border border-[#1a6bcc]/10 bg-[#1a6bcc]/5 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#1a6bcc]" />
                  <p className="text-xs font-semibold text-[#1a6bcc]">Copilot confirmation</p>
                </div>
                <p className="text-xs leading-relaxed text-gray-600">
                  Confirming this will update the action status and trigger the same voice confirmation
                  path used by the briefing controls.
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <div className="mb-1.5 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                    <p className="text-xs font-semibold text-red-700">Could not complete action</p>
                  </div>
                  <p className="text-xs leading-relaxed text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          {isDone ? (
            <Button
              size="sm"
              className="h-8 bg-[#1a6bcc] text-xs text-white hover:bg-[#1558a8]"
              onClick={handleClose}
            >
              Back to Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                disabled={isBusy}
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 bg-[#1a6bcc] text-xs text-white hover:bg-[#1558a8]"
                disabled={isBusy}
                onClick={handleConfirm}
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {sendsEmail ? 'Sending...' : 'Completing...'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {meta.primary}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ExecutionBody({
  action,
  lead,
  property,
  transaction,
  talkingPoints,
}: {
  action: RecommendedAction
  lead?: Lead | null
  property?: Property | null
  transaction?: Transaction | null
  talkingPoints: string[]
}) {
  if (action.type === 'review_transaction') {
    return (
      <>
        <PayloadSection title="Transaction payload">
          {transaction ? (
            <div className="space-y-2">
              <PayloadRow label="Property" value={transaction.address} />
              <PayloadRow label="Stage" value={transaction.stage} />
              <PayloadRow label="Deadline" value={transaction.nextDeadlineLabel} highlight />
              <PayloadRow
                label="Due"
                value={
                  transaction.daysUntilDeadline <= 1
                    ? 'Tomorrow'
                    : `In ${transaction.daysUntilDeadline} days`
                }
                danger={transaction.daysUntilDeadline <= 1}
              />
              <PayloadRow label="Next step" value="Open file, verify required documents, and acknowledge deadline." />
            </div>
          ) : (
            <MissingState label="transaction" />
          )}
        </PayloadSection>
        <ReasonList items={talkingPoints} />
      </>
    )
  }

  if (action.type === 'send_listing') {
    return (
      <>
        <PayloadSection title="Listing payload">
          {property ? (
            <div className="space-y-2">
              <div className="rounded-xl bg-blue-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Home className="h-3.5 w-3.5 text-[#1a6bcc]" />
                  <p className="text-sm font-semibold text-gray-900">{property.address}</p>
                </div>
                <p className="text-xs text-gray-600">
                  {property.city}, {property.state} {property.zip} · {property.beds}bd · {property.baths}ba · $
                  {property.price.toLocaleString()}
                </p>
                {property.status === 'back_on_market' && (
                  <Badge className="mt-2 border-0 bg-emerald-100 text-emerald-700">
                    Back on Market
                  </Badge>
                )}
              </div>
              <DraftMessage message={action.draftMessage} />
              {lead && (
                <ContactLaunchers
                  lead={lead}
                  subject={property ? `Listing match: ${property.address}` : action.title}
                  message={property ? listingMessage(lead, property) : action.draftMessage}
                  includeCall={false}
                />
              )}
            </div>
          ) : (
            <MissingState label="property" />
          )}
        </PayloadSection>
        <ReasonList items={talkingPoints} />
      </>
    )
  }

  if (action.type === 'schedule_followup') {
    return (
      <>
        <PayloadSection title="Follow-up payload">
          <div className="space-y-2">
            {lead && <LeadSummary lead={lead} />}
            <PayloadRow label="Suggested time" value={action.scheduledFor ?? 'Tomorrow at 10:00 AM'} highlight />
            <PayloadRow label="Note" value="Create a first-touch reminder with the recommended opening message." />
            <DraftMessage message={action.draftMessage} />
            {lead && (
              <ContactLaunchers
                lead={lead}
                subject={action.title}
                message={action.draftMessage}
              />
            )}
          </div>
        </PayloadSection>
        <ReasonList items={talkingPoints} />
      </>
    )
  }

  return (
    <>
      <PayloadSection title={action.type === 'call' ? 'Call payload' : 'Message payload'}>
        <div className="space-y-3">
          {lead ? <LeadSummary lead={lead} /> : <MissingState label="lead" />}
          {lead && (
            <ContactLaunchers
              lead={lead}
              subject={action.title}
              message={action.draftMessage}
              includeCall={action.type === 'call'}
            />
          )}
          {action.type === 'call' ? (
            <>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="mb-2 text-xs font-semibold text-gray-700">Talking points</p>
                <ul className="space-y-1.5">
                  {talkingPoints.slice(0, 3).map((point, index) => (
                    <li key={index} className="flex gap-2 text-xs leading-relaxed text-gray-600">
                      <span className="mt-0.5 text-[#1a6bcc]">·</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <DraftMessage message={action.draftMessage} />
            </>
          ) : (
            <DraftMessage message={action.draftMessage} />
          )}
        </div>
      </PayloadSection>
      <ReasonList items={talkingPoints} />
    </>
  )
}

function PayloadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</p>
      {children}
    </div>
  )
}

function LeadSummary({ lead }: { lead: Lead }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{lead.name}</p>
          <p className="text-xs text-gray-500">{lead.email}</p>
        </div>
        <Badge className="border-0 bg-blue-100 text-blue-700">Score {lead.score}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <PayloadRow label="Budget" value={`$${lead.budget.toLocaleString()}`} />
        <PayloadRow label="Last contact" value={lead.lastContactDaysAgo === 0 ? 'Today' : `${lead.lastContactDaysAgo}d ago`} />
      </div>
    </div>
  )
}

function DraftMessage({ message }: { message?: string }) {
  const [copied, setCopied] = useState(false)
  const text = message ?? 'Hi, I wanted to follow up with the most relevant next step for your search. Are you available today?'

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="rounded-xl border border-[#1a6bcc]/15 bg-blue-50/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-[#1a6bcc]" />
          <p className="text-xs font-semibold text-[#1a6bcc]">AI-drafted message</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-500 hover:text-[#1a6bcc] hover:border-[#1a6bcc]/40 transition-colors"
        >
          <Copy className="h-2.5 w-2.5" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="whitespace-pre-line text-xs leading-relaxed text-gray-700 italic">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  )
}

function ContactLaunchers({
  lead,
  subject,
  message,
  includeCall = true,
}: {
  lead: Lead
  subject: string
  message?: string
  includeCall?: boolean
}) {
  const body = message ?? defaultLeadMessage(lead)

  return (
    <div className={`grid gap-2 ${includeCall ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {includeCall && (
        <a
          href={buildTelHref(lead.phone)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100"
        >
          <Phone className="h-3.5 w-3.5" />
          Call
        </a>
      )}
      <a
        href={buildSmsHref(lead, body)}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-violet-50 px-2 py-2 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-100"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        Text
      </a>
      <a
        href={buildMailtoHref(lead, subject, body)}
        className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-2 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100"
      >
        <Mail className="h-3.5 w-3.5" />
        Email
      </a>
    </div>
  )
}

function isEmailDeliveryAction(action: RecommendedAction) {
  return action.type === 'email' || action.type === 'send_listing'
}

function ReasonList({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-gray-700">Why this is ready to execute</p>
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#1a6bcc]/10">
              <span className="text-[9px] font-bold text-[#1a6bcc]">{index + 1}</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-600">{item}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function PayloadRow({
  label,
  value,
  highlight,
  danger,
}: {
  label: string
  value: string
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-400">{label}</span>
      <span
        className={[
          'text-right text-xs font-medium capitalize text-gray-700',
          highlight ? 'text-[#1a6bcc]' : '',
          danger ? 'text-red-600' : '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  )
}

function MissingState({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>No {label} was attached to this mock action.</span>
    </div>
  )
}
