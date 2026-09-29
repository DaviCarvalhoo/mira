import type { LlmProviderId, Settings, SttProviderId } from './types'

export interface LlmProviderInfo {
  id: LlmProviderId
  label: string
  kind: 'openai' | 'anthropic'
  baseUrl: string
  defaultModel: string
  models: string[]
  needsKey: boolean
  keyUrl?: string
}

export const LLM_PROVIDERS: Record<LlmProviderId, LlmProviderInfo> = {
  groq: {
    id: 'groq',
    label: 'Groq (rápido, tem plano grátis)',
    kind: 'openai',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
    needsKey: true,
    keyUrl: 'https://console.groq.com/keys'
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    models: ['gpt-4.1-mini', 'gpt-4.1', 'gpt-4o-mini', 'gpt-4o'],
    needsKey: true,
    keyUrl: 'https://platform.openai.com/api-keys'
  },
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    models: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-lite'],
    needsKey: true,
    keyUrl: 'https://aistudio.google.com/apikey'
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    defaultModel: 'claude-haiku-4-5-20251001',
    models: ['claude-haiku-4-5-20251001', 'claude-sonnet-5-5', 'claude-opus-5-5'],
    needsKey: true,
    keyUrl: 'https://console.anthropic.com/settings/keys'
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4.1-mini',
    models: ['openai/gpt-4.1-mini', 'anthropic/claude-haiku-4.5', 'google/gemini-2.5-flash'],
    needsKey: true,
    keyUrl: 'https://openrouter.ai/keys'
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local, offline)',
    kind: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.2',
    models: ['llama3.2', 'qwen2.5', 'mistral'],
    needsKey: false
  },
  lmstudio: {
    id: 'lmstudio',
    label: 'LM Studio (local, offline)',
    kind: 'openai',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    models: ['local-model'],
    needsKey: false
  },
  custom: {
    id: 'custom',
    label: 'Custom (compatível com OpenAI)',
    kind: 'openai',
    baseUrl: 'http://localhost:8000/v1',
    defaultModel: 'model',
    models: [],
    needsKey: false
  }
}

export interface SttProviderInfo {
  id: SttProviderId
  label: string
  baseUrl: string
  defaultModel: string
  models: string[]
  /** chave de API reaproveitada do provedor de LLM com este id */
  keyFrom: LlmProviderId
}

export const STT_PROVIDERS: Record<SttProviderId, SttProviderInfo> = {
  groq: {
    id: 'groq',
    label: 'Groq Whisper (recomendado)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'whisper-large-v3-turbo',
    models: ['whisper-large-v3-turbo', 'whisper-large-v3'],
    keyFrom: 'groq'
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini-transcribe',
    models: ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'],
    keyFrom: 'openai'
  },
  custom: {
    id: 'custom',
    label: 'Custom (whisper local / compatível)',
    baseUrl: 'http://localhost:8000/v1',
    defaultModel: 'whisper-1',
    models: [],
    keyFrom: 'custom'
  }
}

export const DEFAULT_SETTINGS: Settings = {
  llm: { provider: 'groq', model: LLM_PROVIDERS.groq.defaultModel, baseUrl: LLM_PROVIDERS.groq.baseUrl },
  stt: {
    provider: 'groq',
    model: STT_PROVIDERS.groq.defaultModel,
    baseUrl: STT_PROVIDERS.groq.baseUrl,
    language: 'pt'
  },
  profile: { name: '', role: '', resume: '', jobDescription: '', notes: '' },
  template: 'interview',
  answerLength: 'short',
  answerLanguage: 'auto',
  autoAnswer: true,
  captureMic: true,
  captureSystem: true,
  opacity: 0.96,
  demoMode: false,
  onboarded: false
}

/** Mescla configurações salvas com os padrões (tolerante a versões antigas). */
export function mergeSettings(saved: Partial<Settings> | null | undefined): Settings {
  const s = saved ?? {}
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    llm: { ...DEFAULT_SETTINGS.llm, ...(s.llm ?? {}) },
    stt: { ...DEFAULT_SETTINGS.stt, ...(s.stt ?? {}) },
    profile: { ...DEFAULT_SETTINGS.profile, ...(s.profile ?? {}) }
  }
}
