import { useState } from 'react'
import type { AnswerCard } from '@shared/types'
import mark from '../assets/mark.svg'
import { Markdown } from '../lib/markdown'
import { copyText, formatTime, modKey } from '../lib/util'
import { IconCheck, IconChevron, IconCopy, IconStop } from './Icons'

/** Rótulo de cima (de onde veio) e rótulo da resposta, por tipo de card. */
const LABELS: Record<AnswerCard['kind'], { from: string; say: string }> = {
  answer: { from: 'Eles disseram', say: 'Diga isso' },
  chat: { from: 'Você perguntou', say: 'Resposta' },
  screen: { from: 'Tela capturada', say: 'Solução' },
  recap: { from: 'Conversa', say: 'Resumo' }
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="icon-btn icon-btn-sm"
      title="Copiar"
      onClick={async (e) => {
        e.stopPropagation()
        await copyText(text)
        setDone(true)
        window.setTimeout(() => setDone(false), 1200)
      }}
    >
      {done ? <IconCheck size={13} /> : <IconCopy size={13} />}
    </button>
  )
}

function Card({ card, hero, onStop }: { card: AnswerCard; hero: boolean; onStop: () => void }) {
  const [open, setOpen] = useState(false)
  const expanded = hero || open
  const streaming = card.status === 'streaming'
  const labels = LABELS[card.kind]
  const hasQuote = card.kind === 'answer' || card.kind === 'chat'

  return (
    <article className={`card ${hero ? 'card-hero' : 'card-compact'}`}>
      <header className="card-head" onClick={() => !hero && setOpen(!open)}>
        <span className="eyebrow">{labels.from}</span>
        <span className="card-time">{formatTime(card.ts)}</span>
        {hero && streaming && (
          <button className="icon-btn icon-btn-sm" title="Parar" onClick={onStop}>
            <IconStop size={11} />
          </button>
        )}
        {card.answer && !streaming && <CopyButton text={card.answer} />}
        {!hero && <IconChevron size={13} className={`chev ${open ? 'is-open' : ''}`} />}
      </header>

      {hasQuote && <p className="quote">“{card.question}”</p>}

      {expanded && (
        <div className="say">
          <div className="say-label">
            <span className="sig" />
            <span className="eyebrow">{labels.say}</span>
          </div>
          {card.answer ? (
            <>
              <Markdown text={card.answer} />
              {streaming && <span className="caret" />}
            </>
          ) : streaming ? (
            <div className="thinking">
              <span />
              <span />
              <span />
              pensando
            </div>
          ) : null}
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
        <img src={mark} alt="" className="feed-empty-mark" />
        <p className="feed-empty-title">Pronta quando você estiver.</p>
        <p className="feed-empty-text">
          Quando alguém fizer uma pergunta, a resposta aparece aqui.
          <br />
          <kbd>{modKey()}</kbd> <kbd>Shift</kbd> <kbd>Enter</kbd> responde a qualquer momento.
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
