'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, TrendingUp, Clock, Users, Phone, Mail, MessageSquare,
  ArrowRight, CalendarDays, Home, Flame, RotateCcw, Tag, ChevronRight,
  Send, AlertTriangle, CheckCircle2, X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { mockLeads, mockTransactions, mockTasks, mockProperties } from '@/lib/mock-data'
import type { Lead } from '@/types/lead'
import type { Transaction } from '@/types/action'

// ── types ────────────────────────────────────────────────────────────────────

type PanelContent =
  | { kind: 'lead'; data: Lead }
  | { kind: 'transaction'; data: Transaction }
  | null

// ── helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, color = 'bg-[#1a6bcc]/10 text-[#1a6bcc]', size = 'md' }: { name: string; color?: string; size?: 'sm' | 'md' }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2)
  const sz = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-9 h-9 text-xs'
  return (
    <div className={`${sz} rounded-full ${color} flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  )
}

function ScorePill({ score }: { score: number }) {
  const cls =
    score >= 75 ? 'bg-emerald-100 text-emerald-700' :
    score >= 50 ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-500'
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${cls}`}>{score}</span>
}

function UrgencyBadge({ days }: { days: number }) {
  if (days <= 1) return <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Tomorrow</span>
  if (days <= 3) return <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{days}d left</span>
  return <span className="text-xs text-gray-400">{days}d left</span>
}

