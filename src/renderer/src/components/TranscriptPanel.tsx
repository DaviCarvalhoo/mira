import { useEffect, useRef, useState } from 'react'
import type { TranscriptEntry } from '@shared/types'
import { IconChevron, IconSparkle } from './Icons'

interface Props {
  transcript: TranscriptEntry[]
  listening: boolean
  onAnswer: (text: string) => void
}

export function TranscriptPanel({ transcript, listening, onAnswer }: Props) {
  const [open, setOpen] = useState(true)
  const list = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = list.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [transcript, open])

  return (
    <section className={`transcript ${open ? 'is-open' : ''}`}>
      <button className="transcript-head" onClick={() => setOpen(!open)}>
        <span>Transcrição ao vivo</span>
        <span className="transcript-count">{transcript.length}</span>
        <IconChevron size={14} className={`chev ${open ? '' : 'is-up'}`} />
      </button>
      {open && (
        <div className="transcript-list" ref={list}>
          {!transcript.length && (
            <p className="transcript-empty">{listening ? 'Ouvindo… fale algo.' : 'A conversa aparece aqui.'}</p>
          )}
          {transcript.map((e) => (
            <div key={e.id} className={`line line-${e.speaker}`}>
              <span className="line-who">{e.speaker === 'them' ? 'Eles' : 'Você'}</span>
              <span className="line-text">{e.text}</span>
              {e.speaker === 'them' && (
                <button className="line-answer" title="Responder esta fala" onClick={() => onAnswer(e.text)}>
                  <IconSparkle size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
