'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Step = {
  target: string | null
  title: string
  description: string
  position?: 'bottom' | 'top' | 'right' | 'left'
}

const STEPS: Step[] = [
  {
    target: null,
    title: 'Welcome to Lofty AI Copilot ✨',
    description:
      "Your AI-powered real estate operating system. It analyzes your entire pipeline and tells you exactly what to do — so you can focus on closing deals, not figuring out where to start.",
    position: 'bottom',
  },
  {
    target: 'briefing-card',
    title: 'AI Daily Briefing',
    description:
      "Every morning your AI scans your pipeline and writes a personalized briefing. You can even hear it read aloud — like having a copilot who's already done your prep work.",
    position: 'bottom',
  },
  {
    target: 'stat-strip',
    title: 'Live Pipeline Stats',
    description:
      "Real-time KPIs with delta badges so you know instantly if your pipeline is heating up or cooling down compared to yesterday.",
    position: 'bottom',
  },
  {
    target: 'section:opportunities',
    title: "Today's Hottest Leads",
    description:
      "Leads sorted by AI score. Click any lead to see their activity, best-matched property, and a one-click action to reach out.",
    position: 'right',
  },
  {
    target: 'assistant-widget',
    title: 'Ask Lofty AI',
    description:
      'Tap the floating copilot anytime. Ask in plain English to jump to the right screen, hear a briefing, or figure out what to do next.',
    position: 'left',
  },
]

type Rect = { top: number; left: number; width: number; height: number }

const PAD = 10
const VIEWPORT_PAD = 16
const TOOLTIP_WIDTH = 320
const TOOLTIP_HEIGHT_ESTIMATE = 240

export function OnboardingTour() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    function startOnboarding() {
      setStep(0)
      setVisible(true)
    }

    window.addEventListener('lofty:startOnboarding', startOnboarding)

    if (!localStorage.getItem('lofty:onboardingSeen')) {
      const t = setTimeout(() => setVisible(true), 900)
      return () => {
        clearTimeout(t)
        window.removeEventListener('lofty:startOnboarding', startOnboarding)
      }
    }

    return () => {
      window.removeEventListener('lofty:startOnboarding', startOnboarding)
    }
  }, [])

  useEffect(() => {
    if (!visible) return
    const target = STEPS[step].target
    if (!target) {
      const frame = requestAnimationFrame(() => setRect(null))
      return () => cancelAnimationFrame(frame)
    }

    function measure() {
      const el =
        document.querySelector(`[data-assistant-id="${target}"]`) ??
        document.querySelector(`[data-tour="${target}"]`)
      if (!el) {
        if (target === 'assistant-widget') {
          const w = 150
          const h = 150
          setRect({
            top: window.innerHeight - h - 24 - PAD,
            left: window.innerWidth - w - 24 - PAD,
            width: w + PAD * 2,
            height: h + PAD * 2,
          })
        } else {
          setRect(null)
        }
        return
      }
      const r = el.getBoundingClientRect()
      setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 })
    }

    const el =
      document.querySelector(`[data-assistant-id="${target}"]`) ??
      document.querySelector(`[data-tour="${target}"]`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
    measure()
    const firstFrame = requestAnimationFrame(measure)
    const settledTimer = window.setTimeout(measure, 350)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      cancelAnimationFrame(firstFrame)
      window.clearTimeout(settledTimer)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, visible])

  function dismiss() {
    setVisible(false)
    localStorage.setItem('lofty:onboardingSeen', 'true')
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else dismiss()
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1)
  }

  if (!visible) return null

  const current = STEPS[step]

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Onboarding tour">
      {/* Spotlight overlay */}
      {rect ? (
        <>
          <div className="absolute bg-gray-950/65 transition-all" style={{ inset: 0, clipPath: `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% ${rect.top}px, ${rect.left}px ${rect.top}px, ${rect.left}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top + rect.height}px, ${rect.left + rect.width}px ${rect.top}px, 0% ${rect.top}px)` }} />
          <div
            className="absolute rounded-2xl ring-[2.5px] ring-[#1a6bcc] pointer-events-none"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-gray-950/65" />
      )}

      {/* Tooltip */}
      {current.target === null ? (
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <Tooltip current={current} step={step} total={STEPS.length} onNext={next} onPrev={prev} onDismiss={dismiss} />
        </div>
      ) : rect ? (
        <PositionedTooltip
          rect={rect}
          position={current.position ?? 'bottom'}
          current={current}
          step={step}
          total={STEPS.length}
          onNext={next}
          onPrev={prev}
          onDismiss={dismiss}
        />
      ) : null}
    </div>
  )
}

