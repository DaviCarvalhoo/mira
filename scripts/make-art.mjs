// Gera a identidade visual da Mira (logo, ícone e banner) como SVG.
// Uso: node scripts/make-art.mjs
import { mkdirSync, writeFileSync } from 'node:fs'

const C1 = '#8B5CF6' // violeta
const C2 = '#EC4899' // rosa
const C3 = '#22D3EE' // ciano
const BG = '#0A0A14'

const r = (n) => Math.round(n * 100) / 100

/** Íris feita de ondas sonoras: raios com alturas de uma "forma de onda". */
function irisRays(cx, cy, inner, maxLen, count, stroke) {
  const out = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2
    const wave = 0.35 + 0.65 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.55 + 1))
    const len = maxLen * wave
    const x1 = cx + Math.cos(a) * inner
    const y1 = cy + Math.sin(a) * inner
    const x2 = cx + Math.cos(a) * (inner + len)
    const y2 = cy + Math.sin(a) * (inner + len)
    out.push(`<line x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}" stroke-width="${stroke}" stroke-linecap="round"/>`)
  }
  return out.join('')
}

/** Faísca de 4 pontas (símbolo de IA). */
function sparkle(cx, cy, s) {
  const k = s * 0.22
  return `M ${cx} ${cy - s} C ${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + s} ${cy} C ${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + s} C ${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - s} ${cy} C ${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - s} Z`
}

function defs(id) {
  return `
    <linearGradient id="${id}-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${C1}"/>
      <stop offset="0.55" stop-color="${C2}"/>
      <stop offset="1" stop-color="${C3}"/>
    </linearGradient>
    <linearGradient id="${id}-g2" gradientUnits="userSpaceOnUse" x1="356" y1="156" x2="156" y2="356">
      <stop offset="0" stop-color="${C3}"/>
      <stop offset="1" stop-color="${C1}"/>
    </linearGradient>
    <radialGradient id="${id}-bg" cx="0.5" cy="0.38" r="0.75">
      <stop offset="0" stop-color="#1E1636"/>
      <stop offset="1" stop-color="${BG}"/>
    </radialGradient>
    <radialGradient id="${id}-glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C2}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${C2}" stop-opacity="0"/>
    </radialGradient>
    <filter id="${id}-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>`
}

/** Marca da Mira desenhada num quadrado de 512. */
function mark(id, { bg = true } = {}) {
  const cx = 256
  const cy = 256
  return `
  ${bg ? `<rect x="16" y="16" width="480" height="480" rx="120" fill="url(#${id}-bg)"/>
  <rect x="16.5" y="16.5" width="479" height="479" rx="119.5" fill="none" stroke="url(#${id}-g)" stroke-opacity="0.45"/>` : ''}
  <circle cx="${cx}" cy="${cy}" r="150" fill="url(#${id}-glow)"/>
  <!-- contorno do olho -->
  <path d="M 64 256 C 140 128 372 128 448 256 C 372 384 140 384 64 256 Z" fill="none" stroke="url(#${id}-g)" stroke-width="18" stroke-linejoin="round"/>
  <!-- íris de ondas sonoras -->
  <g stroke="url(#${id}-g2)" opacity="0.95">${irisRays(cx, cy, 52, 44, 36, 7)}</g>
  <circle cx="${cx}" cy="${cy}" r="44" fill="${BG}" stroke="url(#${id}-g)" stroke-width="6"/>
  <!-- pupila: faísca de IA -->
  <path d="${sparkle(cx, cy, 30)}" fill="#fff" filter="url(#${id}-blur)" opacity="0.8"/>
  <path d="${sparkle(cx, cy, 30)}" fill="#fff"/>
  <circle cx="${cx + 58}" cy="${cy - 58}" r="7" fill="#fff" opacity="0.9"/>`
}

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>${defs('m')}</defs>${mark('m')}
</svg>
`

const logoBare = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="40 100 432 312">
  <defs>${defs('b')}</defs>${mark('b', { bg: false })}
</svg>
`

// Banner 1280x640 para o README
function bubble(x, y, w, who, text, color) {
  return `
  <g transform="translate(${x} ${y})">
    <rect width="${w}" height="54" rx="14" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.08"/>
    <circle cx="22" cy="27" r="5" fill="${color}"/>
    <text x="36" y="23" font-size="12" font-weight="700" fill="${color}" letter-spacing="1.5">${who}</text>
    <text x="36" y="42" font-size="15" fill="#E7E5F4">${text}</text>
  </g>`
}

