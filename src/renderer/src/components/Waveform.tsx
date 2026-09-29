import { useEffect, useRef, type MutableRefObject } from 'react'
import type { Levels } from '../hooks/useCopilot'

const BARS = 46
const COLORS = { them: '#EDEDED', you: '#6B6B6B' }

/**
 * Onda sonora ao vivo (canvas + requestAnimationFrame, sem re-render do React).
 * Metade esquerda = eles (claro), metade direita = você (cinza).
 */
export function Waveform({ levels, active }: { levels: MutableRefObject<Levels>; active: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const history = useRef<{ them: number[]; you: number[] }>({
    them: Array(BARS / 2).fill(0),
    you: Array(BARS / 2).fill(0)
  })

  useEffect(() => {
    let raf = 0
    let frame = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const el = canvas.current
      if (!el) return
      const dpr = window.devicePixelRatio || 1
      const w = el.clientWidth
      const h = el.clientHeight
      if (el.width !== w * dpr) {
        el.width = w * dpr
        el.height = h * dpr
      }
      const ctx = el.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      if (frame++ % 3 === 0) {
        for (const sp of ['them', 'you'] as const) {
          const hist = history.current[sp]
          hist.shift()
          hist.push(levels.current[sp])
        }
      }

      const gap = w / BARS
      const barW = Math.max(2, gap * 0.42)
      const t = performance.now() / 1000
      const drawSide = (sp: 'them' | 'you', startIdx: number, reverse: boolean) => {
        const hist = history.current[sp]
        ctx.fillStyle = COLORS[sp]
        for (let i = 0; i < hist.length; i++) {
          const v = hist[reverse ? hist.length - 1 - i : i]
          const idle = active ? 0.06 + 0.04 * Math.sin(t * 2.4 + i * 0.5) : 0.04
          const bh = Math.max(2, (Math.max(v, idle) * 0.92) * h)
          const x = (startIdx + i) * gap + (gap - barW) / 2
          ctx.globalAlpha = active ? 0.45 + Math.min(0.55, v * 1.5) : 0.2
          ctx.beginPath()
          ctx.roundRect(x, (h - bh) / 2, barW, bh, barW / 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      // eles da esquerda para o centro, você do centro para a direita
      drawSide('them', 0, false)
      drawSide('you', BARS / 2, true)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [levels, active])

  return (
    <div className="wave">
      <span className="wave-label them">Eles</span>
      <canvas ref={canvas} className="wave-canvas" />
      <span className="wave-label you">Você</span>
    </div>
  )
}
