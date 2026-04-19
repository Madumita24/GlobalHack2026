'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Search, Bell, HelpCircle, Settings, Phone, Inbox, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const navLinks = [
  { label: 'CRM', href: '/people', activeOn: ['/people', '/calendar', '/tasks'] },
  { label: 'Sales', href: '/transactions' },
  { label: 'Marketing', href: '/marketing' },
  { label: 'Content', href: '/content' },
  { label: 'Automation', href: '/automation' },
  { label: 'Reporting', href: '/reporting' },
  { label: 'Marketplace', href: '/marketplace' },
]

const rightIcons = [
  { icon: Sparkles, label: 'AI', href: '/dashboard/briefing', highlight: true },
  { icon: Phone, label: 'Dialer', href: '#' },
  { icon: Inbox, label: 'Inbox', href: '#' },
  { icon: Bell, label: 'Notifications', href: '#', badge: true },
  { icon: HelpCircle, label: 'Help', href: '#' },
  { icon: Settings, label: 'Settings', href: '/settings' },
]

export default function GlobalNav() {
  const pathname = usePathname()

  return (
    <header className="h-[48px] bg-white border-b border-gray-200 flex items-stretch shrink-0 z-30">

      {/* Logo ────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 border-r border-gray-200 hover:bg-gray-50 transition-colors shrink-0"
      >
        <Image src="/robo.png" alt="Lofty" width={24} height={24} className="rounded" />
        <span className="font-bold text-[#1a6bcc] text-base tracking-tight">Lofty</span>
      </Link>

      {/* Nav links ──────────────────────────────────── */}
      <nav className="flex items-stretch flex-1 px-2">
        {navLinks.map(link => {
          const active = link.activeOn
            ? link.activeOn.some((path) => pathname.startsWith(path))
            : pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center px-3.5 text-sm font-medium border-b-2 transition-colors duration-100',
                active
                  ? 'text-[#1a6bcc] border-[#1a6bcc]'
                  : 'text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {link.label}
            </Link>
          )
        })}

        {/* AI Copilots — highlighted */}
        <Link
          href="/dashboard/briefing"
          className={cn(
            'flex items-center gap-1.5 px-3.5 text-sm font-semibold border-b-2 transition-colors duration-100 ml-1',
            pathname.startsWith('/dashboard')
              ? 'text-[#1a6bcc] border-[#1a6bcc]'
              : 'text-[#1a6bcc] border-transparent hover:bg-blue-50'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Copilots
        </Link>
      </nav>

      {/* Search ─────────────────────────────────────── */}
      <div className="flex items-center px-3 border-l border-gray-200">
        <button className="flex items-center gap-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Right icon strip ───────────────────────────── */}
      <div className="flex items-stretch border-l border-gray-200">
        {rightIcons.map(item => (
          <Link
            key={item.label}
            href={item.href}
            title={item.label}
            className={cn(
              'relative flex items-center justify-center w-10 border-l border-gray-100 first:border-l-0 transition-colors',
              item.highlight
                ? 'text-[#1a6bcc] hover:bg-blue-50'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            <item.icon className="w-4 h-4" />
            {item.badge && (
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full" />
            )}
          </Link>
        ))}

        {/* Avatar */}
        <div className="flex items-center px-3 border-l border-gray-200">
          <div className="w-7 h-7 rounded-full bg-[#1a6bcc] flex items-center justify-center text-white text-xs font-bold cursor-pointer">
            JC
          </div>
        </div>
      </div>
    </header>
  )
}
