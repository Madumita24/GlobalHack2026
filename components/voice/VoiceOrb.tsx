'use client'

import { Mic, Volume2, VolumeX, Loader2, Square } from 'lucide-react'
import type { VoiceState } from '@/hooks/useVoice'

interface VoiceOrbProps {
  voiceState: VoiceState
  onActivate: () => void
  onStop: () => void
}

const STATE_LABELS: Record<VoiceState, string> = {
  idle:    'Ask your copilot',
  loading: 'Preparing…',
  playing: 'Speaking — tap to stop',
  paused:  'Paused',
  error:   'Voice unavailable',
}

export function VoiceOrb({ voiceState, onActivate, onStop }: VoiceOrbProps) {
  const isActive = voiceState === 'loading' || voiceState === 'playing'
  const isError  = voiceState === 'error'

  function handleClick() {
    if (isActive) onStop()
    else onActivate()
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-none">
      {/* Status pill — visible when not idle */}
      {voiceState !== 'idle' && (
        <div className="pointer-events-none bg-gray-900/85 text-white text-[11px] font-medium px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap shadow-lg">
          {STATE_LABELS[voiceState]}
        </div>
      )}

      {/* Orb */}
      <div className="relative pointer-events-auto">
        {/* Pulse ring when playing */}
        {voiceState === 'playing' && (
          <>
            <span className="absolute inset-0 rounded-full bg-[#1a6bcc]/30 animate-ping" />
            <span className="absolute inset-[-6px] rounded-full border border-[#1a6bcc]/20 animate-pulse" />
          </>
        )}

        <button
          onClick={handleClick}
          title={STATE_LABELS[voiceState]}
          className={[
            'relative w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a6bcc]',
            isActive
              ? 'bg-[#1a6bcc] scale-110 shadow-[0_0_24px_rgba(26,107,204,0.55)]'
              : isError
                ? 'bg-white border border-red-200 hover:border-red-300'
                : 'bg-white border border-gray-200 hover:border-[#1a6bcc]/60 hover:shadow-[0_0_14px_rgba(26,107,204,0.2)] hover:scale-105',
          ].join(' ')}
        >
          {voiceState === 'loading' && (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          )}
          {voiceState === 'playing' && (
            <Square className="w-4 h-4 text-white fill-white" />
          )}
          {voiceState === 'paused' && (
            <Volume2 className="w-5 h-5 text-[#1a6bcc]" />
          )}
          {voiceState === 'error' && (
            <VolumeX className="w-5 h-5 text-red-400" />
          )}
          {voiceState === 'idle' && (
            <Mic className="w-5 h-5 text-[#1a6bcc]" />
          )}
        </button>
      </div>
    </div>
  )
}
