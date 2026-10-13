import { escapeHtml, PDF_THEME, renderHtmlPdf, type PdfOrientation } from './pdfRender'
import { saveExportFile } from './saveFile'

const {
  primary: THEME_PRIMARY,
  primaryLight: THEME_PRIMARY_LIGHT,
  border: THEME_BORDER,
  textMuted: THEME_TEXT_MUTED
} = PDF_THEME

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

function buildPdfStyles(): string {
  return `
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
}): Promise<string | null> {
  const orientation: PdfOrientation =
    headers.length > 6 || rows.some(row => row.length > 8) ? 'landscape' : 'portrait'

  const blob = await renderHtmlPdf(
    buildTableSection(title, headers, rows, cellClasses),
    buildPdfStyles(),
    orientation
  )

  return saveExportFile(filename.endsWith('.pdf') ? filename : `${filename}.pdf`, blob)
}
