import { Fragment, type ReactNode } from 'react'

/**
 * Renderizador de markdown enxuto e seguro (sem innerHTML):
 * títulos, listas, negrito, itálico, código inline e blocos de código.
 * Tolera texto incompleto durante o streaming.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r/g, '').split('\n')
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    const fence = /^\s*```(\w*)/.exec(line)
    if (fence) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i++])
      i++ // fecha o bloco (ou fim do texto em streaming)
      blocks.push(
        <pre key={key++} className="md-code" data-lang={fence[1] || undefined}>
          <code>{code.join('\n')}</code>
        </pre>
      )
      continue
    }

    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line)
      const items: string[] = []
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*([-*•]|\d+[.)])\s+/, ''))
        i++
      }
      const ListTag = ordered ? 'ol' : 'ul'
      blocks.push(
        <ListTag key={key++} className="md-list">
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ListTag>
      )
      continue
    }

    const heading = /^\s*#{1,6}\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push(
        <p key={key++} className="md-h">
          {inline(heading[1])}
        </p>
      )
      i++
      continue
    }

    if (line.trim()) {
      blocks.push(
        <p key={key++} className="md-p">
          {inline(line)}
        </p>
      )
    }
    i++
  }
  return <div className="md">{blocks}</div>
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>)
    const tok = m[0]
    if (tok.startsWith('`')) out.push(<code key={k++}>{tok.slice(1, -1)}</code>)
    else if (tok.startsWith('**') || tok.startsWith('__')) out.push(<strong key={k++}>{inline(tok.slice(2, -2))}</strong>)
    else out.push(<em key={k++}>{inline(tok.slice(1, -1))}</em>)
    last = m.index + tok.length
  }
  // negrito ainda aberto durante o streaming
  const rest = text.slice(last)
  const open = rest.indexOf('**')
  if (open !== -1) {
    if (open > 0) out.push(<Fragment key={k++}>{rest.slice(0, open)}</Fragment>)
    out.push(<strong key={k++}>{inline(rest.slice(open + 2))}</strong>)
  } else if (rest) {
    out.push(<Fragment key={k++}>{rest}</Fragment>)
  }
  return out
}
