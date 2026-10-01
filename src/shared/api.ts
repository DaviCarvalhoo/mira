import type {
  LlmChunkEvent,
  LlmEndEvent,
  LlmProviderId,
  LlmRequest,
  Session,
  SessionSummary,
  Settings,
  TranscribeResult
} from './types'

export type HotkeyAction = 'answer' | 'toggle-listen' | 'screen' | 'recap'

export interface MiraApi {
  platform: string
  settings: {
    get(): Promise<Settings>
    set(settings: Settings): Promise<Settings>
  }
  keys: {
    set(provider: LlmProviderId, key: string): Promise<void>
    status(): Promise<Partial<Record<LlmProviderId, boolean>>>
  }
  llm: {
    stream(req: LlmRequest): Promise<void>
    abort(id: string): Promise<void>
    onChunk(cb: (e: LlmChunkEvent) => void): () => void
    onEnd(cb: (e: LlmEndEvent) => void): () => void
    /** modelos disponíveis na conta do provedor atual */
    models(): Promise<{ models: string[]; error?: string }>
    onModelSwitched(cb: (e: { from: string; to: string; settings: Settings }) => void): () => void
  }
  stt: {
    transcribe(audio: ArrayBuffer, prompt?: string): Promise<TranscribeResult>
  }
  screen: {
    capture(): Promise<string>
  }
  sessions: {
    list(): Promise<SessionSummary[]>
    get(id: string): Promise<Session | null>
    save(session: Session): Promise<void>
    remove(id: string): Promise<void>
  }
  window: {
    minimize(): void
    close(): void
    setOpacity(value: number): void
    setClickThrough(on: boolean): void
    onClickThrough(cb: (on: boolean) => void): () => void
  }
  onHotkey(cb: (action: HotkeyAction) => void): () => void
  openExternal(url: string): void
}
