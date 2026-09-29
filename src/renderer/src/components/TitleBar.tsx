import { useEffect, useState } from 'react'
import logo from '../assets/logo.svg'
import { formatDuration } from '../lib/util'
import { IconHistory, IconMinus, IconMouse, IconSettings, IconX } from './Icons'

interface Props {
  listening: boolean
  demo: boolean
  startedAt: number | null
  clickThrough: boolean
  onHistory: () => void
  onSettings: () => void
}

export function TitleBar({ listening, demo, startedAt, clickThrough, onHistory, onSettings }: Props) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!startedAt) return
    const t = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(t)
  }, [startedAt])

  return (
    <header className="titlebar">
      <div className="brand">
        <img src={logo} alt="" className={`brand-logo ${listening ? 'is-live' : ''}`} />
        <span className="brand-name">Mira</span>
        {demo && <span className="pill pill-demo">DEMO</span>}
      </div>

      <div className={`status ${listening ? 'is-live' : ''}`}>
        <span className="status-dot" />
        {listening ? (
          <>
            Ouvindo <span className="status-time">{startedAt ? formatDuration(now - startedAt) : ''}</span>
          </>
        ) : (
          'Pausado'
        )}
      </div>

      <div className="titlebar-actions no-drag">
        {clickThrough && (
          <span className="pill pill-ghost" title="Cliques atravessam a janela (Ctrl+Shift+M)">
            <IconMouse size={12} /> fantasma
          </span>
        )}
        <button className="icon-btn" onClick={onHistory} title="Histórico">
          <IconHistory />
        </button>
        <button className="icon-btn" onClick={onSettings} title="Configurações">
          <IconSettings />
        </button>
        <button className="icon-btn" onClick={() => window.mira.window.minimize()} title="Minimizar">
          <IconMinus />
        </button>
        <button className="icon-btn icon-btn-danger" onClick={() => window.mira.window.close()} title="Fechar">
          <IconX />
        </button>
      </div>
    </header>
  )
}
