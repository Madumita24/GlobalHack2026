'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, LayoutDashboard, Sun, Sparkles, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const crmItems = [
  { label: 'People', href: '/people', icon: Users, desc: 'Leads & contacts' },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays, desc: 'AI scheduled tasks' },
]

const aiItems = [
  { label: 'Daily Briefing', href: '/dashboard/briefing', icon: Sun, desc: 'AI action plan' },
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, desc: 'Full dashboard' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-52 bg-white border-r border-gray-200 shrink-0">

      {/* CRM quick access */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-blue-50 flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-[#1a6bcc]" />
          </div>
          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">CRM</span>
        </div>

        <nav className="space-y-0.5">
          {crmItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-100',
                  active
                    ? 'bg-[#1a6bcc] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-[#1a6bcc]')} />
                <div className="min-w-0">
                  <p className={cn('font-semibold leading-tight truncate', active ? 'text-white' : 'text-gray-800')}>
                    {item.label}
                  </p>
                  <p className={cn('text-[10px] leading-tight truncate', active ? 'text-white/70' : 'text-gray-400')}>
                    {item.desc}
                  </p>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="mx-4 border-t border-gray-100" />

      {/* AI Copilot header */}
      <div className="px-4 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-[#1a6bcc] flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">AI Copilot</span>
          <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        <nav className="space-y-0.5">
          {aiItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-100',
                  active
                    ? 'bg-[#1a6bcc] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className={cn('w-4 h-4 shrink-0', active ? 'text-white' : 'text-[#1a6bcc]')} />
                <div className="min-w-0">
                  <p className={cn('font-semibold leading-tight truncate', active ? 'text-white' : 'text-gray-800')}>
                    {item.label}
                  </p>
                  <p className={cn('text-[10px] leading-tight truncate', active ? 'text-white/70' : 'text-gray-400')}>
                    {item.desc}
                  </p>
                </div>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Divider + hint */}
      <div className="mx-4 border-t border-gray-100" />

      <div className="px-4 py-4 flex-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Quick tip</p>
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
          <p className="text-xs text-blue-700 leading-relaxed">
            Start your day with the <strong>Daily Briefing</strong> — AI has already ranked your highest-impact actions.
          </p>
          <Link
            href="/dashboard/briefing"
            className="text-xs font-semibold text-[#1a6bcc] flex items-center gap-1 mt-2 hover:underline"
          >
            Open Briefing →
          </Link>
        </div>
      </div>

      {/* User profile */}
      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#1a6bcc] flex items-center justify-center text-white text-xs font-bold shrink-0">
            JC
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">James Carter</p>
            <p className="text-[10px] text-gray-400 truncate">Lofty Realty</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
