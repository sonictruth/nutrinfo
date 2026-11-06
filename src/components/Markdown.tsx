import { Fragment, type ReactNode } from 'react'

/**
 * Minimal Markdown renderer: headings, bold, italic, inline code, bullet and
 * numbered lists, blockquotes, horizontal rules and paragraphs.
 *
 * It builds React elements rather than HTML — model output is never passed to
 * dangerouslySetInnerHTML.
 */

const INLINE_TOKEN = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|`[^`\n]+`)/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let i = 0
  for (const part of text.split(INLINE_TOKEN)) {
    if (!part) continue
    const key = `${keyPrefix}-${i++}`
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>)
    } else if (part.length > 4 && part.startsWith('__') && part.endsWith('__')) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>)
    } else if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
      nodes.push(<em key={key}>{part.slice(1, -1)}</em>)
    } else if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      nodes.push(<code key={key}>{part.slice(1, -1)}</code>)
    } else {
      nodes.push(<Fragment key={key}>{part}</Fragment>)
    }
  }
  return nodes
}

/** Inline render plus hard line breaks for multi-line blocks. */
function renderLines(lines: string[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  lines.forEach((line, idx) => {
    if (idx > 0) out.push(<br key={`${keyPrefix}-br-${idx}`} />)
    out.push(...renderInline(line, `${keyPrefix}-l${idx}`))
  })
  return out
}

type Block =
  | { kind: 'heading'; level: number; lines: string[] }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'quote'; lines: string[] }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'hr' }

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (/^\s{0,3}(?:[-*_]\s*){3,}$/.test(line)) {
      blocks.push({ kind: 'hr' })
      i++
      continue
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({
        kind: 'heading',
        level: heading[1].length,
        lines: [heading[2].trim()],
      })
      i++
      continue
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^\s{0,3}>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s{0,3}>\s?/, ''))
        i++
      }
      blocks.push({ kind: 'quote', lines: quote })
      continue
    }

    if (/^\s{0,3}[-*+]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s{0,3}[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s{0,3}[-*+]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ul', items })
      continue
    }

    if (/^\s{0,3}\d+[.)]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s{0,3}\d+[.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s{0,3}\d+[.)]\s+/, ''))
        i++
      }
      blocks.push({ kind: 'ol', items })
      continue
    }

    const paragraph: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^\s{0,3}(#{1,6})\s+/.test(lines[i]) &&
      !/^\s{0,3}[-*+]\s+/.test(lines[i]) &&
      !/^\s{0,3}\d+[.)]\s+/.test(lines[i]) &&
      !/^\s{0,3}>\s?/.test(lines[i]) &&
      !/^\s{0,3}(?:[-*_]\s*){3,}$/.test(lines[i])
    ) {
      paragraph.push(lines[i])
      i++
    }
    blocks.push({ kind: 'paragraph', lines: paragraph })
  }

  return blocks
}

export function Markdown({ text }: { text: string }) {
  const blocks = parseBlocks(text)

  return (
    <div className="markdown">
      {blocks.map((block, idx) => {
        const key = `b${idx}`
        switch (block.kind) {
          case 'hr':
            return <hr key={key} />
          case 'heading': {
            const Tag = `h${Math.min(block.level + 1, 6)}` as 'h2'
            return <Tag key={key}>{renderLines(block.lines, key)}</Tag>
          }
          case 'quote':
            return (
              <blockquote key={key}>
                <p>{renderLines(block.lines, key)}</p>
              </blockquote>
            )
          case 'ul':
            return (
              <ul key={key}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={key}>
                {block.items.map((item, j) => (
                  <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
                ))}
              </ol>
            )
          case 'paragraph':
          default:
            return <p key={key}>{renderLines(block.lines, key)}</p>
        }
      })}
    </div>
  )
}
