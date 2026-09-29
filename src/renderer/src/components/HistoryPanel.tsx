import { useEffect, useState } from 'react'
import type { Session, SessionSummary } from '@shared/types'
import { Markdown } from '../lib/markdown'
import { copyText, formatDate, formatDuration, formatTime } from '../lib/util'
import { IconArrowLeft, IconCheck, IconCopy, IconTrash } from './Icons'

function toMarkdown(s: Session): string {
  const lines = [`# ${s.title}`, '', `_${formatDate(s.startedAt)}_`, '', '## Transcrição', '']
  for (const e of s.transcript) lines.push(`**${e.speaker === 'them' ? 'Eles' : 'Você'}** (${formatTime(e.ts)}): ${e.text}`)
  lines.push('', '## Respostas da Mira', '')
  for (const c of [...s.cards].reverse()) lines.push(`### ${c.question}`, '', c.answer, '')
  return lines.join('\n')
}

export function HistoryPanel({ onClose }: { onClose: () => void }) {
  const [list, setList] = useState<SessionSummary[]>([])
  const [open, setOpen] = useState<Session | null>(null)
  const [copied, setCopied] = useState(false)

  const load = () => void window.mira.sessions.list().then(setList)
  useEffect(load, [])

  if (open) {
    return (
      <div className="panel">
        <header className="panel-head">
          <button className="icon-btn" onClick={() => setOpen(null)} title="Voltar">
            <IconArrowLeft />
          </button>
          <h2 className="ellipsis">{open.title}</h2>
          <button
            className="icon-btn"
            title="Copiar como Markdown"
            onClick={async () => {
              await copyText(toMarkdown(open))
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1200)
            }}
          >
            {copied ? <IconCheck /> : <IconCopy />}
          </button>
        </header>
        <div className="panel-body">
          <p className="field-hint">
            {formatDate(open.startedAt)} · {formatDuration(open.endedAt - open.startedAt)}
          </p>
          {open.cards.length > 0 && <h3 className="section-title">Respostas</h3>}
          {open.cards.map((c) => (
            <div key={c.id} className="card">
              <p className="card-question">“{c.question}”</p>
              <div className="card-body">
                <Markdown text={c.answer} />
              </div>
            </div>
          ))}
          <h3 className="section-title">Transcrição</h3>
          <div className="transcript-list is-static">
            {open.transcript.map((e) => (
              <div key={e.id} className={`line line-${e.speaker}`}>
                <span className="line-who">{e.speaker === 'them' ? 'Eles' : 'Você'}</span>
                <span className="line-text">{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="panel">
      <header className="panel-head">
        <button className="icon-btn" onClick={onClose} title="Voltar">
          <IconArrowLeft />
        </button>
        <h2>Histórico</h2>
      </header>
      <div className="panel-body">
        {!list.length && <p className="feed-empty-text">Nenhuma sessão salva ainda.</p>}
        {list.map((s) => (
          <div key={s.id} className="history-item" onClick={() => void window.mira.sessions.get(s.id).then(setOpen)}>
            <div>
              <p className="history-title">{s.title}</p>
              <p className="field-hint">
                {formatDate(s.startedAt)} · {s.lines} falas · {s.cards} respostas
              </p>
            </div>
            <button
              className="icon-btn icon-btn-sm icon-btn-danger"
              title="Apagar"
              onClick={async (e) => {
                e.stopPropagation()
                await window.mira.sessions.remove(s.id)
                load()
              }}
            >
              <IconTrash size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
