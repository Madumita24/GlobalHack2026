'use client'

import { X, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DetailPanelProps {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
}

export default function DetailPanel({ open, onClose, title, children }: DetailPanelProps) {
  if (!open) return null

  return (
    <aside className="w-80 min-h-full bg-white border-l border-gray-100 flex flex-col shrink-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#1a6bcc]" />
          <span className="text-sm font-semibold text-gray-900">{title ?? 'AI Reasoning'}</span>
        </div>
        <Button variant="ghost" size="icon" className="w-7 h-7 text-gray-400" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {children ?? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Sparkles className="w-8 h-8 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Select an action to see<br />AI reasoning here</p>
          </div>
        )}
      </div>
    </aside>
  )
}
