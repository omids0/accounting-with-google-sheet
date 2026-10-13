/**
 * The PDF machinery every export shares: an off-screen RTL page in Vazirmatn,
 * rasterised with html2canvas and placed on A4 pages by jsPDF (both loaded on use).
 */

const A4_WIDTH_MM = 210

const A4_HEIGHT_MM = 297

const A4_WIDTH_PX = 794

export type PdfOrientation = 'portrait' | 'landscape'

export const PDF_THEME = {
  primary: '#0f766e',
  primaryLight: '#ecfdf5',
  border: '#e2e8f0',
  textMuted: '#64748b',
  danger: '#b91c1c'
} as const

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Page box, font and RTL flow of `.pdf-export-root`; templates add their own rules. */
export function pdfRootStyles(orientation: PdfOrientation): string {
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
  `
}

function createPdfContainer(html: string, css: string): HTMLDivElement {
  const container = document.createElement('div')

  container.style.position = 'fixed'
  container.style.left = '-10000px'
  container.style.top = '0'
  container.style.zIndex = '-1'
  container.style.pointerEvents = 'none'

  const styleEl = document.createElement('style')

  styleEl.textContent = css

  const root = document.createElement('div')

  root.className = 'pdf-export-root'
  root.setAttribute('dir', 'rtl')
  root.setAttribute('lang', 'fa')
  root.innerHTML = html

  container.appendChild(styleEl)
  container.appendChild(root)
  document.body.appendChild(container)

  return container
}

async function renderContainerToPdf(
  container: HTMLDivElement,
  orientation: PdfOrientation
): Promise<Blob> {
  const [{ jsPDF }, html2canvasModule] = await Promise.all([import('jspdf'), import('html2canvas')])
  const html2canvas = html2canvasModule.default
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

  return pdf.output('blob')
}

/** Renders a template's inner HTML (inside `.pdf-export-root`) with its CSS to a PDF blob. */
export async function renderHtmlPdf(
  html: string,
  css: string,
  orientation: PdfOrientation = 'portrait'
): Promise<Blob> {
  const container = createPdfContainer(html, `${pdfRootStyles(orientation)}\n${css}`)

  try {
    return await renderContainerToPdf(container, orientation)
  } finally {
    container.remove()
  }
}
