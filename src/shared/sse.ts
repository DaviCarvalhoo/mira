/**
 * Parser incremental de Server-Sent Events.
 * Recebe pedaços de texto em qualquer fronteira e devolve os payloads `data:` completos.
 */
export class SseParser {
  private buffer = ''

  push(chunk: string): string[] {
    this.buffer += chunk.replace(/\r\n/g, '\n')
    const out: string[] = []
    let idx: number
    while ((idx = this.buffer.indexOf('\n\n')) !== -1) {
      const block = this.buffer.slice(0, idx)
      this.buffer = this.buffer.slice(idx + 2)
      const data = block
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).replace(/^ /, ''))
        .join('\n')
      if (data) out.push(data)
    }
    return out
  }
}

/** Extrai o texto incremental de um evento de streaming (formato OpenAI ou Anthropic). */
export function extractDelta(data: string, kind: 'openai' | 'anthropic'): { delta: string; done: boolean; error?: string } {
  if (data === '[DONE]') return { delta: '', done: true }
  let json: any
  try {
    json = JSON.parse(data)
  } catch {
    return { delta: '', done: false }
  }
  if (json?.error) {
    const msg = typeof json.error === 'string' ? json.error : json.error.message ?? JSON.stringify(json.error)
    return { delta: '', done: true, error: msg }
  }
  if (kind === 'anthropic') {
    if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
      return { delta: json.delta.text ?? '', done: false }
    }
    return { delta: '', done: json.type === 'message_stop' }
  }
  const choice = json.choices?.[0]
  return { delta: choice?.delta?.content ?? '', done: false }
}
