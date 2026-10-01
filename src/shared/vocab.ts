import type { Profile } from './types'

/**
 * Vocabulário para o reconhecimento de voz. O Whisper escreve o que "ouve":
 * sem contexto, "Claude" vira "cloud" e "Anthropic" vira "Antropic".
 * Passar os termos certos no `prompt` da transcrição corrige a grafia.
 */
export const DEFAULT_VOCAB = [
  'Claude',
  'Claude Code',
  'Anthropic',
  'OpenAI',
  'ChatGPT',
  'GPT',
  'Gemini',
  'Copilot',
  'LLM',
  'API',
  'JavaScript',
  'TypeScript',
  'React',
  'Next.js',
  'Node.js',
  'Python',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'PostgreSQL',
  'MongoDB',
  'GitHub',
  'CI/CD',
  'front-end',
  'back-end',
  'full stack'
]

/** Erros de audição comuns e a grafia correta. */
const MISHEARINGS: [RegExp, string][] = [
  [/\bcloud[\s-]?code\b/gi, 'Claude Code'],
  [/\bcl[aá]udio[\s-]?code\b/gi, 'Claude Code'],
  [/\bcloud(?=\s+(?:da|do|de|from|by)\s+an?t?h?ropic)/gi, 'Claude'],
  [/\bcloud\s+(sonnet|opus|haiku)\b/gi, 'Claude $1'],
  [/\bclaud\b/gi, 'Claude'],
  [/\ban?tr[oó]pic[ao]?\b/gi, 'Anthropic'],
  [/\banthr[oó]pic[ao]?\b/gi, 'Anthropic'],
  [/\bchat\s?gpt\b/gi, 'ChatGPT'],
  [/\bopen\s?a\.?i\b/gi, 'OpenAI'],
  [/\btype\s?script\b/gi, 'TypeScript'],
  [/\bjava\s?script\b/gi, 'JavaScript'],
  [/\bnode\s?\.?\s?js\b/gi, 'Node.js'],
  [/\bnext\s?\.?\s?js\b/gi, 'Next.js'],
  [/\bgit\s?hub\b/gi, 'GitHub'],
  [/\bkubernet(?:i|e)s\b/gi, 'Kubernetes']
]

export function fixMishearings(text: string): string {
  return MISHEARINGS.reduce((t, [re, rep]) => t.replace(re, rep), text)
}

/** Divide o campo de vocabulário do usuário (vírgula, ponto e vírgula ou quebra de linha). */
export function parseVocab(raw: string): string[] {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1)
}

/**
 * Extrai nomes próprios e termos técnicos de um texto (currículo, vaga):
 * CamelCase, siglas, termos com ".js", "#", "+" ou dígitos, e palavras com
 * maiúscula que não estão no começo da frase.
 */
export function extractTerms(text: string, limit = 40): string[] {
  const out = new Map<string, number>()
  const re = /[\p{L}\p{N}][\p{L}\p{N}.#+/-]*[\p{L}\p{N}#+]/gu
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const w = m[0]
    const before = text.slice(Math.max(0, m.index - 3), m.index)
    const sentenceStart = m.index === 0 || /[.!?:\n•-]\s*$/.test(before)
    const technical =
      /[a-z][A-Z]/.test(w) || // CamelCase
      /^[A-Z]{2,6}s?$/.test(w) || // siglas
      /\.(js|ts|net|io)$|[#+]$|^[A-Za-z]+\d/i.test(w) // Node.js, C#, C++, S3
    const proper = /^\p{Lu}\p{Ll}+/u.test(w) && !sentenceStart && w.length > 2
    if (technical || proper) out.set(w, (out.get(w) ?? 0) + 1)
  }
  return [...out.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w)
}

/** Lista final de termos (do usuário, padrão e extraídos do perfil), sem repetição e em ordem de prioridade. */
export function buildVocabulary(profile: Profile): string[] {
  const seen = new Set<string>()
  const all = [
    ...parseVocab(profile.vocabulary ?? ''),
    ...DEFAULT_VOCAB,
    ...extractTerms(`${profile.resume}\n${profile.jobDescription}\n${profile.notes}`)
  ]
  return all.filter((t) => {
    const k = t.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Prompt da transcrição. O Whisper só considera o FINAL do prompt (~224 tokens),
 * então o vocabulário vai por último e o contexto da conversa (já corrigido) antes.
 */
export function buildSttPrompt(vocab: string[], recentText: string, maxChars = 700): string {
  let terms = `Termos: ${vocab.join(', ')}.`
  if (terms.length > maxChars - 80) terms = `Termos: ${vocab.join(', ').slice(0, maxChars - 90)}.`
  const room = maxChars - terms.length - 1
  const context = room > 40 ? fixMishearings(recentText).slice(-room) : ''
  return context ? `${context} ${terms}` : terms
}
