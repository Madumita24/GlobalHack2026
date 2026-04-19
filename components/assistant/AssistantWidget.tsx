'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Bot,
  Loader2,
  Mic,
  MicOff,
  Navigation,
  Send,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVoice } from '@/hooks/useVoice'
import type { AssistantChatMessage, AssistantDecision, AssistantStatus } from '@/types/assistant'

const EXAMPLE_PROMPTS = [
  'What should I do first?',
  'Show me my top lead',
  'Take me to my hottest listing match',
  'Send me to the transaction that needs attention',
]

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

export function AssistantWidget() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { state: voiceState, speak, stop } = useVoice()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<AssistantStatus>('idle')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask me to open leads, find your top action, or jump to the transaction that needs attention.',
    },
  ])
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const scrollerRef = useRef<HTMLDivElement | null>(null)

  const isBusy = status === 'thinking' || status === 'navigating'
  const isListening = status === 'listening'
  const isSpeaking = voiceState === 'loading' || voiceState === 'playing'

  const assistantStatusLabel = useMemo(() => {
    if (status === 'listening') return 'Listening'
    if (status === 'thinking') return 'Thinking'
    if (status === 'navigating') return 'Navigating'
    if (voiceState === 'loading') return 'Preparing voice'
    if (voiceState === 'playing') return 'Speaking'
    if (status === 'error') return 'Needs a retry'
    return 'Ready'
  }, [status, voiceState])

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight })
  }, [messages, open])

  useEffect(() => {
    const highlightId = searchParams.get('assistantHighlight')
    if (!highlightId) return

    const timer = window.setTimeout(() => highlightTarget(highlightId), 250)
    return () => window.clearTimeout(timer)
  }, [pathname, searchParams])

  const submitMessage = useCallback(
    async (message: string) => {
      const trimmed = message.trim()
      if (!trimmed || isBusy) return

      setOpen(true)
      setInput('')
      setStatus('thinking')
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'user', content: trimmed },
      ])

      try {
        const response = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            currentPath: pathname,
            recentExecutedActionIds: getRecentExecutedActionIds(),
          }),
        })

        if (!response.ok) throw new Error('Assistant request failed')

        const decision = (await response.json()) as AssistantDecision
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: decision.clarificationQuestion ?? decision.voiceResponse,
          },
        ])

        if (decision.targetRoute) {
          setStatus('navigating')
          const href = decision.highlight && decision.targetId
            ? `${decision.targetRoute}?assistantHighlight=${encodeURIComponent(decision.targetId)}`
            : decision.targetRoute
          router.push(href)
          window.setTimeout(() => {
            if (decision.targetId) highlightTarget(decision.targetId)
            setStatus('idle')
          }, 450)
        } else {
          setStatus('idle')
        }

        if (decision.voiceResponse) {
          speak(decision.voiceResponse, `assistant-${Date.now()}`)
        }
      } catch (error) {
        console.error('[AssistantWidget]', error)
        setStatus('error')
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'I hit a snag routing that. Try asking for leads, actions, tasks, listings, or transactions.',
          },
        ])
      }
    },
    [isBusy, pathname, router, speak],
  )

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submitMessage(input)
  }

  function toggleListening() {
    if (isListening) {
      recognitionRef.current?.stop()
      setStatus('idle')
      return
    }

    const SpeechRecognition =
      getSpeechRecognitionConstructor()

    if (!SpeechRecognition) {
      setStatus('error')
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'Voice input is not available in this browser. You can type the command instead.',
        },
      ])
      return
    }

    const recognition = new SpeechRecognition()
    recognitionRef.current = recognition
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? ''
      setStatus('idle')
      if (transcript) submitMessage(transcript)
    }
    recognition.onerror = () => setStatus('error')
    recognition.onend = () => {
      setStatus((current) => (current === 'listening' ? 'idle' : current))
    }
    setOpen(true)
    setStatus('listening')
    recognition.start()
  }

  return (
    <div className="fixed bottom-6 left-6 z-[65] flex max-w-[calc(100vw-3rem)] flex-col items-start gap-3">
      {open && (
        <div className="w-[360px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1a6bcc]">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Lofty Assistant</p>
                <p className="text-[11px] text-gray-400">{assistantStatusLabel}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollerRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                    message.role === 'user'
                      ? 'bg-[#1a6bcc] text-white'
                      : 'bg-gray-50 text-gray-700',
                  ].join(' ')}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isBusy && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1a6bcc]" />
                {status === 'thinking' ? 'Understanding request...' : 'Opening the right view...'}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {EXAMPLE_PROMPTS.slice(0, 2).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => submitMessage(prompt)}
                  className="rounded-full bg-white px-2.5 py-1 text-[10px] font-medium text-gray-500 ring-1 ring-gray-100 transition-colors hover:text-[#1a6bcc]"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask your copilot..."
                className="h-9 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-800 outline-none transition-colors placeholder:text-gray-400 focus:border-[#1a6bcc]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className={isListening ? 'border-[#1a6bcc] text-[#1a6bcc]' : ''}
                onClick={toggleListening}
              >
                {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              </Button>
              <Button
                type="submit"
                size="icon-sm"
                className="bg-[#1a6bcc] text-white hover:bg-[#1558a8]"
                disabled={isBusy || !input.trim()}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen((value) => !value)}
          className={[
            'flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1a6bcc]',
            open
              ? 'bg-[#1a6bcc] text-white shadow-[0_0_24px_rgba(26,107,204,0.45)]'
              : 'border border-gray-200 bg-white text-[#1a6bcc] hover:scale-105 hover:border-[#1a6bcc]/60 hover:shadow-[0_0_14px_rgba(26,107,204,0.2)]',
          ].join(' ')}
          title="Open Lofty Assistant"
        >
          <Bot className="h-5 w-5" />
        </button>
        {open && (
          <div className="flex items-center gap-1.5 rounded-full bg-gray-900/85 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur-sm">
            {isSpeaking ? (
              <Volume2 className="h-3 w-3 text-white" />
            ) : status === 'navigating' ? (
              <Navigation className="h-3 w-3 text-white" />
            ) : status === 'thinking' ? (
              <Loader2 className="h-3 w-3 animate-spin text-white" />
            ) : (
              <Sparkles className="h-3 w-3 text-white" />
            )}
            {assistantStatusLabel}
            {isSpeaking && (
              <button onClick={stop} className="ml-1 text-white/70 hover:text-white">
                Stop
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const candidate = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null
}

function getRecentExecutedActionIds() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem('lofty:completedActions') ?? '[]') as string[]
  } catch {
    return []
  }
}

function highlightTarget(targetId: string) {
  const elements = Array.from(document.querySelectorAll('[data-assistant-id]'))
  const element = elements.find((item) => item.getAttribute('data-assistant-id') === targetId)
  if (!element) return

  document
    .querySelectorAll('.assistant-highlight')
    .forEach((item) => item.classList.remove('assistant-highlight'))

  element.classList.add('assistant-highlight')
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