const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" width="1280" height="640" font-family="Inter, 'Segoe UI', system-ui, sans-serif">
  <defs>
    ${defs('k')}
    <radialGradient id="bgA" cx="0.15" cy="0.2" r="0.7">
      <stop offset="0" stop-color="${C1}" stop-opacity="0.35"/><stop offset="1" stop-color="${C1}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bgB" cx="0.95" cy="0.95" r="0.6">
      <stop offset="0" stop-color="${C3}" stop-opacity="0.25"/><stop offset="1" stop-color="${C3}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" stroke-opacity="0.035"/>
    </pattern>
    <linearGradient id="panel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1A1530" stop-opacity="0.92"/><stop offset="1" stop-color="#0E0C1C" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="640" fill="${BG}"/>
  <rect width="1280" height="640" fill="url(#grid)"/>
  <rect width="1280" height="640" fill="url(#bgA)"/>
  <rect width="1280" height="640" fill="url(#bgB)"/>

  <g transform="translate(84 96) scale(0.3)">${mark('k')}</g>
  <text x="88" y="380" font-size="112" font-weight="800" fill="#fff" letter-spacing="-4">Mira</text>
  <text x="92" y="428" font-size="26" fill="#C9C4E6">Seu copiloto de IA para respostas ao vivo.</text>
  <text x="92" y="462" font-size="20" fill="#8C86AD">Ouve a call · entende a pergunta · sussurra a resposta.</text>
  <g font-size="15" font-weight="600">
    <rect x="92" y="498" width="132" height="36" rx="18" fill="${C1}" fill-opacity="0.18" stroke="${C1}" stroke-opacity="0.5"/>
    <text x="158" y="521" text-anchor="middle" fill="#DDD6FE">Tempo real</text>
    <rect x="236" y="498" width="160" height="36" rx="18" fill="${C2}" fill-opacity="0.16" stroke="${C2}" stroke-opacity="0.5"/>
    <text x="316" y="521" text-anchor="middle" fill="#FBCFE8">Multi-provedor</text>
    <rect x="408" y="498" width="142" height="36" rx="18" fill="${C3}" fill-opacity="0.14" stroke="${C3}" stroke-opacity="0.5"/>
    <text x="479" y="521" text-anchor="middle" fill="#CFFAFE">App nativo</text>
  </g>

  <!-- mockup do overlay -->
  <g transform="translate(700 70)">
    <rect x="-6" y="-6" width="492" height="512" rx="30" fill="url(#k-g)" opacity="0.25" filter="url(#k-blur)"/>
    <rect width="480" height="500" rx="24" fill="url(#panel)" stroke="url(#k-g)" stroke-opacity="0.6"/>
    <g transform="translate(22 18) scale(0.07)">${mark('k', { bg: false })}</g>
    <text x="64" y="40" font-size="17" font-weight="800" fill="#fff">Mira</text>
    <circle cx="380" cy="34" r="5" fill="#F43F5E"/>
    <text x="392" y="39" font-size="13" fill="#FDA4AF" font-weight="600">Ouvindo</text>
    <g stroke="#EC4899" stroke-width="3" stroke-linecap="round">
      ${Array.from({ length: 40 }, (_, i) => {
        const h = 4 + Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37)) * 18
        const col = ["#8B5CF6", "#EC4899", "#22D3EE"][Math.floor((i / 40) * 3)]
        return `<line stroke="${col}" x1="${22 + i * 11}" y1="${78 - h / 2}" x2="${22 + i * 11}" y2="${78 + h / 2}"/>`
      }).join('')}
    </g>
    ${bubble(20, 104, 440, 'ELES', 'Me fala de um desafio técnico que você resolveu?', '#F9A8D4')}
    ${bubble(20, 166, 440, 'VOCÊ', 'Claro! No meu último projeto…', '#67E8F9')}
    <rect x="20" y="236" width="440" height="244" rx="16" fill="${C1}" fill-opacity="0.1" stroke="url(#k-g)" stroke-opacity="0.7"/>
    <path d="${sparkle(44, 262, 9)}" fill="#fff"/>
    <text x="62" y="267" font-size="12" font-weight="700" fill="#DDD6FE" letter-spacing="1.5">RESPOSTA SUGERIDA</text>
    <text x="40" y="302" font-size="16" font-weight="700" fill="#fff">Reduzi o tempo de carregamento do app em 60%</text>
    <text x="40" y="324" font-size="16" font-weight="700" fill="#fff">migrando a renderização para o servidor.</text>
    <g font-size="15" fill="#C9C4E6">
      <circle cx="46" cy="357" r="3" fill="${C3}"/><text x="58" y="362">Situação: páginas lentas e queda de conversão</text>
      <circle cx="46" cy="387" r="3" fill="${C3}"/><text x="58" y="392">Ação: SSR + cache na borda + code splitting</text>
      <circle cx="46" cy="417" r="3" fill="${C3}"/><text x="58" y="422">Resultado: LCP 4.1s → 1.6s e +18% conversão</text>
    </g>
    <rect x="40" y="440" width="140" height="4" rx="2" fill="url(#k-g)"/>
  </g>
</svg>
`

mkdirSync('resources', { recursive: true })
mkdirSync('docs', { recursive: true })
mkdirSync('src/renderer/src/assets', { recursive: true })
writeFileSync('resources/logo.svg', logo)
writeFileSync('src/renderer/src/assets/logo.svg', logoBare)
writeFileSync('docs/banner.svg', banner)
console.log('arte gerada: resources/logo.svg, docs/banner.svg, src/renderer/src/assets/logo.svg')
