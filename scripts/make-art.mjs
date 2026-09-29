// Gera o ícone da Mira (SVG). O banner é um HTML em scripts/art/banner.html.
// Uso: npm run art
import { mkdirSync, writeFileSync } from 'node:fs'

const SIGNAL = '#FF5A1F' // laranja "sinal": a luz de gravando
const INK = '#F5F5F4'

/** Marca: um retículo de mira — anel fino, quatro marcas e o ponto de sinal no centro. */
function mark({ bg }) {
  const c = 256
  const r = 124
  const ticks = [
    [c, c - r - 22, c, c - r + 22],
    [c, c + r - 22, c, c + r + 22],
    [c - r - 22, c, c - r + 22, c],
    [c + r - 22, c, c + r + 22, c]
  ]
  const base = bg
    ? `<defs>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#171717"/><stop offset="1" stop-color="#050505"/>
    </linearGradient>
  </defs>
  <rect x="8" y="8" width="496" height="496" rx="116" fill="url(#base)"/>
  <rect x="8.75" y="8.75" width="494.5" height="494.5" rx="115.25" fill="none" stroke="#ffffff" stroke-opacity="0.09" stroke-width="1.5"/>`
    : ''
  return `
  ${base}
  <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${INK}" stroke-width="12"/>
  <g stroke="${INK}" stroke-width="12" stroke-linecap="round">
    ${ticks.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('')}
  </g>
  <circle cx="${c}" cy="${c}" r="38" fill="${SIGNAL}"/>`
}

const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${mark({ bg: true })}
</svg>
`
const glyph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 40 432 432">${mark({ bg: false })}
</svg>
`

mkdirSync('resources', { recursive: true })
mkdirSync('src/renderer/src/assets', { recursive: true })
writeFileSync('resources/logo.svg', icon)
writeFileSync('src/renderer/src/assets/mark.svg', glyph)
console.log('ok: resources/logo.svg, src/renderer/src/assets/mark.svg')
