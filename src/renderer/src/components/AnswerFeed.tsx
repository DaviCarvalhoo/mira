import { useState } from 'react'
import type { AnswerCard } from '@shared/types'
import { Markdown } from '../lib/markdown'
import { copyText, formatTime, modKey } from '../lib/util'
import { IconCheck, IconChevron, IconCopy, IconScreen, IconNotes, IconSparkle, IconStop } from './Icons'

const KIND_LABEL: Record<AnswerCard['kind'], string> = {
  answer: 'Resposta sugerida',
  chat: 'Você perguntou',
  screen: 'Análise da tela',
  recap: 'Resumo'
}

function KindIcon({ kind }: { kind: AnswerCard['kind'] }) {
  if (kind === 'screen') return <IconScreen size={14} />
  if (kind === 'recap') return <IconNotes size={14} />
  return <IconSparkle size={14} />
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="icon-btn icon-btn-sm"
      title="Copiar"
      onClick={async () => {
        await copyText(text)
        setDone(true)
        window.setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? <IconCheck size={14} /> : <IconCopy size={14} />}
    </button>
  )
}

function Card({ card, hero, onStop }: { card: AnswerCard; hero: boolean; onStop: () => void }) {
  const [open, setOpen] = useState(hero)
  const expanded = hero || open
  const streaming = card.status === 'streaming'

  return (
    <article className={`card ${hero ? 'card-hero' : ''} card-${card.kind} ${streaming ? 'is-streaming' : ''}`}>
      <header className="card-head" onClick={() => !hero && setOpen(!open)}>
        <span className="card-kind">
          <KindIcon kind={card.kind} />
          {KIND_LABEL[card.kind]}
        </span>
        <span className="card-time">{formatTime(card.ts)}</span>
        {hero && streaming && (
          <button className="icon-btn icon-btn-sm" title="Parar" onClick={onStop}>
            <IconStop size={12} />
          </button>
        )}
        {card.answer && !streaming && <CopyButton text={card.answer} />}
        {!hero && <IconChevron size={14} className={`chev ${open ? 'is-open' : ''}`} />}
      </header>

      {card.kind !== 'recap' && card.kind !== 'screen' && <p className="card-question">“{card.question}”</p>}

      {expanded && (
        <div className="card-body">
          {card.answer ? (
            <Markdown text={card.answer} />
          ) : streaming ? (
            <div className="thinking">
              <span />
              <span />
              <span />
            </div>
          ) : null}
          {streaming && card.answer && <span className="caret" />}
          {card.status === 'error' && <p className="card-error">{card.error}</p>}
        </div>
      )}
    </article>
  )
}

export function AnswerFeed({ cards, onStop }: { cards: AnswerCard[]; onStop: () => void }) {
  if (!cards.length) {
    return (
      <div className="feed-empty">
        <div className="feed-empty-orb">
          <IconSparkle size={22} />
        </div>
        <p className="feed-empty-title">Pronta para ajudar</p>
        <p className="feed-empty-text">
          Quando alguém fizer uma pergunta, a resposta aparece aqui na hora.
          <br />
          <kbd>{modKey()}</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> responde a qualquer momento.
        </p>
      </div>
    )
  }
  return (
    <div className="feed">
      {cards.map((c, i) => (
        <Card key={c.id} card={c} hero={i === 0} onStop={onStop} />
      ))}
    </div>
  )
}
