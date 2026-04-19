'use client'

import { useState, useRef, useCallback } from 'react'

export type VoiceState = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

// ── Browser TTS fallback ──────────────────────────────────────────────────────

function browserSpeak(
  text: string,
  onStart: () => void,
  onEnd: () => void,
  onError: () => void,
): () => void {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onError()
    return () => {}
  }

  window.speechSynthesis.cancel()

  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 1.05
  utter.pitch = 1.0
  utter.volume = 1.0

  // Prefer a natural-sounding English voice if available
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')),
  )
  if (preferred) utter.voice = preferred

  utter.onstart = onStart
  utter.onend   = onEnd
  utter.onerror = onError

  window.speechSynthesis.speak(utter)

  return () => window.speechSynthesis.cancel()
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVoice() {
  const [state, setState] = useState<VoiceState>('idle')
  const [activeId, setActiveId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const browserCancelRef = useRef<(() => void) | null>(null)

  const cleanup = useCallback(() => {
    // ElevenLabs audio
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ''
      audioRef.current.onplay = null
      audioRef.current.onpause = null
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    // Browser TTS
    if (browserCancelRef.current) {
      browserCancelRef.current()
      browserCancelRef.current = null
    }
  }, [])

  const stop = useCallback(() => {
    cleanup()
    setState('idle')
    setActiveId(null)
  }, [cleanup])

  const speak = useCallback(
    async (text: string, id = 'default') => {
      if (activeId === id && state === 'playing') {
        stop()
        return
      }

      cleanup()
      setState('loading')
      setActiveId(id)

      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        // 402 = paid plan required, 503 = no API key — fall back to browser TTS
        if (res.status === 402 || res.status === 503) {
          console.info('[Voice] ElevenLabs unavailable — using browser TTS fallback')
          browserCancelRef.current = browserSpeak(
            text,
            () => setState('playing'),
            () => { setState('idle'); setActiveId(null); browserCancelRef.current = null },
            () => { setState('error'); setActiveId(null); browserCancelRef.current = null },
          )
          return
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'TTS failed' }))
          console.error('[Voice]', body.error ?? body)
          setState('error')
          setActiveId(null)
          return
        }

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url

        const audio = new Audio(url)
        audioRef.current = audio

        audio.onplay   = () => setState('playing')
        audio.onpause  = () => { if (!audio.ended) setState('paused') }
        audio.onended  = () => { setState('idle'); setActiveId(null); cleanup() }
        audio.onerror  = () => { setState('error'); setActiveId(null); cleanup() }

        await audio.play()
      } catch (err) {
        console.error('[Voice] speak error:', err)
        // Network error — still try browser fallback
        browserCancelRef.current = browserSpeak(
          text,
          () => setState('playing'),
          () => { setState('idle'); setActiveId(null) },
          () => { setState('error'); setActiveId(null) },
        )
      }
    },
    [activeId, state, stop, cleanup],
  )

  const pause = useCallback(() => {
    audioRef.current?.pause()
    if (browserCancelRef.current) window.speechSynthesis?.pause()
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => setState('error'))
    if (browserCancelRef.current) window.speechSynthesis?.resume()
  }, [])

  const toggle = useCallback(() => {
    if (state === 'playing') pause()
    else if (state === 'paused') resume()
  }, [state, pause, resume])

  return { state, activeId, speak, stop, pause, resume, toggle }
}
