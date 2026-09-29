// Renderiza SVG -> PNG usando o próprio Chromium do Electron.
// Uso: npx electron scripts/render-icons.cjs
const { app, BrowserWindow } = require('electron')
const { readFileSync, writeFileSync, mkdirSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const { resolve, join } = require('node:path')

const jobs = [
  { src: 'resources/logo.svg', out: ['resources/icon.png', 'build/icon.png'], w: 512, h: 512 },
  { src: 'docs/banner.svg', out: ['docs/banner.png'], w: 1280, h: 640 }
]

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  mkdirSync('build', { recursive: true })
  // uma única janela reaproveitada (a segunda janela offscreen falha no Windows)
  const win = new BrowserWindow({
    width: 1280,
    height: 640,
    show: false,
    transparent: true,
    frame: false,
    webPreferences: { offscreen: true }
  })
  for (const job of jobs) {
    const svg = readFileSync(resolve(job.src), 'utf8')
    const html = `<html><head><meta charset="utf-8"></head><body style="margin:0;background:transparent;overflow:hidden">${svg.replace(
      '<svg ',
      `<svg style="display:block;width:${job.w}px;height:${job.h}px" `
    )}</body></html>`
    const tmp = join(tmpdir(), `mira-render-${Date.now()}.html`)
    writeFileSync(tmp, html)
    await win.loadFile(tmp)
    rmSync(tmp, { force: true })
    await new Promise((r) => setTimeout(r, 400))
    const img = await win.webContents.capturePage({ x: 0, y: 0, width: job.w, height: job.h })
    const png = img.resize({ width: job.w, height: job.h }).toPNG()
    for (const out of job.out) writeFileSync(resolve(out), png)
    console.log('ok', job.out.join(', '))
  }
  win.destroy()
  app.quit()
})
