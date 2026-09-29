import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { mergeSettings } from '@shared/providers'
import type { LlmProviderId, Session, SessionSummary, Settings } from '@shared/types'

const dir = () => app.getPath('userData')
const settingsFile = () => join(dir(), 'settings.json')
const keysFile = () => join(dir(), 'keys.json')
const sessionsDir = () => {
  const d = join(dir(), 'sessions')
  if (!existsSync(d)) mkdirSync(d, { recursive: true })
  return d
}

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJson(file: string, data: unknown): void {
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

export function getSettings(): Settings {
  return mergeSettings(readJson<Partial<Settings>>(settingsFile(), {}))
}

export function saveSettings(settings: Settings): Settings {
  const merged = mergeSettings(settings)
  writeJson(settingsFile(), merged)
  return merged
}

/** Chaves de API ficam criptografadas com o cofre do sistema (DPAPI no Windows, Keychain no macOS). */
type KeyFile = Partial<Record<LlmProviderId, { enc: boolean; value: string }>>

export function setKey(provider: LlmProviderId, key: string): void {
  const keys = readJson<KeyFile>(keysFile(), {})
  const trimmed = key.trim()
  if (!trimmed) {
    delete keys[provider]
  } else if (safeStorage.isEncryptionAvailable()) {
    keys[provider] = { enc: true, value: safeStorage.encryptString(trimmed).toString('base64') }
  } else {
    keys[provider] = { enc: false, value: trimmed }
  }
  writeJson(keysFile(), keys)
}

export function getKey(provider: LlmProviderId): string {
  const entry = readJson<KeyFile>(keysFile(), {})[provider]
  if (!entry) return ''
  try {
    return entry.enc ? safeStorage.decryptString(Buffer.from(entry.value, 'base64')) : entry.value
  } catch {
    return ''
  }
}

export function keyStatus(): Partial<Record<LlmProviderId, boolean>> {
  const keys = readJson<KeyFile>(keysFile(), {})
  return Object.fromEntries(Object.keys(keys).map((k) => [k, true]))
}

const safeId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '')

export function saveSession(session: Session): void {
  writeJson(join(sessionsDir(), `${safeId(session.id)}.json`), session)
}

export function getSession(id: string): Session | null {
  return readJson<Session | null>(join(sessionsDir(), `${safeId(id)}.json`), null)
}

export function removeSession(id: string): void {
  rmSync(join(sessionsDir(), `${safeId(id)}.json`), { force: true })
}

export function listSessions(): SessionSummary[] {
  return readdirSync(sessionsDir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson<Session | null>(join(sessionsDir(), f), null))
    .filter((s): s is Session => !!s)
    .map((s) => ({
      id: s.id,
      title: s.title,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      lines: s.transcript.length,
      cards: s.cards.length
    }))
    .sort((a, b) => b.startedAt - a.startedAt)
}
