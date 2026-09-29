import type { ChatMessage } from '@shared/types'
import { uid } from './util'

interface Handlers {
  onDelta: (delta: string) => void
  onEnd: (error?: string) => void
}

const handlers = new Map<string, Handlers>()
let wired = false

function wire(): void {
  if (wired) return
  wired = true
  window.mira.llm.onChunk(({ id, delta }) => handlers.get(id)?.onDelta(delta))
  window.mira.llm.onEnd(({ id, error }) => {
    handlers.get(id)?.onEnd(error)
    handlers.delete(id)
  })
}

export interface StreamOptions {
  temperature?: number
  maxTokens?: number
  /** resposta simulada (modo demo sem chave) */
  fake?: string
}

/** Dispara uma geração em streaming. Retorna o id (para abortar). */
export function streamChat(messages: ChatMessage[], h: Handlers, opts: StreamOptions = {}): string {
  const id = uid()
  if (opts.fake !== undefined) {
    fakeStream(id, opts.fake, h)
    return id
  }
  wire()
  handlers.set(id, h)
  window.mira.llm.stream({ id, messages, temperature: opts.temperature, maxTokens: opts.maxTokens }).catch((err) => {
    handlers.get(id)?.onEnd(String(err))
    handlers.delete(id)
  })
  return id
}

const fakeTimers = new Map<string, number>()

function fakeStream(id: string, text: string, h: Handlers): void {
  const tokens = text.match(/\S+\s*|\s+/g) ?? []
  let i = 0
  const tick = () => {
    if (i >= tokens.length) {
      fakeTimers.delete(id)
      h.onEnd()
      return
    }
    h.onDelta(tokens.slice(i, i + 2).join(''))
    i += 2
    fakeTimers.set(id, window.setTimeout(tick, 28 + Math.random() * 40))
  }
  fakeTimers.set(id, window.setTimeout(tick, 350))
}

export function abortChat(id: string): void {
  const t = fakeTimers.get(id)
  if (t !== undefined) {
    clearTimeout(t)
    fakeTimers.delete(id)
    return
  }
  handlers.delete(id)
  void window.mira.llm.abort(id)
}

/** Geração completa (sem streaming na UI), ex.: títulos. */
export function completeChat(messages: ChatMessage[], opts: StreamOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    let out = ''
    streamChat(
      messages,
      {
        onDelta: (d) => (out += d),
        onEnd: (err) => (err ? reject(new Error(err)) : resolve(out.trim()))
      },
      opts
    )
  })
}
