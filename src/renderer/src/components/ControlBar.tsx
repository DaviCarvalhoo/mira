import { useState, type FormEvent } from 'react'
import { modKey } from '../lib/util'
import { IconArrowUp, IconMic, IconNotes, IconScreen, IconSparkle, IconTrash } from './Icons'

interface Props {
  listening: boolean
  starting: boolean
  demo: boolean
  onToggle: () => void
  onAnswer: () => void
  onScreen: () => void
  onRecap: () => void
  onReset: () => void
  onAsk: (text: string) => void
}

export function ControlBar(p: Props) {
  const [text, setText] = useState('')
  const mod = modKey()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    p.onAsk(text)
    setText('')
  }

  return (
    <footer className="controls">
      <div className="controls-row">
        <button
          className={`listen-btn ${p.listening ? 'is-live' : ''}`}
          onClick={p.onToggle}
          disabled={p.starting}
          title={`${p.listening ? 'Parar' : 'Começar a ouvir'} (${mod}+Shift+L)`}
        >
          {p.listening ? <span className="sig" /> : <IconMic size={15} />}
          <span>{p.starting ? 'Iniciando…' : p.listening ? 'Parar' : p.demo ? 'Iniciar demo' : 'Ouvir'}</span>
        </button>

        <button className="tool-btn tool-primary" onClick={p.onAnswer} title={`Responder agora (${mod}+Shift+Enter)`}>
          <IconSparkle size={14} />
          <span>Responder</span>
        </button>
        <button className="tool-btn" onClick={p.onScreen} title={`Analisar tela (${mod}+Shift+H)`}>
          <IconScreen size={15} />
        </button>
        <button className="tool-btn" onClick={p.onRecap} title={`Resumo da conversa (${mod}+Shift+R)`}>
          <IconNotes size={15} />
        </button>
        <button className="tool-btn" onClick={p.onReset} title="Nova sessão (salva a atual no histórico)">
          <IconTrash size={15} />
        </button>
      </div>

      <form className="ask" onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pergunte qualquer coisa à Mira…"
          spellCheck={false}
        />
        <button type="submit" className="ask-send" disabled={!text.trim()} title="Enviar">
          <IconArrowUp size={14} />
        </button>
      </form>
    </footer>
  )
}
