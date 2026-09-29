import type { AnswerLength, ChatMessage, Settings, TemplateId, TranscriptEntry } from './types'
import { formatTranscript } from './question'

export interface TemplateInfo {
  id: TemplateId
  label: string
  emoji: string
  description: string
  instructions: string
}

export const TEMPLATES: Record<TemplateId, TemplateInfo> = {
  interview: {
    id: 'interview',
    label: 'Entrevista de emprego',
    emoji: '💼',
    description: 'Respostas em primeira pessoa, usando seu currículo e a vaga.',
    instructions: [
      'Você está ajudando o usuário durante uma entrevista de emprego ao vivo.',
      'Escreva a resposta como se fosse o próprio usuário falando, em primeira pessoa, natural e confiante.',
      'Use experiências reais do currículo quando fizer sentido. Nunca invente empresas, cargos ou números que não estejam no contexto; se faltar informação, sugira uma estrutura que o usuário possa completar.',
      'Para perguntas comportamentais use STAR (Situação, Tarefa, Ação, Resultado) de forma enxuta.',
      'Conecte a resposta com os requisitos da vaga quando houver descrição da vaga.'
    ].join('\n')
  },
  technical: {
    id: 'technical',
    label: 'Entrevista técnica',
    emoji: '🧠',
    description: 'Conceitos, trade-offs, system design e código.',
    instructions: [
      'Você está ajudando o usuário em uma entrevista técnica ao vivo (programação, arquitetura, system design).',
      'Comece com a ideia central em uma frase, depois os pontos-chave e trade-offs.',
      'Se pedirem código, entregue uma solução limpa e comentada no bloco de código, com a complexidade de tempo e espaço.',
      'Mostre raciocínio que o usuário possa explicar em voz alta.'
    ].join('\n')
  },
  sales: {
    id: 'sales',
    label: 'Vendas / cliente',
    emoji: '🤝',
    description: 'Objeções, perguntas de produto e próximos passos.',
    instructions: [
      'Você está ajudando o usuário em uma call de vendas ou atendimento a cliente.',
      'Responda objeções com empatia, foque em valor e termine sugerindo um próximo passo claro.',
      'Use as notas e materiais do contexto como fonte de verdade sobre o produto.'
    ].join('\n')
  },
  meeting: {
    id: 'meeting',
    label: 'Reunião',
    emoji: '🗓️',
    description: 'Respostas rápidas, dados e sugestões durante reuniões.',
    instructions: [
      'Você está ajudando o usuário durante uma reunião de trabalho.',
      'Responda perguntas direcionadas a ele de forma objetiva, sugira pontos para contribuir e sinalize decisões ou pendências.'
    ].join('\n')
  }
}

const LENGTH_RULES: Record<AnswerLength, string> = {
  short: 'Seja curto: 1 frase de abertura + no máximo 3 tópicos curtos. O usuário vai ler em 5 segundos.',
  medium: 'Tamanho médio: 1 frase de abertura + até 5 tópicos.',
  detailed: 'Pode detalhar, mas mantenha a estrutura escaneável com tópicos e negrito.'
}

function languageRule(lang: string): string {
  if (!lang || lang === 'auto') return 'Responda no mesmo idioma da pergunta.'
  return `Responda sempre em ${lang}.`
}

export function buildSystemPrompt(settings: Settings): string {
  const t = TEMPLATES[settings.template] ?? TEMPLATES.interview
  const p = settings.profile
  const ctx: string[] = []
  if (p.name) ctx.push(`Nome do usuário: ${p.name}`)
  if (p.role) ctx.push(`Cargo / objetivo: ${p.role}`)
  if (p.resume.trim()) ctx.push(`## Currículo do usuário\n${p.resume.trim()}`)
  if (p.jobDescription.trim()) ctx.push(`## Descrição da vaga / contexto da reunião\n${p.jobDescription.trim()}`)
  if (p.notes.trim()) ctx.push(`## Notas extras\n${p.notes.trim()}`)

  return [
    'Você é a Mira, uma copiloto de reuniões em tempo real. Você lê a transcrição ao vivo e sugere o que o usuário deve responder.',
    t.instructions,
    '',
    'Regras de formato:',
    '- A primeira linha é a resposta direta, pronta para ser falada, em **negrito**.',
    '- Depois, tópicos curtos com "- " para apoiar a fala.',
    '- Sem introduções como "Claro!" ou "Ótima pergunta". Sem repetir a pergunta.',
    `- ${LENGTH_RULES[settings.answerLength]}`,
    `- ${languageRule(settings.answerLanguage)}`,
    '- A transcrição vem de reconhecimento de voz e pode ter erros; interprete a intenção.',
    ctx.length ? `\n# Contexto do usuário\n${ctx.join('\n\n')}` : ''
  ]
    .join('\n')
    .trim()
}

export function buildAnswerMessages(settings: Settings, transcript: TranscriptEntry[], question: string): ChatMessage[] {
  const convo = formatTranscript(transcript, 5000, { them: 'Entrevistador/Outros', you: 'Eu (usuário)' })
  return [
    { role: 'system', content: buildSystemPrompt(settings) },
    {
      role: 'user',
      content: [
        convo ? `Transcrição recente:\n"""\n${convo}\n"""` : '',
        `Pergunta a responder agora: "${question}"`,
        'Escreva o que eu devo responder.'
      ]
        .filter(Boolean)
        .join('\n\n')
    }
  ]
}

export function buildChatMessages(settings: Settings, transcript: TranscriptEntry[], prompt: string): ChatMessage[] {
  const convo = formatTranscript(transcript, 5000, { them: 'Outros', you: 'Eu' })
  return [
    { role: 'system', content: buildSystemPrompt(settings) },
    {
      role: 'user',
      content: [convo ? `Transcrição recente:\n"""\n${convo}\n"""` : '', prompt].filter(Boolean).join('\n\n')
    }
  ]
}

export function buildScreenMessages(settings: Settings, transcript: TranscriptEntry[], dataUrl: string): ChatMessage[] {
  const convo = formatTranscript(transcript, 2500, { them: 'Outros', you: 'Eu' })
  return [
    { role: 'system', content: buildSystemPrompt(settings) },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: [
            'Esta é uma captura da minha tela agora. Identifique a pergunta, exercício ou problema visível e me ajude a responder.',
            'Se for código/desafio, entregue a solução e explique a abordagem em tópicos.',
            convo ? `\nContexto da conversa:\n${convo}` : ''
          ].join('\n')
        },
        { type: 'image', dataUrl }
      ]
    }
  ]
}

export function buildRecapMessages(settings: Settings, transcript: TranscriptEntry[]): ChatMessage[] {
  const convo = formatTranscript(transcript, 12000, { them: 'Outros', you: 'Eu' })
  return [
    {
      role: 'system',
      content: `Você é a Mira. Resuma reuniões de forma clara e útil. ${languageRule(settings.answerLanguage)}`
    },
    {
      role: 'user',
      content: [
        `Transcrição:\n"""\n${convo || '(vazia)'}\n"""`,
        'Gere: **Resumo** (3 linhas), **Pontos principais**, **Perguntas feitas**, **Próximos passos / pendências**. Use tópicos.'
      ].join('\n\n')
    }
  ]
}

export function buildTitleMessages(transcript: TranscriptEntry[]): ChatMessage[] {
  return [
    { role: 'system', content: 'Crie um título curto (máx. 6 palavras) para esta conversa. Responda só com o título, sem aspas.' },
    { role: 'user', content: formatTranscript(transcript, 3000) || 'Sessão vazia' }
  ]
}
