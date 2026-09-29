import type { TranscriptEntry } from './types'

const QUESTION_STARTERS = [
  // pt-BR
  'o que', 'o quê', 'que ', 'qual', 'quais', 'como', 'por que', 'porque', 'pq ', 'quando', 'onde', 'quem',
  'quanto', 'quantos', 'quantas', 'você pode', 'voce pode', 'você poderia', 'voce poderia', 'você já', 'voce ja',
  'você tem', 'voce tem', 'você conhece', 'voce conhece', 'você sabe', 'voce sabe', 'me fala', 'me fale',
  'fala sobre', 'fale sobre', 'fala um pouco', 'fale um pouco', 'me conta', 'me conte', 'conta pra', 'conte',
  'me explica', 'me explique', 'explica', 'explique', 'descreva', 'descreve', 'imagina', 'imagine', 'existe',
  'é possível', 'e se', 'qual seria', 'poderia',
  // en
  'what', 'how', 'why', 'when', 'where', 'who', 'which', 'can you', 'could you', 'would you', 'will you',
  'do you', 'did you', 'have you', 'are you', 'is there', 'tell me', 'walk me through', 'describe', 'explain',
  'give me', 'imagine', 'suppose', "what's", 'how would', 'talk about'
]

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”"«»]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Heurística rápida: o texto parece uma pergunta ou pedido? */
export function isQuestion(text: string): boolean {
  const t = normalize(text)
  if (t.length < 6) return false
  if (t.includes('?')) return true
  // qualquer frase do trecho começando com um marcador de pergunta
  const sentences = t.split(/[.!;]\s*/).map((s) => s.trim()).filter(Boolean)
  return sentences.some((s) => QUESTION_STARTERS.some((q) => startsWithWord(s, q)))
}

function startsWithWord(s: string, prefix: string): boolean {
  if (!s.startsWith(prefix)) return false
  if (prefix.endsWith(' ') || s.length === prefix.length) return true
  return /[\s,:]/.test(s[prefix.length]) // "conte" não casa com "contexto"
}

/** Alucinações clássicas do Whisper quando recebe silêncio/ruído. */
const HALLUCINATIONS = [
  'obrigado', 'obrigada', 'obrigado.', 'tchau', 'legendas pela comunidade amara.org',
  'legenda adriana zanotto', 'thank you', 'thanks for watching', 'thank you for watching',
  'you', 'bye', 'inscreva-se', 'se inscreva no canal', 'e aí', 'hmm', 'ah', 'uh', 'um', '...', 'música'
]

export function cleanTranscript(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim()
  const n = normalize(t).replace(/[.!,…]+$/g, '').trim()
  if (!n) return ''
  if (HALLUCINATIONS.includes(n)) return ''
  if (/amara\.org|legendas? (pela|por)|subtitles by/i.test(t)) return ''
  if (/^\[.*\]$|^\(.*\)$/.test(t)) return '' // [Música], (risos)
  return t
}

/**
 * Pega a fala mais recente do interlocutor ("them"), juntando segmentos
 * consecutivos, para usar como pergunta.
 */
export function latestTheirTurn(transcript: TranscriptEntry[], maxGapMs = 20000): string {
  const parts: string[] = []
  let lastTs = Infinity
  for (let i = transcript.length - 1; i >= 0; i--) {
    const e = transcript[i]
    if (e.speaker !== 'them') {
      if (parts.length) break
      continue
    }
    if (lastTs - e.ts > maxGapMs && parts.length) break
    parts.unshift(e.text)
    lastTs = e.ts
  }
  return parts.join(' ').trim()
}

function words(text: string): Set<string> {
  return new Set(normalize(text).replace(/[^\p{L}\p{N}\s]/gu, '').split(' ').filter((w) => w.length > 2))
}

/**
 * Sem fone de ouvido o microfone capta a voz da call. Detecta se uma fala do
 * "você" é só o eco de algo que "eles" acabaram de dizer.
 */
export function isEcho(text: string, transcript: TranscriptEntry[], now: number, windowMs = 8000): boolean {
  const mine = words(text)
  if (mine.size < 2) return false
  return transcript.some((e) => {
    if (e.speaker !== 'them' || now - e.ts > windowMs) return false
    const theirs = words(e.text)
    let common = 0
    mine.forEach((w) => theirs.has(w) && common++)
    return common / mine.size >= 0.6
  })
}

/** Formata as últimas falas para o contexto do modelo, limitando tamanho. */
export function formatTranscript(transcript: TranscriptEntry[], maxChars = 4000, names = { them: 'Eles', you: 'Eu' }): string {
  const lines: string[] = []
  let total = 0
  for (let i = transcript.length - 1; i >= 0; i--) {
    const e = transcript[i]
    const line = `${names[e.speaker]}: ${e.text}`
    if (total + line.length > maxChars) break
    lines.unshift(line)
    total += line.length + 1
  }
  return lines.join('\n')
}