function CardHeader({
  icon, title, count, countColor = 'bg-gray-100 text-gray-500', href,
}: {
  icon: React.ReactNode; title: string; count?: number; countColor?: string; href?: string
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-4">
      <div className="flex items-center gap-2.5">
        <span className="text-gray-400">{icon}</span>
        <span className="font-semibold text-gray-900 text-sm">{title}</span>
        {count !== undefined && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${countColor}`}>{count}</span>
        )}
      </div>
      {href && (
        <Link href={href} className="text-xs text-[#1a6bcc] flex items-center gap-0.5 hover:underline">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  )
}

const taskIconMap = {
  call: { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50' },
  text: { icon: MessageSquare, color: 'text-violet-600', bg: 'bg-violet-50' },
  email: { icon: Mail, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  other: { icon: Tag, color: 'text-gray-500', bg: 'bg-gray-50' },
}

// ── main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [panel, setPanel] = useState<PanelContent>(null)

  const hotLeads = mockLeads.filter(l => l.stage === 'hot' || l.score >= 70)
  const backToSite = mockLeads.filter(l => l.intentSignals.includes('back_to_site'))
  const coolingLeads = mockLeads.filter(l => l.lastContactDaysAgo >= 14)
  const pendingTasks = mockTasks.filter(t => !t.completed)
  const urgentTx = mockTransactions.filter(t => t.daysUntilDeadline <= 3)
  const backOnMarket = mockProperties.filter(p => p.status === 'back_on_market')

  const openLead = (lead: Lead) => setPanel({ kind: 'lead', data: lead })
  const openTx = (tx: Transaction) => setPanel({ kind: 'transaction', data: tx })

  return (
    <div className="flex flex-1 min-h-0">
      <main className="flex-1 overflow-y-auto px-6 py-5 min-w-0">

        {/* ── AI Banner ─────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0F1629] to-[#1a2f5e] p-4 mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#1a6bcc]/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#5b9de8]" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">
                <span className="text-[#5b9de8]">5 high-priority actions</span> ready · 2 transaction deadlines today · 3 hot leads to contact
              </p>
              <p className="text-white/40 text-xs mt-0.5">AI analyzed your full pipeline · Updated just now</p>
            </div>
          </div>
          <Link href="/dashboard/briefing">
            <Button size="sm" className="bg-[#1a6bcc] hover:bg-[#1558a8] text-white border-0 shrink-0 text-xs gap-1">
              Open Full Briefing <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        {/* ── Stat Strip ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'New Leads Today', value: mockLeads.filter(l => l.lastContactDaysAgo === 0).length, sub: '1 untouched', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'hover:ring-blue-200' },
            { label: 'High Interest', value: hotLeads.length, sub: 'Score ≥ 70', icon: Flame, color: 'text-rose-600', bg: 'bg-rose-50', ring: 'hover:ring-rose-200' },
            { label: 'Tx Deadlines', value: urgentTx.length, sub: 'Next 72 hours', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', ring: 'hover:ring-orange-200' },
            { label: 'Back on Market', value: backOnMarket.length, sub: 'Match your buyers', icon: RotateCcw, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'hover:ring-emerald-200' },
          ].map(c => (
            <div key={c.label} className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:ring-2 ${c.ring} transition-all duration-150`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 leading-tight">{c.label}</p>
                <div className={`${c.bg} p-2 rounded-xl`}>
                  <c.icon className={`w-3.5 h-3.5 ${c.color}`} />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
            </div>
          ))}
        </div>

        {/* ── AI Focus Strip ────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#1a6bcc]" />
            <span className="text-xs font-semibold text-[#1a6bcc] uppercase tracking-wider">AI Top Priority · Start here</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { num: 1, type: 'Call', name: 'Sarah Johnson', reason: 'Viewed 123 Maple Ave 3× today', urgency: 'high', score: 88, lead: mockLeads[0] },
              { num: 2, type: 'Review', name: '87 Valencia St', reason: 'Appraisal contingency expires tomorrow', urgency: 'critical', score: null, tx: mockTransactions[1] },
              { num: 3, type: 'Send Listing', name: 'Mike Reyes', reason: 'Back on site after 6 days', urgency: 'medium', score: 61, lead: mockLeads[1] },
            ].map(item => (
              <button
                key={item.num}
                onClick={() => item.lead ? openLead(item.lead) : item.tx ? openTx(item.tx) : null}
                className={`text-left p-4 rounded-xl border-2 transition-all duration-150 hover:shadow-md group ${
                  item.urgency === 'critical' ? 'border-red-200 bg-red-50/50 hover:border-red-400' :
                  item.urgency === 'high' ? 'border-[#1a6bcc]/30 bg-blue-50/30 hover:border-[#1a6bcc]' :
                  'border-gray-100 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    item.urgency === 'critical' ? 'bg-red-500 text-white' :
                    item.urgency === 'high' ? 'bg-[#1a6bcc] text-white' : 'bg-gray-200 text-gray-600'
                  }`}>{item.num}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                    item.urgency === 'high' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                  }`}>{item.type}</span>
                  {item.score && <ScorePill score={item.score} />}
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{item.name}</p>
                <p className="text-xs text-gray-500 leading-snug">{item.reason}</p>
                <div className="flex items-center gap-1 mt-2.5 text-[#1a6bcc] opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-xs font-medium">View details</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Main 2-col grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-4">

          {/* Left 3/5 ───────────────────────────────────────────────────── */}
          <div className="col-span-3 space-y-4">

            {/* Today's Opportunities */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader
                icon={<TrendingUp className="w-4 h-4" />}
                title="Today's Opportunities"
                count={hotLeads.length + backToSite.length}
                countColor="bg-rose-50 text-rose-600"
                href="/people"
              />
              <div className="grid grid-cols-4 gap-px bg-gray-100 mx-5 mb-5 rounded-xl overflow-hidden">
                {[
                  { label: 'High Interest', value: hotLeads.length, color: 'text-rose-600' },
                  { label: 'Back to Site', value: backToSite.length, color: 'text-amber-600' },
                  { label: 'Sell Request', value: 1, color: 'text-violet-600' },
                  { label: 'Back on Market', value: backOnMarket.length, color: 'text-emerald-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white px-3 py-2.5 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 pb-4 space-y-1">
                {hotLeads.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50/60 hover:border-l-2 hover:border-l-[#1a6bcc] transition-all duration-100 group text-left"
                  >
                    <Avatar name={lead.name} color="bg-rose-100 text-rose-600" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">{lead.name}</p>
                        {lead.intentSignals.includes('back_to_site') && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">Back to Site</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{lead.recentBehavior[0]}</p>
                    </div>
                    <ScorePill score={lead.score} />
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1a6bcc] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Today's New Leads */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader
                icon={<Users className="w-4 h-4" />}
                title="Today's New Leads"
                count={mockLeads.length}
                countColor="bg-blue-50 text-blue-600"
                href="/people"
              />
              <div className="px-4 pb-4 space-y-1">
                {mockLeads.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-blue-50/60 transition-all duration-100 group text-left"
                  >
                    <Avatar name={lead.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{lead.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{lead.source} · {lead.preferences.minBeds}–{lead.preferences.maxBeds} bed · ${(lead.budget / 1000).toFixed(0)}K</p>
                    </div>
                    <ScorePill score={lead.score} />
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#1a6bcc] transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 2/5 ──────────────────────────────────────────────────── */}
          <div className="col-span-2 space-y-4">

            {/* Transactions */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader
                icon={<Clock className="w-4 h-4" />}
                title="Transactions"
                count={mockTransactions.length}
                countColor="bg-orange-50 text-orange-600"
                href="/transactions"
              />
              <div className="px-4 pb-4 space-y-2">
                {mockTransactions.map(tx => (
                  <button
                    key={tx.id}
                    onClick={() => openTx(tx)}
                    className="w-full text-left p-3.5 rounded-xl border border-gray-100 hover:border-[#1a6bcc]/40 hover:bg-blue-50/30 transition-all duration-100 group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        tx.daysUntilDeadline <= 1 ? 'bg-red-500' : tx.daysUntilDeadline <= 3 ? 'bg-amber-400' : 'bg-emerald-400'
                      }`} />
                      <p className="text-sm font-medium text-gray-800 flex-1 leading-tight line-clamp-1">{tx.address}</p>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#1a6bcc] shrink-0 mt-0.5 transition-colors" />
                    </div>
                    <div className="flex items-center justify-between pl-4">
                      <span className="text-xs text-gray-400">{tx.nextDeadlineLabel}</span>
                      <UrgencyBadge days={tx.daysUntilDeadline} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader
                icon={<CheckCircle2 className="w-4 h-4" />}
                title="Today's Tasks"
                count={pendingTasks.length}
                countColor="bg-violet-50 text-violet-600"
              />
              <div className="px-4 pb-2">
                <div className="flex gap-2 mb-3">
                  {(['call', 'text', 'email', 'other'] as const).map(type => {
                    const m = taskIconMap[type]
                    const count = mockTasks.filter(t => t.type === type && !t.completed).length
                    return (
                      <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${m.bg}`}>
                        <m.icon className={`w-3 h-3 ${m.color}`} />
                        <span className={`text-sm font-bold ${m.color}`}>{count}</span>
                      </div>
                    )
                  })}
                </div>
                {mockTasks.map(task => {
                  const m = taskIconMap[task.type]
                  const lead = mockLeads.find(l => l.id === task.leadId)
                  return (
                    <div key={task.id} className={`flex items-center gap-3 px-2 py-2.5 rounded-xl ${task.completed ? 'opacity-35' : 'hover:bg-gray-50 cursor-pointer'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.bg}`}>
                        <m.icon className={`w-3.5 h-3.5 ${m.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate font-medium">{task.title}</p>
                        {lead && <p className="text-xs text-gray-400">{lead.name}</p>}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{task.dueTime}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Need Keep in Touch */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader icon={<Users className="w-4 h-4" />} title="Keep in Touch" count={3} countColor="bg-amber-50 text-amber-600" />
              <div className="px-4 pb-4 space-y-1">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Birthday</span>
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">8 this month</span>
                </div>
                {mockLeads.slice(0, 2).map(lead => (
                  <button key={lead.id} onClick={() => openLead(lead)} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-amber-50/50 transition-all group text-left">
                    <Avatar name={lead.name} color="bg-amber-100 text-amber-600" size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{lead.name}</p>
                      <p className="text-xs text-gray-400">Follow-up every 14 days</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600">{lead.lastContactDaysAgo}d ago</span>
                  </button>
                ))}
                <Separator className="my-2" />
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Cooling down</span>
                </div>
                {coolingLeads.slice(0, 1).map(lead => (
                  <button key={lead.id} onClick={() => openLead(lead)} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-red-50/50 transition-all group text-left">
                    <Avatar name={lead.name} color="bg-gray-100 text-gray-500" size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{lead.name}</p>
                      <p className="text-xs text-gray-400">No contact in {lead.lastContactDaysAgo} days</p>
                    </div>
                    <span className="text-xs font-semibold text-red-500">Cooling</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Appointments + Hot Sheets */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <CardHeader icon={<CalendarDays className="w-4 h-4" />} title="Appointments" count={2} />
              <div className="px-4 pb-4 space-y-1.5">
                {[{ name: 'Robert Nguyen', addr: '182 Saint Peter St', time: '11 AM' }, { name: 'Annette Black', addr: '26096 Dougherty Pl', time: '2 PM' }].map(a => (
                  <div key={a.name} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-gray-50 cursor-pointer">
                    <div className="w-1 h-9 bg-[#1a6bcc] rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{a.name}</p>
                      <p className="text-xs text-gray-400 truncate">{a.addr}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#1a6bcc] shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="px-4 pb-4 pt-3">
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-3">Hot Sheets</p>
                <div className="space-y-2">
                  {[{ label: 'Upcoming Open House', count: 758, color: 'text-[#1a6bcc]' }, { label: 'Back on Market', count: 20, color: 'text-emerald-600' }, { label: 'Price Reduced', count: 120, color: 'text-amber-600' }].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-0.5 hover:bg-gray-50 rounded-lg px-2 cursor-pointer transition-colors">
                      <div className="flex items-center gap-2">
                        <Home className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-sm text-gray-600">{s.label}</span>
                      </div>
                      <span className={`text-sm font-bold ${s.color}`}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Detail Panel ──────────────────────────────────────────────────── */}
      {panel && (
        <aside className="w-80 shrink-0 bg-white border-l border-gray-100 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#1a6bcc]" />
              <span className="text-sm font-semibold text-gray-900">
                {panel.kind === 'lead' ? panel.data.name : 'Transaction'}
              </span>
            </div>
            <button onClick={() => setPanel(null)} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {panel.kind === 'lead' && <LeadDetail lead={panel.data} />}
            {panel.kind === 'transaction' && <TransactionDetail tx={panel.data} />}
          </div>
        </aside>
      )}
    </div>
  )
}

// ── Lead Detail Panel ─────────────────────────────────────────────────────────

function LeadDetail({ lead }: { lead: Lead }) {
  const matchedProperty = mockProperties.find(p =>
    p.price <= lead.budget * 1.1 &&
    p.beds >= lead.preferences.minBeds &&
    lead.preferredAreas.some(a => p.city.includes(a) || a.includes(p.city))
  ) ?? mockProperties[0]

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#1a6bcc]/10 flex items-center justify-center text-lg font-bold text-[#1a6bcc]">
          {lead.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="font-bold text-gray-900">{lead.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <ScorePill score={lead.score} />
            <span className="text-xs text-gray-400 capitalize">{lead.stage} lead</span>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { icon: Phone, label: 'Call', color: 'bg-blue-600 hover:bg-blue-700' },
          { icon: MessageSquare, label: 'Text', color: 'bg-violet-600 hover:bg-violet-700' },
          { icon: Mail, label: 'Email', color: 'bg-emerald-600 hover:bg-emerald-700' },
        ].map(a => (
          <button key={a.label} className={`${a.color} text-white rounded-xl py-2 flex flex-col items-center gap-1 transition-colors`}>
            <a.icon className="w-4 h-4" />
            <span className="text-xs font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Contact info */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Phone</span>
            <span className="text-xs font-medium text-gray-800">{lead.phone}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Email</span>
            <span className="text-xs font-medium text-gray-800 truncate max-w-40">{lead.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Budget</span>
            <span className="text-xs font-medium text-gray-800">${(lead.budget / 1000).toFixed(0)}K</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Source</span>
            <span className="text-xs font-medium text-gray-800">{lead.source}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Last Contact</span>
            <span className={`text-xs font-semibold ${lead.lastContactDaysAgo >= 5 ? 'text-red-500' : 'text-gray-800'}`}>
              {lead.lastContactDaysAgo === 0 ? 'Today' : `${lead.lastContactDaysAgo}d ago`}
            </span>
          </div>
        </div>
      </div>

      {/* Recent behavior */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent Activity</p>
        <div className="space-y-2">
          {lead.recentBehavior.map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#1a6bcc] mt-1.5 shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Matched property */}
      {matchedProperty && (
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#1a6bcc]" />
            <p className="text-xs font-semibold text-[#1a6bcc]">AI Best Match</p>
          </div>
          <p className="text-sm font-semibold text-gray-900">{matchedProperty.address}</p>
          <p className="text-xs text-gray-500 mt-0.5">{matchedProperty.city} · {matchedProperty.beds}bd {matchedProperty.baths}ba · ${(matchedProperty.price / 1000).toFixed(0)}K</p>
          {matchedProperty.status === 'back_on_market' && (
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mt-2 inline-block">Back on Market</span>
          )}
          <Button size="sm" className="w-full mt-3 h-7 text-xs bg-[#1a6bcc] hover:bg-[#1558a8] text-white border-0 gap-1">
            <Send className="w-3 h-3" /> Send This Listing
          </Button>
        </div>
      )}
    </>
  )
}

// ── Transaction Detail Panel ──────────────────────────────────────────────────

function TransactionDetail({ tx }: { tx: Transaction }) {
  const stageColors: Record<string, string> = {
    offer: 'bg-blue-100 text-blue-700',
    inspection: 'bg-amber-100 text-amber-700',
    appraisal: 'bg-violet-100 text-violet-700',
    closing: 'bg-orange-100 text-orange-700',
    closed: 'bg-emerald-100 text-emerald-700',
  }

  return (
    <>
      <div>
        <p className="text-sm font-bold text-gray-900 leading-snug">{tx.address}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${stageColors[tx.stage]}`}>{tx.stage}</span>
          <span className="text-xs text-gray-400">${(tx.salePrice / 1000).toFixed(0)}K</span>
        </div>
      </div>

      <div className={`p-3.5 rounded-xl border ${tx.daysUntilDeadline <= 1 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className={`w-3.5 h-3.5 ${tx.daysUntilDeadline <= 1 ? 'text-red-600' : 'text-amber-600'}`} />
          <p className={`text-xs font-semibold ${tx.daysUntilDeadline <= 1 ? 'text-red-700' : 'text-amber-700'}`}>Upcoming Deadline</p>
        </div>
        <p className="text-sm font-bold text-gray-900">{tx.nextDeadlineLabel}</p>
        <p className={`text-sm font-bold mt-0.5 ${tx.daysUntilDeadline <= 1 ? 'text-red-600' : 'text-amber-600'}`}>
          {tx.daysUntilDeadline === 0 ? 'Due today' : tx.daysUntilDeadline === 1 ? 'Tomorrow' : `In ${tx.daysUntilDeadline} days`}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timeline</p>
        {[{ label: 'Deadline', value: tx.nextDeadline }, { label: 'Closing', value: tx.closingDate }, { label: 'Agent', value: tx.agentName }].map(r => (
          <div key={r.label} className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{r.label}</span>
            <span className="text-xs font-medium text-gray-800">{r.value}</span>
          </div>
        ))}
      </div>

      <Button className="w-full bg-[#1a6bcc] hover:bg-[#1558a8] text-white border-0 gap-1.5">
        <CheckCircle2 className="w-4 h-4" /> Acknowledge Deadline
      </Button>
    </>
  )
}
