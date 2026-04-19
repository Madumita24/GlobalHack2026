'use client'

import { ChevronDown, LayoutGrid, Zap } from 'lucide-react'

interface TopHeaderProps {
  agentName: string
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export default function TopHeader({ agentName }: TopHeaderProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex items-center justify-between px-6 h-[56px] bg-white border-b border-gray-100 shrink-0">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <span className="text-xl">👋</span>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">
            {getGreeting()}, {agentName.split(' ')[0]}!
          </h1>
          <p className="text-xs text-gray-400 leading-tight">{today}</p>
        </div>
      </div>

      {/* Right controls — mirrors original Lofty page header */}
      <div className="flex items-center gap-2">
        {/* AI pill */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
          <Zap className="w-3 h-3 text-[#1a6bcc]" />
          <span className="text-xs font-medium text-[#1a6bcc]">Your AI prepared your day</span>
        </div>

        {/* Dashboard selector — like "My Dashboard ▾" in Lofty */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-colors">
          My Dashboard
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {/* Today's Priorities dropdown — matches Lofty exactly */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
          Today&apos;s Priorities
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {/* Grid toggle */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
          <LayoutGrid className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
