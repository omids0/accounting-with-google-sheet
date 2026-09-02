import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const A4_WIDTH_MM = 210

const A4_HEIGHT_MM = 297

const A4_WIDTH_PX = 794

const THEME_PRIMARY = '#0f766e'

const THEME_PRIMARY_LIGHT = '#ecfdf5'

const THEME_BORDER = '#e2e8f0'

const THEME_TEXT_MUTED = '#64748b'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatCellContent(text: string, className = ''): string {
  const classAttr = className ? ` class="${className}"` : ''

  const content = escapeHtml(text.trim()).replace(/\n/g, '<br>')

  return `<td${classAttr}>${content || '—'}</td>`
}

function buildTableSection(
  title: string,
  headers: string[],
  rows: string[][],
  cellClasses?: string[][]
): string {
  const exportDate = new Date().toLocaleString('fa-IR')

  const headerCells = headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')

  const bodyRows =
    rows.length > 0
      ? rows
          .map((row, rowIndex) => {
            const cells = headers
              .map((_, index) =>
                formatCellContent(String(row[index] ?? ''), cellClasses?.[rowIndex]?.[index] ?? '')
              )
              .join('')

            return `<tr>${cells}</tr>`
          })
          .join('')
      : `<tr><td class="pdf-empty" colspan="${headers.length}">داده‌ای برای نمایش وجود ندارد</td></tr>`

  return `
    <section class="pdf-sheet">
      <header class="pdf-header">
        <h1>${escapeHtml(title)}</h1>
        <p class="pdf-meta">تاریخ خروجی: ${escapeHtml(exportDate)}</p>
      </header>
      <table class="pdf-table">
        <thead>
          <tr>${headerCells}</tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </section>
  `
}

function buildPdfStyles(orientation: 'portrait' | 'landscape'): string {
  const pageWidth = orientation === 'landscape' ? Math.round(A4_WIDTH_PX * 1.414) : A4_WIDTH_PX

  return `
    .pdf-export-root {
      width: ${pageWidth}px;
      box-sizing: border-box;
      padding: 28px 24px 32px;
      background: #ffffff;
      color: #0f172a;
      font-family: 'Vazirmatn', system-ui, sans-serif;
      direction: rtl;
      text-align: right;
      letter-spacing: normal;
      word-break: normal;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    .pdf-export-root * {
      box-sizing: border-box;
      letter-spacing: normal;
      word-break: normal;
    }

    .pdf-sheet + .pdf-sheet {
      margin-top: 24px;
    }

    .pdf-header {
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid ${THEME_PRIMARY};
    }

    .pdf-header h1 {
      margin: 0 0 6px;
      font-size: 22px;
      font-weight: 700;
      color: ${THEME_PRIMARY};
      line-height: 1.35;
    }

    .pdf-meta {
      margin: 0;
      font-size: 12px;
      color: ${THEME_TEXT_MUTED};
    }

    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: auto;
      font-size: 12px;
    }

    .pdf-table th,
    .pdf-table td {
      border: 1px solid ${THEME_BORDER};
      padding: 8px 10px;
      vertical-align: top;
      text-align: right;
      white-space: normal;
      word-break: keep-all;
      overflow-wrap: break-word;
      line-height: 1.55;
      min-width: 56px;
    }

    .pdf-table td.pdf-cell-multiline {
      font-size: 10.5px;
      line-height: 1.6;
    }

    .pdf-table td.pdf-cell-amount {
      white-space: nowrap;
    }

    .pdf-table th {
      background: ${THEME_PRIMARY};
      color: #ffffff;
      font-weight: 600;
      font-size: 10.5px;
    }

    .pdf-table tbody tr:nth-child(even) td {
      background: ${THEME_PRIMARY_LIGHT};
    }

    .pdf-empty {
      text-align: center;
      color: ${THEME_TEXT_MUTED};
      font-size: 12px;
    }
  `
}

function createPdfContainer(
  title: string,
  headers: string[],
  rows: string[][],
  orientation: 'portrait' | 'landscape',
  cellClasses?: string[][]
): HTMLDivElement {
  const container = document.createElement('div')

  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  container.style.pointerEvents = 'none'

  const styleEl = document.createElement('style')

  styleEl.textContent = buildPdfStyles(orientation)

  const root = document.createElement('div')

  root.className = 'pdf-export-root'
  root.setAttribute('dir', 'rtl')
  root.setAttribute('lang', 'fa')
  root.innerHTML = buildTableSection(title, headers, rows, cellClasses)

  container.appendChild(styleEl)
  container.appendChild(root)
  document.body.appendChild(container)

  return container
}

async function renderContainerToPdf(
  container: HTMLDivElement,
  orientation: 'portrait' | 'landscape',
  filename: string
): Promise<void> {
  const root = container.querySelector('.pdf-export-root') as HTMLElement

  if (!root) {
    throw new Error('ساخت PDF ناموفق بود')
  }

  await document.fonts.ready

  const canvas = await html2canvas(root, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false
  })

  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  })

  const pageWidth = orientation === 'landscape' ? A4_HEIGHT_MM : A4_WIDTH_MM

  const pageHeight = orientation === 'landscape' ? A4_WIDTH_MM : A4_HEIGHT_MM

  const imgWidth = pageWidth

  const imgHeight = (canvas.height * imgWidth) / canvas.width

  const imgData = canvas.toDataURL('image/jpeg', 0.92)

  let heightLeft = imgHeight

  let position = 0

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
  heightLeft -= pageHeight

  while (heightLeft > 0) {
    position = heightLeft - imgHeight
    pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
  }

  const safeFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`

  pdf.save(safeFilename)
}

export async function downloadTablePdf({
  title,
  headers,
  rows,
  filename,
  cellClasses
}: {
  title: string
  headers: string[]
  rows: string[][]
  filename: string
  cellClasses?: string[][]
}): Promise<void> {
  const orientation =
    headers.length > 6 || rows.some(row => row.length > 8) ? 'landscape' : 'portrait'

  const container = createPdfContainer(title, headers, rows, orientation, cellClasses)

  try {
    await renderContainerToPdf(container, orientation, filename)
  } finally {
    container.remove()
  }
}
