'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Sparkles, Phone, MessageSquare, Mail, Send, ArrowRight,
  ChevronRight, Clock, TrendingUp, RotateCcw, Volume2, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import DetailPanel from '@/components/layout/DetailPanel'
import { mockLeads, mockTransactions, mockProperties } from '@/lib/mock-data'
import type { RecommendedAction } from '@/types/action'

// ── Static placeholder actions (Phase 3 scoring engine will generate these) ──

const placeholderActions: RecommendedAction[] = [
  {
    id: 'a1',
    type: 'call',
    title: 'Call Sarah Johnson',
    summary: 'Viewed 123 Maple Ave 3× in the last 24 hours. Budget matches. Not contacted in 5 days.',
    leadId: 'l1',
    propertyId: 'p1',
    priorityScore: 92,
    urgency: 'high',
    confidence: 91,
    reasons: [
      'Viewed 123 Maple Ave 3 times in the past 24 hours',
      'Listing matches her $950K budget and 3-bed preference',
      'No contact in 5 days — conversion risk rising',
      'Lead score 88 — among your top buyers this week',
    ],
    consequenceIfIgnored: 'High-intent buyer may engage a competing agent within 48 hours.',
    status: 'pending',
    draftMessage: "Hi Sarah! Just wanted to check in about 123 Maple Ave — I noticed you've been looking at it quite a bit. Would love to schedule a showing or answer any questions. When works for you?",
  },
  {
    id: 'a2',
    type: 'send_listing',
    title: 'Send listing to Mike Reyes',
    summary: 'Back on site after 6 days. 87 Valencia St just came back on market — matches his criteria.',
    leadId: 'l2',
    propertyId: 'p2',
    priorityScore: 84,
    urgency: 'high',
    confidence: 86,
    reasons: [
      'Mike returned to site after a 6-day absence — strong re-engagement signal',
      '87 Valencia St is back on market — matches budget ($750K) and 2-3 bed preference',
      'Back-on-market listings move fast — timing matters',
      'Last contacted 8 days ago — follow-up is overdue',
    ],
    consequenceIfIgnored: 'Back-on-market listing will likely go under contract within days.',
    status: 'pending',
    draftMessage: "Hey Mike! Great news — a listing you might love just came back on the market: 87 Valencia St in Menlo Park. 4 bed, 3 bath at $1.05M. Want me to book a showing before the weekend?",
  },
  {
    id: 'a3',
    type: 'review_transaction',
    title: 'Review 87 Valencia St transaction',
    summary: 'Appraisal contingency expires tomorrow. 1 task outstanding.',
    transactionId: 't2',
    priorityScore: 97,
    urgency: 'critical',
    confidence: 99,
    reasons: [
      'Appraisal contingency expires April 19 — tomorrow',
      'Outstanding task: confirm appraisal waiver with buyer',
      'Missing this deadline could void the contract',
      'Sale price $1.045M — highest value deal in your pipeline',
    ],
    consequenceIfIgnored: 'Contingency expires automatically — deal may fall apart.',
    status: 'pending',
  },
  {
    id: 'a4',
    type: 'email',
    title: 'Re-engage Annette Black',
    summary: 'Requested home valuation 2 days ago. No follow-up sent yet.',
    leadId: 'l3',
    priorityScore: 78,
    urgency: 'medium',
    confidence: 82,
    reasons: [
      'Submitted a home valuation request — sell intent signal',
      'No follow-up email sent in 48 hours',
      'Score 74 — active buyer/seller in luxury segment',
      'Preferred area: Los Altos Hills, Saratoga — low inventory market',
    ],
    consequenceIfIgnored: 'Valuation leads cool quickly — competitor agents may reach her first.',
    status: 'pending',
    draftMessage: "Hi Annette! Thank you for requesting a home valuation. I've prepared a preliminary market analysis for your area. Would you have 20 minutes this week for a quick call to walk through it?",
  },
  {
    id: 'a5',
    type: 'call',
    title: 'Follow up with Robert Nguyen',
    summary: 'Showing scheduled for today at 11 AM. Suggested talking points ready.',
    leadId: 'l6',
    propertyId: 'p5',
    priorityScore: 71,
    urgency: 'medium',
    confidence: 77,
    reasons: [
      'Showing scheduled today — pre-call prep increases conversion',
      'Score 82 — highly engaged buyer',
      'Has viewed 7 listings this week — narrowing down',
      '182 Saint Peter St matches budget and location perfectly',
    ],
    consequenceIfIgnored: 'Going into the showing without pre-call reduces close rate by ~30%.',
    status: 'pending',
  },
]

