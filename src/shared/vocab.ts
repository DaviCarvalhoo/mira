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

/**
 * Referência rápida de ferramentas recentes que modelos com corte de
 * conhecimento antigo não conhecem (e acabam inventando). Só entra no prompt
 * quando o termo aparece na conversa.
 */
const KNOWN_TERMS: { match: RegExp; text: string }[] = [
  {
    match: /claude code/i,
    text:
      'Claude Code: agente de programação da Anthropic que roda no terminal (comando `claude`), também disponível em extensões de IDE (VS Code, JetBrains) e na web. ' +
      'Instalação: `npm install -g @anthropic-ai/claude-code` (nome exato do pacote); login com conta Claude ou chave da API da Anthropic. ' +
      'Ele lê o código do projeto, edita arquivos, executa comandos e testes e faz commits a partir de pedidos em linguagem natural. ' +
      'Personalização: arquivo CLAUDE.md com instruções do projeto, comandos de barra (slash commands), hooks, subagentes e servidores MCP para conectar ferramentas externas. ' +
      'Automação: modo não interativo `claude -p "tarefa"` para scripts e CI/CD (ex.: GitHub Actions), e o Claude Agent SDK para criar agentes próprios.'
  },
  {
    match: /\bmcp\b|model context protocol/i,
    text: 'MCP (Model Context Protocol): padrão aberto criado pela Anthropic para conectar modelos de IA a ferramentas e dados externos (APIs, bancos, arquivos) por meio de servidores MCP.'
  },
  {
    match: /\bclaude\b(?! code)/i,
    text: 'Claude: família de modelos de IA da Anthropic (Opus, Sonnet e Haiku), acessível pelo app claude.ai e pela API da Anthropic (SDKs oficiais em Python e TypeScript).'
  }
]

/** Definições dos termos citados no texto, para orientar o modelo. */
export function knownTermsFor(text: string): string[] {
  return KNOWN_TERMS.filter((k) => k.match.test(text)).map((k) => k.text)
}

/** Erros de audição comuns e a grafia correta. */
const MISHEARINGS: [RegExp, string][] = [
  // tudo grudado: "Claude Coddantropic", "Clodicudantropic"
  [/\bclaude\s+cod+e?\s?d?a?n?th?r[oó]pic\p{L}*/giu, 'Claude Code da Anthropic'],
  [/\bcl\p{L}*?d\p{L}*?c\p{L}*?d+e?\s?d?a?n?th?r[oó]pic\p{L}*/giu, 'Claude Code da Anthropic'],
  [/\b(?:da|do)n?th?r[oó]pic\p{L}*/giu, 'da Anthropic'],
  // "Code" com sotaque brasileiro vira "Couto", "Could", "Cold"...
  [/\b(?:claude|cloud|cl[aá]udio),?\s+(?:code|couto|could|cold|coud|codi|cod|c[oó]di?)\b/gi, 'Claude Code'],
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

/**
 * Remove a "gagueira" do Whisper: letras soltas repetidas ("C. C. C.")
 * e a letra solta antes da palavra que ela antecipa ("o C. Cloud").
 */
export function removeStutter(text: string): string {
  return text
    .replace(/(?:\b\p{L}\.\s*){2,}/gu, ' ')
    .replace(/\b(\p{L})\.\s+(?=\1\p{L})/giu, '')
    .replace(/^\s*\p{L}\.\s*$/u, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.?!])/g, '$1')
    .trim()
}

const LEAK_WORDS = /^(term|vocab|nomes?$|conversa|aparecem|como$|e$|de$|da$|do$)/

/**
 * Detecta quando o Whisper "papagaiou" o próprio prompt em vez de transcrever:
 * um trecho curto feito só de termos do vocabulário.
 */
export function isPromptEcho(text: string, vocab: string[]): boolean {
  // eco literal da frase do prompt
  if (/aparecem nomes como|^\s*termos?\s*:/i.test(text)) return true
  const vocabWords = new Set(
    vocab.flatMap((t) => t.toLowerCase().split(/[^\p{L}\p{N}]+/u)).filter((w) => w.length > 1)
  )
  const words = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
  if (!words.length || words.length > 6) return false
  const leaked = words.filter((w) => vocabWords.has(w) || LEAK_WORDS.test(w)).length
  return leaked / words.length >= 0.8
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
export function buildSttPrompt(vocab: string[], recentText: string, maxTerms = 18): string {
  // frase natural: em formato de lista ("Termos: a, b, c") o Whisper tende a repetir o prompt
  const terms = vocab.slice(0, maxTerms)
  const sentence = terms.length
    ? `Na conversa aparecem nomes como ${terms.slice(0, -1).join(', ')}${terms.length > 1 ? ' e ' : ''}${terms[terms.length - 1]}.`
    : ''
  const context = removeStutter(fixMishearings(recentText)).slice(-200)
  return [context, sentence].filter(Boolean).join(' ')
}
