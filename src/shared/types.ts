export type LlmProviderId =
  | 'openai'
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'anthropic'
  | 'ollama'
  | 'lmstudio'
  | 'custom'

export type SttProviderId = 'groq' | 'openai' | 'custom'

export type Speaker = 'them' | 'you'

export type TemplateId = 'interview' | 'technical' | 'sales' | 'meeting'

export type AnswerLength = 'short' | 'medium' | 'detailed'

export interface Profile {
  name: string
  role: string
  resume: string
  jobDescription: string
  notes: string
  /** nomes e termos que a transcrição deve reconhecer */
  vocabulary: string
}

export interface Settings {
  llm: { provider: LlmProviderId; model: string; baseUrl: string }
  stt: { provider: SttProviderId; model: string; baseUrl: string; language: string }
  profile: Profile
  template: TemplateId
  answerLength: AnswerLength
  /** 'auto' = responde no idioma da pergunta */
  answerLanguage: string
  autoAnswer: boolean
  captureMic: boolean
  captureSystem: boolean
  opacity: number
  demoMode: boolean
  onboarded: boolean
}

export interface TranscriptEntry {
  id: string
  speaker: Speaker
  text: string
  ts: number
}

export type CardKind = 'answer' | 'screen' | 'recap' | 'chat'

export interface AnswerCard {
  id: string
  kind: CardKind
  question: string
  answer: string
  ts: number
  status: 'streaming' | 'done' | 'error'
  error?: string
}

export interface Session {
  id: string
  title: string
  startedAt: number
  endedAt: number
  template: TemplateId
  transcript: TranscriptEntry[]
  cards: AnswerCard[]
}

export interface SessionSummary {
  id: string
  title: string
  startedAt: number
  endedAt: number
  lines: number
  cards: number
}

export type ContentPart = { type: 'text'; text: string } | { type: 'image'; dataUrl: string }

export type ChatContent = string | ContentPart[]

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: ChatContent
}

export interface LlmRequest {
  id: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
}

export interface LlmChunkEvent {
  id: string
  delta: string
}

export interface LlmEndEvent {
  id: string
  error?: string
}

export interface TranscribeResult {
  text: string
  error?: string
}