const actionTypeConfig = {
  call: { icon: Phone, label: 'Call', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  text: { icon: MessageSquare, label: 'Text', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
  email: { icon: Mail, label: 'Email', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  send_listing: { icon: Send, label: 'Send Listing', color: 'text-[#1a6bcc]', bg: 'bg-blue-50', border: 'border-blue-100' },
  review_transaction: { icon: Clock, label: 'Review Tx', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
  schedule_followup: { icon: ArrowRight, label: 'Follow Up', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' },
}

const urgencyConfig = {
  low: { label: 'Low', class: 'bg-gray-100 text-gray-500' },
  medium: { label: 'Medium', class: 'bg-amber-100 text-amber-700' },
  high: { label: 'High', class: 'bg-rose-100 text-rose-700' },
  critical: { label: 'Critical', class: 'bg-red-600 text-white' },
}

// ── page ─────────────────────────────────────────────────────────────────────

export default function BriefingPage() {
  const [selectedAction, setSelectedAction] = useState<RecommendedAction | null>(null)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())

  const markDone = (id: string) => setDoneIds(prev => new Set([...prev, id]))

  const visibleActions = placeholderActions.filter(a => !doneIds.has(a.id))
  const lead = selectedAction?.leadId ? mockLeads.find(l => l.id === selectedAction.leadId) : null
  const property = selectedAction?.propertyId ? mockProperties.find(p => p.id === selectedAction.propertyId) : null
  const transaction = selectedAction?.transactionId ? mockTransactions.find(t => t.id === selectedAction.transactionId) : null

  return (
    <div className="flex flex-1 min-h-0">
      <main className="flex-1 overflow-y-auto px-6 py-5">

        {/* Hero ─────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-[#0A1020] via-[#0F1629] to-[#1a2f5e] p-6 mb-6 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(26,107,204,0.25),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(91,157,232,0.1),transparent_50%)]" />

          <div className="relative flex items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#5b9de8]" />
                <span className="text-xs font-semibold text-[#5b9de8] uppercase tracking-widest">AI Daily Briefing</span>
                <span className="text-[10px] text-white/30 ml-1">· Updated just now</span>
              </div>

              <h1 className="text-white text-2xl font-bold mb-3 leading-tight">
                Good morning, James. <br />
                <span className="text-[#5b9de8]">Here's your day.</span>
              </h1>

              <p className="text-white/70 text-sm leading-relaxed max-w-lg mb-4">
                You have <span className="text-white font-semibold">5 high-priority actions</span> ready across your pipeline.
                One transaction deadline is <span className="text-red-400 font-semibold">tomorrow</span>,
                and 2 hot leads are showing strong buying intent right now.
                Starting with Sarah Johnson is your highest-impact first move.
              </p>

              {/* Quick stats */}
              <div className="flex gap-4">
                {[
                  { icon: TrendingUp, label: 'Hot Leads', value: '2', color: 'text-rose-400' },
                  { icon: Clock, label: 'Tx Deadlines', value: '2', color: 'text-amber-400' },
                  { icon: RotateCcw, label: 'Back on Market', value: '2', color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-3 py-1.5">
                    <s.icon className={`w-3 h-3 ${s.color}`} />
                    <span className="text-white/60 text-xs">{s.label}</span>
                    <span className={`text-xs font-bold ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Robo mascot + voice button */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-[#1a6bcc]/30 blur-xl" />
                <Image
                  src="/robo.png"
                  alt="Lofty AI"
                  width={100}
                  height={100}
                  className="relative rounded-2xl"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs gap-1.5"
              >
                <Volume2 className="w-3 h-3" />
                Hear Briefing
              </Button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {doneIds.size > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneIds.size / placeholderActions.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 shrink-0">{doneIds.size} of {placeholderActions.length} done</span>
          </div>
        )}

        {/* Action Cards ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Recommended Actions
            <span className="ml-2 text-xs font-normal text-gray-400">ranked by AI priority score</span>
          </h2>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1">
            <Sparkles className="w-3 h-3" /> Execute My Day
          </Button>
        </div>

        <div className="space-y-3">
          {visibleActions.map((action, idx) => {
            const cfg = actionTypeConfig[action.type]
            const urg = urgencyConfig[action.urgency]
            const actionLead = action.leadId ? mockLeads.find(l => l.id === action.leadId) : null
            const isSelected = selectedAction?.id === action.id

            return (
              <div
                key={action.id}
                className={`bg-white rounded-xl border transition-all duration-150 shadow-sm ${
                  isSelected ? 'border-[#1a6bcc] shadow-[0_0_0_1px_#1a6bcc20]' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Rank */}
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0 mt-0.5">
                      {idx + 1}
                    </div>

                    {/* Type icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{action.title}</span>
                        {actionLead && (
                          <span className="text-xs text-gray-400">· Score {actionLead.score}</span>
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${urg.class}`}>
                          {urg.label}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                          {action.confidence}% confidence
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{action.summary}</p>

                      {/* Draft preview */}
                      {action.draftMessage && (
                        <div className="mt-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                          <p className="text-[11px] text-gray-500 italic line-clamp-2">"{action.draftMessage}"</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 mt-3 pl-14">
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-[#1a6bcc] hover:bg-[#1558a8] text-white border-0 gap-1"
                      onClick={() => markDone(action.id)}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      {action.type === 'call' ? 'Start Call' :
                       action.type === 'send_listing' ? 'Send Now' :
                       action.type === 'review_transaction' ? 'Review' :
                       action.type === 'email' ? 'Send Email' : 'Execute'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setSelectedAction(isSelected ? null : action)}
                    >
                      <Sparkles className="w-3 h-3 text-[#1a6bcc]" />
                      Why this?
                      <ChevronRight className={`w-3 h-3 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-400">
                      Snooze
                    </Button>
                    <Volume2 className="w-3.5 h-3.5 text-gray-300 ml-auto cursor-pointer hover:text-gray-400" />
                  </div>
                </div>
              </div>
            )
          })}

          {doneIds.size === placeholderActions.length && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-3" />
              <p className="text-sm font-semibold text-gray-700">You're all caught up!</p>
              <p className="text-xs text-gray-400 mt-1">All recommended actions completed for today.</p>
            </div>
          )}
        </div>
      </main>

      {/* Reasoning Panel ───────────────────────────────────────────────── */}
      <DetailPanel
        open={!!selectedAction}
        onClose={() => setSelectedAction(null)}
        title="Why this action?"
      >
        {selectedAction && (
          <div className="space-y-4">
            {/* Action header */}
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${actionTypeConfig[selectedAction.type].bg}`}>
                {(() => { const Ic = actionTypeConfig[selectedAction.type].icon; return <Ic className={`w-4 h-4 ${actionTypeConfig[selectedAction.type].color}`} /> })()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedAction.title}</p>
                <p className="text-xs text-gray-400">Priority score: {selectedAction.priorityScore}/100</p>
              </div>
            </div>

            {/* Confidence bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">AI Confidence</span>
                <span className="text-xs font-bold text-[#1a6bcc]">{selectedAction.confidence}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#1a6bcc] rounded-full" style={{ width: `${selectedAction.confidence}%` }} />
              </div>
            </div>

            {/* Lead context */}
            {lead && (
              <div className="p-3 bg-gray-50 rounded-xl">
                <p className="text-xs font-semibold text-gray-700 mb-2">Lead Context</p>
                <div className="space-y-1">
                  <Row label="Name" value={lead.name} />
                  <Row label="Score" value={String(lead.score)} highlight />
                  <Row label="Budget" value={`$${(lead.budget / 1000).toFixed(0)}K`} />
                  <Row label="Last Contact" value={`${lead.lastContactDaysAgo}d ago`} highlight={lead.lastContactDaysAgo >= 5} />
                </div>
                {lead.recentBehavior.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <p className="text-[10px] text-gray-400 font-medium mb-1.5">Recent behavior</p>
                    {lead.recentBehavior.map((b, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-1.5 mb-1">
                        <span className="text-[#1a6bcc] mt-0.5">·</span>{b}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Property match */}
            {property && (
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs font-semibold text-blue-800 mb-2">Matched Property</p>
                <p className="text-xs font-medium text-blue-900">{property.address}, {property.city}</p>
                <p className="text-xs text-blue-600">{property.beds}bd · {property.baths}ba · ${(property.price / 1000).toFixed(0)}K</p>
                {property.status === 'back_on_market' && (
                  <Badge className="mt-1.5 bg-blue-200 text-blue-800 text-[10px]">Back on Market</Badge>
                )}
              </div>
            )}

            {/* Transaction context */}
            {transaction && (
              <div className="p-3 bg-orange-50 rounded-xl">
                <p className="text-xs font-semibold text-orange-800 mb-1">Transaction Alert</p>
                <p className="text-xs text-orange-700">{transaction.nextDeadlineLabel}</p>
                <p className="text-xs font-bold text-red-600 mt-1">
                  {transaction.daysUntilDeadline <= 1 ? '⚠ Tomorrow' : `${transaction.daysUntilDeadline} days left`}
                </p>
              </div>
            )}

            {/* AI reasons */}
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-2">Why now</p>
              <div className="space-y-2">
                {selectedAction.reasons.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#1a6bcc]/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-[#1a6bcc]">{i + 1}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Consequence */}
            {selectedAction.consequenceIfIgnored && (
              <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                <p className="text-xs font-semibold text-red-700 mb-1">If ignored</p>
                <p className="text-xs text-red-600">{selectedAction.consequenceIfIgnored}</p>
              </div>
            )}
          </div>
        )}
      </DetailPanel>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className={`text-xs font-medium ${highlight ? 'text-rose-600' : 'text-gray-700'}`}>{value}</span>
    </div>
  )
}
