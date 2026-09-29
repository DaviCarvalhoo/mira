import {
  app,
  BrowserWindow,
  desktopCapturer,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  session,
  shell
} from 'electron'
import { join } from 'node:path'
import type { HotkeyAction } from '@shared/api'
import type { LlmProviderId, LlmRequest, Session, Settings } from '@shared/types'
import { abortLlm, streamLlm, transcribe } from './ai'
import {
  getSession,
  getSettings,
  keyStatus,
  listSessions,
  removeSession,
  saveSession,
  saveSettings,
  setKey
} from './store'

let win: BrowserWindow | null = null
let clickThrough = false

const iconPath = join(__dirname, '../../resources/icon.png')

function createWindow(): void {
  const { workArea } = screen.getPrimaryDisplay()
  const width = 440
  const height = Math.min(700, workArea.height - 40)
  const settings = getSettings()

  win = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + 24,
    minWidth: 360,
    minHeight: 420,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    show: false,
    title: 'Mira',
    icon: nativeImage.createFromPath(iconPath),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      backgroundThrottling: false // continua ouvindo mesmo sem foco
    }
  })

  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setOpacity(settings.opacity)
  win.once('ready-to-show', () => win?.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function sendHotkey(action: HotkeyAction): void {
  if (!win) return
  if (!win.isVisible()) win.showInactive()
  win.webContents.send('hotkey', action)
}

function setClickThrough(on: boolean): void {
  clickThrough = on
  win?.setIgnoreMouseEvents(on, { forward: true })
  win?.webContents.send('click-through', on)
}

function moveWindow(dx: number, dy: number): void {
  if (!win) return
  const [x, y] = win.getPosition()
  win.setPosition(x + dx, y + dy)
}

function registerShortcuts(): void {
  const map: Record<string, () => void> = {
    'CommandOrControl+Shift+Space': () => {
      if (!win) return
      if (win.isVisible()) win.hide()
      else win.showInactive()
    },
    'CommandOrControl+Shift+Enter': () => sendHotkey('answer'),
    'CommandOrControl+Shift+L': () => sendHotkey('toggle-listen'),
    'CommandOrControl+Shift+H': () => sendHotkey('screen'),
    'CommandOrControl+Shift+R': () => sendHotkey('recap'),
    'CommandOrControl+Shift+M': () => setClickThrough(!clickThrough),
    'CommandOrControl+Alt+Up': () => moveWindow(0, -40),
    'CommandOrControl+Alt+Down': () => moveWindow(0, 40),
    'CommandOrControl+Alt+Left': () => moveWindow(-40, 0),
    'CommandOrControl+Alt+Right': () => moveWindow(40, 0)
  }
  for (const [accel, fn] of Object.entries(map)) {
    if (!globalShortcut.register(accel, fn)) console.warn(`[mira] atalho ocupado: ${accel}`)
  }
}

/**
 * Captura de áudio do sistema (o que "eles" falam na call) via loopback.
 * O front chama getDisplayMedia e o Electron entrega a tela + áudio do sistema
 * sem abrir o seletor do navegador.
 */
function setupMediaCapture(): void {
  const ses = session.defaultSession
  ses.setDisplayMediaRequestHandler(
    (_req, callback) => {
      desktopCapturer
        .getSources({ types: ['screen'] })
        .then((sources) => callback({ video: sources[0], audio: 'loopback' }))
        .catch(() => callback({}))
    },
    { useSystemPicker: false }
  )
  ses.setPermissionRequestHandler((_wc, permission, cb) => {
    cb(['media', 'display-capture', 'clipboard-sanitized-write', 'clipboard-read'].includes(permission))
  })
  ses.setPermissionCheckHandler((_wc, permission) => ['media', 'display-capture'].includes(permission))
}

async function captureScreen(): Promise<string> {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const wasVisible = win?.isVisible() ?? false
  // esconde a própria Mira para ela não aparecer no print
  if (wasVisible) {
    win?.setOpacity(0)
    await new Promise((r) => setTimeout(r, 120))
  }
  try {
    const scale = Math.min(display.scaleFactor, 2)
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(display.size.width * scale),
        height: Math.round(display.size.height * scale)
      }
    })
    const src = sources.find((s) => s.display_id === String(display.id)) ?? sources[0]
    if (!src) throw new Error('Nenhuma tela encontrada para capturar.')
    let img = src.thumbnail
    if (img.getSize().width > 1920) img = img.resize({ width: 1920 })
    return `data:image/jpeg;base64,${img.toJPEG(82).toString('base64')}`
  } finally {
    if (wasVisible) win?.setOpacity(getSettings().opacity)
  }
}

function registerIpc(): void {
  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:set', (_e, s: Settings) => {
    const saved = saveSettings(s)
    win?.setOpacity(saved.opacity)
    return saved
  })

  ipcMain.handle('keys:set', (_e, provider: LlmProviderId, key: string) => setKey(provider, key))
  ipcMain.handle('keys:status', () => keyStatus())

  ipcMain.handle('llm:stream', async (e, req: LlmRequest) => {
    const sender = e.sender
    try {
      await streamLlm(getSettings(), req, (delta) => {
        if (!sender.isDestroyed()) sender.send('llm:chunk', { id: req.id, delta })
      })
      if (!sender.isDestroyed()) sender.send('llm:end', { id: req.id })
    } catch (err) {
      if (!sender.isDestroyed()) {
        sender.send('llm:end', { id: req.id, error: err instanceof Error ? err.message : String(err) })
      }
    }
  })
  ipcMain.handle('llm:abort', (_e, id: string) => abortLlm(id))

  ipcMain.handle('stt:transcribe', (_e, audio: ArrayBuffer, prompt?: string) => transcribe(getSettings(), audio, prompt))

  ipcMain.handle('screen:capture', () => captureScreen())

  ipcMain.handle('sessions:list', () => listSessions())
  ipcMain.handle('sessions:get', (_e, id: string) => getSession(id))
  ipcMain.handle('sessions:save', (_e, s: Session) => saveSession(s))
  ipcMain.handle('sessions:remove', (_e, id: string) => removeSession(id))

  ipcMain.on('window:minimize', () => win?.minimize())
  ipcMain.on('window:close', () => app.quit())
  ipcMain.on('window:opacity', (_e, v: number) => win?.setOpacity(Math.min(1, Math.max(0.3, v))))
  ipcMain.on('window:click-through', (_e, on: boolean) => setClickThrough(on))
  ipcMain.on('open-external', (_e, url: string) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
  })
}

// Uma instância só
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    win?.show()
    win?.focus()
  })

  app.whenReady().then(() => {
    app.setAppUserModelId('dev.mira.copilot')
    setupMediaCapture()
    registerIpc()
    createWindow()
    registerShortcuts()
  })

  app.on('will-quit', () => globalShortcut.unregisterAll())
  app.on('window-all-closed', () => app.quit())
}
