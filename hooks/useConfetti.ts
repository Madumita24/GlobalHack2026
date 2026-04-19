'use client'

import { useCallback, useRef } from 'react'

const COLORS = ['#1a6bcc', '#5b9de8', '#34d399', '#f59e0b', '#f472b6', '#a78bfa', '#fb923c']

type Particle = {
  x: number; y: number
  vx: number; vy: number
  color: string; size: number
  opacity: number; rotation: number; rotationSpeed: number
}

export function useConfetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)

  const fire = useCallback((originX?: number, originY?: number) => {
    canvasRef.current?.remove()
    cancelAnimationFrame(rafRef.current)

    const canvas = document.createElement('canvas')
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'
    document.body.appendChild(canvas)
    canvasRef.current = canvas

    const ctx = canvas.getContext('2d')!
    const cx = originX ?? window.innerWidth / 2
    const cy = originY ?? window.innerHeight * 0.45

    const particles: Particle[] = Array.from({ length: 110 }, () => ({
      x: cx,
      y: cy,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 9 + 4,
      opacity: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 14,
    }))

    let start = 0

    function animate(ts: number) {
      if (!start) start = ts
      const elapsed = ts - start
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.35
        p.rotation += p.rotationSpeed
        p.opacity = Math.max(0, 1 - elapsed / 2200)

        if (p.opacity > 0 && p.y < canvas.height + 20) {
          alive = true
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate((p.rotation * Math.PI) / 180)
          ctx.globalAlpha = p.opacity
          ctx.fillStyle = p.color
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
          ctx.restore()
        }
      }

      if (alive && elapsed < 2600) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        canvas.remove()
        canvasRef.current = null
      }
    }

    rafRef.current = requestAnimationFrame(animate)
  }, [])

  return { fire }
}
