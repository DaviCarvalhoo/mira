import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { HotkeyAction, MiraApi } from '@shared/api'
import type { LlmChunkEvent, LlmEndEvent, Settings } from '@shared/types'

function on<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_e: IpcRendererEvent, payload: T) => cb(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: MiraApi = {
  platform: process.platform,
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (s) => ipcRenderer.invoke('settings:set', s)
  },
  keys: {
    set: (provider, key) => ipcRenderer.invoke('keys:set', provider, key),
    status: () => ipcRenderer.invoke('keys:status')
  },
  llm: {
    stream: (req) => ipcRenderer.invoke('llm:stream', req),
    abort: (id) => ipcRenderer.invoke('llm:abort', id),
    onChunk: (cb) => on<LlmChunkEvent>('llm:chunk', cb),
    onEnd: (cb) => on<LlmEndEvent>('llm:end', cb),
    models: () => ipcRenderer.invoke('llm:models'),
    onModelSwitched: (cb) => on<{ from: string; to: string; settings: Settings }>('llm:model-switched', cb)
  },
  stt: {
    transcribe: (audio, prompt) => ipcRenderer.invoke('stt:transcribe', audio, prompt)
  },
  screen: {
    capture: () => ipcRenderer.invoke('screen:capture')
  },
  sessions: {
    list: () => ipcRenderer.invoke('sessions:list'),
    get: (id) => ipcRenderer.invoke('sessions:get', id),
    save: (s) => ipcRenderer.invoke('sessions:save', s),
    remove: (id) => ipcRenderer.invoke('sessions:remove', id)
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    setOpacity: (v) => ipcRenderer.send('window:opacity', v),
    setClickThrough: (on) => ipcRenderer.send('window:click-through', on),
    onClickThrough: (cb) => on<boolean>('click-through', cb)
  },
  onHotkey: (cb) => on<HotkeyAction>('hotkey', cb),
  openExternal: (url) => ipcRenderer.send('open-external', url)
}

contextBridge.exposeInMainWorld('mira', api)
