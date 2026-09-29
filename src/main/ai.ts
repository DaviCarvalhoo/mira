import { LLM_PROVIDERS, STT_PROVIDERS } from '@shared/providers'
import { SseParser, extractDelta } from '@shared/sse'
import type { ChatContent, ChatMessage, LlmRequest, Settings, TranscribeResult } from '@shared/types'
import { getKey } from './store'

/**
 * Todas as chamadas de rede saem do processo principal (Node), não do navegador:
 * sem CORS, sem bloqueio de extensão/adblock e sem expor a chave de API ao front-end.
 */

const running = new Map<string, AbortController>()

export function abortLlm(id: string): void {
  running.get(id)?.abort()
  running.delete(id)
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}

function toOpenAiContent(content: ChatContent): unknown {
  if (typeof content === 'string') return content
  return content.map((p) =>
    p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image_url', image_url: { url: p.dataUrl } }
  )
}

function toAnthropicContent(content: ChatContent): unknown {
  if (typeof content === 'string') return content
  return content.map((p) => {
    if (p.type === 'text') return { type: 'text', text: p.text }
    const m = /^data:(.+?);base64,(.*)$/.exec(p.dataUrl)
    return { type: 'image', source: { type: 'base64', media_type: m?.[1] ?? 'image/png', data: m?.[2] ?? '' } }
  })
}

function contentToText(content: ChatContent): string {
  return typeof content === 'string' ? content : content.map((p) => (p.type === 'text' ? p.text : '')).join('\n')
}

async function readError(res: Response): Promise<string> {
  const body = await res.text().catch(() => '')
  try {
    const j = JSON.parse(body)
    return `${res.status}: ${j.error?.message ?? j.message ?? body}`
  } catch {
    return `${res.status}: ${body.slice(0, 300) || res.statusText}`
  }
}

function friendlyError(err: unknown, baseUrl: string): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/fetch failed|ECONNREFUSED/i.test(msg) && /localhost|127\.0\.0\.1/.test(baseUrl)) {
    return `Não consegui conectar em ${baseUrl}. O servidor local (Ollama/LM Studio) está rodando?`
  }
  if (/401|invalid.*key|unauthorized/i.test(msg)) return `Chave de API inválida. Confira nas configurações. (${msg})`
  return msg
}

export async function streamLlm(
  settings: Settings,
  req: LlmRequest,
  onDelta: (delta: string) => void
): Promise<void> {
  const provider = LLM_PROVIDERS[settings.llm.provider] ?? LLM_PROVIDERS.custom
  const baseUrl = trimSlash(settings.llm.baseUrl || provider.baseUrl)
  const key = getKey(provider.id)
  if (provider.needsKey && !key) {
    throw new Error(`Falta a chave de API do ${provider.label.split(' (')[0]}. Abra as configurações (⚙) e cole sua chave.`)
  }

  const controller = new AbortController()
  running.set(req.id, controller)
  const maxTokens = req.maxTokens ?? 900
  const temperature = req.temperature ?? 0.4

  let url: string
  let headers: Record<string, string>
  let body: unknown

  if (provider.kind === 'anthropic') {
    const system = req.messages.filter((m) => m.role === 'system').map((m) => contentToText(m.content)).join('\n\n')
    url = `${baseUrl}/messages`
    headers = { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    body = {
      model: settings.llm.model,
      system,
      max_tokens: maxTokens,
      temperature,
      stream: true,
      messages: req.messages
        .filter((m) => m.role !== 'system')
        .map((m: ChatMessage) => ({ role: m.role, content: toAnthropicContent(m.content) }))
    }
  } else {
    url = `${baseUrl}/chat/completions`
    headers = { 'content-type': 'application/json' }
    if (key) headers.authorization = `Bearer ${key}`
    if (provider.id === 'openrouter') {
      headers['HTTP-Referer'] = 'https://github.com/mira-copilot'
      headers['X-Title'] = 'Mira'
    }
    body = {
      model: settings.llm.model,
      stream: true,
      temperature,
      max_tokens: maxTokens,
      messages: req.messages.map((m) => ({ role: m.role, content: toOpenAiContent(m.content) }))
    }
  }

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal })
    if (!res.ok || !res.body) throw new Error(await readError(res))

    const parser = new SseParser()
    const decoder = new TextDecoder()
    const reader = res.body.getReader()
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      for (const data of parser.push(decoder.decode(value, { stream: true }))) {
        const ev = extractDelta(data, provider.kind)
        if (ev.error) throw new Error(ev.error)
        if (ev.delta) onDelta(ev.delta)
        if (ev.done) return
      }
    }
  } catch (err) {
    if (controller.signal.aborted) return
    throw new Error(friendlyError(err, baseUrl))
  } finally {
    running.delete(req.id)
  }
}

export async function transcribe(settings: Settings, audio: ArrayBuffer, prompt?: string): Promise<TranscribeResult> {
  const provider = STT_PROVIDERS[settings.stt.provider] ?? STT_PROVIDERS.custom
  const baseUrl = trimSlash(settings.stt.baseUrl || provider.baseUrl)
  const key = getKey(provider.keyFrom)
  if (provider.id !== 'custom' && !key) {
    return { text: '', error: `Falta a chave do ${provider.label.split(' (')[0]} para transcrever. Configure em ⚙ → IA.` }
  }

  const form = new FormData()
  form.append('file', new Blob([audio], { type: 'audio/wav' }), 'audio.wav')
  form.append('model', settings.stt.model || provider.defaultModel)
  form.append('response_format', 'json')
  form.append('temperature', '0')
  if (settings.stt.language && settings.stt.language !== 'auto') form.append('language', settings.stt.language)
  if (prompt) form.append('prompt', prompt.slice(-400))

  try {
    const res = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: key ? { authorization: `Bearer ${key}` } : {},
      body: form
    })
    if (!res.ok) return { text: '', error: await readError(res) }
    const json = (await res.json()) as { text?: string }
    return { text: json.text ?? '' }
  } catch (err) {
    return { text: '', error: friendlyError(err, baseUrl) }
  }
}
