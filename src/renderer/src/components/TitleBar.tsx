import { useEffect, useState } from 'react'
import { formatDuration } from '../lib/util'
import { IconHistory, IconMinus, IconMouse, IconSettings, IconX } from './Icons'
import { Wordmark } from './Wordmark'

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
      <Wordmark live={listening} />
      {demo && <span className="pill">Demo</span>}
      {clickThrough && (
        <span className="pill" title="Cliques atravessam a janela (Ctrl+Shift+M)">
          <IconMouse size={11} /> Fantasma
        </span>
      )}

      <div className={`status ${listening ? 'is-live' : ''}`}>
        <span className="sig" />
        {listening ? (
          <span className="status-time">{startedAt ? formatDuration(now - startedAt).padStart(5, '0') : '00:00'}</span>
        ) : (
          'Pausado'
        )}
      </div>

      <div className="titlebar-actions">
        <button className="icon-btn" onClick={onHistory} title="Histórico">
          <IconHistory size={15} />
        </button>
        <button className="icon-btn" onClick={onSettings} title="Configurações">
          <IconSettings size={15} />
        </button>
        <button className="icon-btn" onClick={() => window.mira.window.minimize()} title="Minimizar">
          <IconMinus size={15} />
        </button>
        <button className="icon-btn icon-btn-danger" onClick={() => window.mira.window.close()} title="Fechar">
          <IconX size={15} />
        </button>
      </div>
    </header>
  )
}