function PositionedTooltip({
  rect,
  position,
  current,
  step,
  total,
  onNext,
  onPrev,
  onDismiss,
}: {
  rect: Rect
  position: string
  current: Step
  step: number
  total: number
  onNext: () => void
  onPrev: () => void
  onDismiss: () => void
}) {
  const GAP = 14
  const width = Math.min(TOOLTIP_WIDTH, window.innerWidth - VIEWPORT_PAD * 2)
  const maxLeft = Math.max(VIEWPORT_PAD, window.innerWidth - width - VIEWPORT_PAD)
  const maxTop = Math.max(VIEWPORT_PAD, window.innerHeight - TOOLTIP_HEIGHT_ESTIMATE - VIEWPORT_PAD)
  let top = VIEWPORT_PAD
  let left = VIEWPORT_PAD

  if (position === 'bottom') {
    const below = rect.top + rect.height + GAP
    const above = rect.top - TOOLTIP_HEIGHT_ESTIMATE - GAP
    top = below + TOOLTIP_HEIGHT_ESTIMATE <= window.innerHeight - VIEWPORT_PAD ? below : above
    left = rect.left
  } else if (position === 'top') {
    const above = rect.top - TOOLTIP_HEIGHT_ESTIMATE - GAP
    const below = rect.top + rect.height + GAP
    top = above >= VIEWPORT_PAD ? above : below
    left = rect.left
  } else if (position === 'right') {
    const right = rect.left + rect.width + GAP
    const leftSide = rect.left - width - GAP
    left = right + width <= window.innerWidth - VIEWPORT_PAD ? right : leftSide
    top = rect.top
  } else if (position === 'left') {
    const leftSide = rect.left - width - GAP
    const right = rect.left + rect.width + GAP
    left = leftSide >= VIEWPORT_PAD ? leftSide : right
    top = rect.top
  } else {
    top = rect.top + rect.height + GAP
    left = rect.left
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    width,
    top: clamp(top, VIEWPORT_PAD, maxTop),
    left: clamp(left, VIEWPORT_PAD, maxLeft),
  }

  return (
    <div style={style}>
      <Tooltip current={current} step={step} total={total} onNext={onNext} onPrev={onPrev} onDismiss={onDismiss} />
    </div>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function Tooltip({
  current,
  step,
  total,
  onNext,
  onPrev,
  onDismiss,
}: {
  current: Step
  step: number
  total: number
  onNext: () => void
  onPrev: () => void
  onDismiss: () => void
}) {
  const isLast = step === total - 1
  return (
    <div className="w-80 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-br from-[#1a6bcc] to-[#0f4fa0] px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-3.5 h-3.5 text-white/70" />
          <span className="text-[10px] font-semibold text-white/60 uppercase tracking-widest">
            Step {step + 1} of {total}
          </span>
        </div>
        <h3 className="text-white font-bold text-[15px] leading-snug">{current.title}</h3>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-gray-600 leading-relaxed">{current.description}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button type="button" onClick={onDismiss} className="text-xs text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 shrink-0"
                onClick={onPrev}
              >
                <ArrowLeft className="w-3 h-3" />
                Back
              </Button>
            )}
            <div className="flex gap-1">
              {Array.from({ length: total }, (_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === step ? 'bg-[#1a6bcc]' : 'bg-gray-200'}`}
                />
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs bg-[#1a6bcc] hover:bg-[#1558a8] text-white border-0 gap-1 shrink-0"
              onClick={onNext}
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ArrowRight className="w-3 h-3" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
