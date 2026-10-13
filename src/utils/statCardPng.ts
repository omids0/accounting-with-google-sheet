/** A shareable picture of headline numbers: a kicker, a title and up to six stats. */
export interface StatCardImage {
  kicker: string
  title: string
  stats: { label: string; value: string }[]
  footer?: string
}

const WIDTH = 1080
const PADDING = 72
const COLUMNS = 3
const ROW_HEIGHT = 200
const FONT = "'Vazirmatn', system-ui, sans-serif"

/** Canvas has no bidi isolate glyphs; the canvas is RTL already. */
function plain(text: string): string {
  return text.replace(/[⁦-⁩]/g, '')
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''

  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word

    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)

  return lines
}

/** Draws the card on a canvas (RTL, Vazirmatn) and resolves it as `image/png`. */
export async function renderStatCardPng(card: StatCardImage): Promise<Blob> {
  if (typeof document !== 'undefined' && document.fonts) await document.fonts.ready

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) throw new Error('ساخت تصویر ناموفق بود')

  const rows = Math.ceil(card.stats.length / COLUMNS)
  const inner = WIDTH - PADDING * 2

  ctx.font = `500 34px ${FONT}`

  const footer = card.footer ? wrapLines(ctx, plain(card.footer), inner) : []
  const height = PADDING * 2 + 170 + rows * ROW_HEIGHT + footer.length * 54

  canvas.width = WIDTH
  canvas.height = height

  const gradient = ctx.createLinearGradient(0, 0, WIDTH, height)

  gradient.addColorStop(0, '#0f766e')
  gradient.addColorStop(1, '#134e4a')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, height)

  ctx.direction = 'rtl'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.font = `500 34px ${FONT}`
  ctx.fillText(plain(card.kicker), WIDTH - PADDING, PADDING)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 76px ${FONT}`
  ctx.fillText(plain(card.title), WIDTH - PADDING, PADDING + 52)

  const columnWidth = inner / COLUMNS
  const top = PADDING + 170

  card.stats.forEach((stat, index) => {
    const x = WIDTH - PADDING - (index % COLUMNS) * columnWidth
    const y = top + Math.floor(index / COLUMNS) * ROW_HEIGHT

    ctx.fillStyle = '#ffffff'
    ctx.font = `800 54px ${FONT}`
    ctx.fillText(plain(stat.value), x, y, columnWidth - 24)
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = `500 32px ${FONT}`
    ctx.fillText(plain(stat.label), x, y + 76, columnWidth - 24)
  })

  ctx.fillStyle = '#ffffff'
  ctx.font = `500 34px ${FONT}`
  footer.forEach((line, index) => {
    ctx.fillText(line, WIDTH - PADDING, top + rows * ROW_HEIGHT + index * 54)
  })

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('ساخت تصویر ناموفق بود'))),
      'image/png'
    )
  })
}
