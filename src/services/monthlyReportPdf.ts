import { monthlyReportFileName, monthlyReportTitle, type MonthlyReportData } from './monthlyReport'
import { formatMoney, formatMoneyParts, formatPersianNumber } from '../utils/formatMoney'
import { escapeHtml, PDF_THEME, renderHtmlPdf } from '../utils/pdfRender'
import { saveExportFile } from '../utils/saveFile'

const STYLES = `
  .mr-head { display: flex; justify-content: space-between; align-items: baseline;
    padding-bottom: 12px; border-bottom: 2px solid ${PDF_THEME.primary}; }
  .mr-head h1 { margin: 0; font-size: 22px; font-weight: 700; color: ${PDF_THEME.primary}; }
  .mr-head span { font-size: 13px; color: ${PDF_THEME.textMuted}; }
  .mr-stats { display: flex; gap: 12px; margin: 18px 0; }
  .mr-stat { flex: 1; border: 1px solid ${PDF_THEME.border}; border-radius: 10px;
    padding: 12px; text-align: center; font-size: 12px; color: ${PDF_THEME.textMuted}; }
  .mr-stat b { display: block; font-size: 18px; color: #0f172a; margin-bottom: 4px; }
  .mr-section { margin: 0 0 8px; font-size: 14px; font-weight: 700; }
  .mr-budget { font-size: 12px; margin-bottom: 8px; }
  .mr-budget.over { color: ${PDF_THEME.danger}; }
  .mr-track { height: 8px; border-radius: 4px; background: ${PDF_THEME.border}; margin-top: 4px;
    overflow: hidden; }
  .mr-fill { height: 100%; background: #475569; }
  .mr-budget.over .mr-fill { background: ${PDF_THEME.danger}; }
  .mr-facts { margin-top: 16px; padding-top: 10px; border-top: 1px dashed ${PDF_THEME.border};
    font-size: 12px; line-height: 2; }
`

function stat(label: string, valueHtml: string): string {
  return `<div class="mr-stat"><b>${valueHtml}</b>${escapeHtml(label)}</div>`
}

/** «+۸٬۶۰۰٬۰۰۰ تومان»: the sign stays on the digits without bidi isolates (html2canvas). */
function signedMoneyHtml(n: number): string {
  const { number, symbol } = formatMoneyParts(Math.abs(n))
  const sign = n < 0 ? '−' : n > 0 ? '+' : ''

  return `<span style="direction:ltr;unicode-bidi:embed">${sign}${escapeHtml(
    number
  )}</span> ${escapeHtml(symbol)}`
}

function budgetRow(row: MonthlyReportData['budgets'][number]): string {
  const width = Math.round(Math.min(1, row.ratio) * 100)

  return `<div class="mr-budget${row.over ? ' over' : ''}">${escapeHtml(
    `${row.category} ${formatMoney(row.spent)} از ${formatMoney(row.budget)}`
  )}<div class="mr-track"><div class="mr-fill" style="width:${width}%"></div></div></div>`
}

/**
 * «بیشترین خرید از: … · پرتکرارترین قلم: …» under the budget bars; '' when the month
 * names neither a counterparty nor an item.
 */
export function monthlyReportHighlightLine(report: MonthlyReportData): string {
  const { counterparties, item } = report.highlights

  return [
    counterparties.length ? `بیشترین خرید از: ${counterparties.join('، ')}` : '',
    item ? `پرتکرارترین قلم: ${item}` : ''
  ]
    .filter(Boolean)
    .join(' · ')
}

/** The footer facts, also shown under the on-screen preview. */
export function monthlyReportFacts(report: MonthlyReportData): string[] {
  const facts = [
    `اقساط پرداخت‌شده ${formatPersianNumber(report.installments.paid)} از ${formatPersianNumber(
      report.installments.due
    )}`,
    `چک پاس‌شده ${formatPersianNumber(report.checksCleared)}`
  ]

  if (report.netWorth != null) {
    const change =
      report.netWorthChange != null
        ? ` (${report.netWorthChange >= 0 ? '↑' : '↓'} ${formatMoney(
            Math.abs(report.netWorthChange)
          )})`
        : ''

    facts.push(`دارایی خالص ${formatMoney(report.netWorth)}${change}`)
  }
  facts.push(`تکرارهای ثبت‌شده ${formatPersianNumber(report.recurringPosted)}`)

  return facts
}

export function monthlyReportHtml(report: MonthlyReportData, userName: string | null): string {
  const highlightLine = monthlyReportHighlightLine(report)

  const budgets = report.budgets.length
    ? `<h2 class="mr-section">بودجه</h2>${report.budgets.map(budgetRow).join('')}`
    : ''

  return `
    <header class="mr-head">
      <h1>${escapeHtml(monthlyReportTitle(report.monthKey))}</h1>
      ${userName ? `<span>${escapeHtml(userName)}</span>` : ''}
    </header>
    <div class="mr-stats">
      ${stat('درآمد', escapeHtml(formatMoney(report.income)))}
      ${stat('هزینه', escapeHtml(formatMoney(report.expense)))}
      ${stat('خالص', signedMoneyHtml(report.net))}
    </div>
    ${budgets}
    ${highlightLine ? `<div class="mr-budget">${escapeHtml(highlightLine)}</div>` : ''}
    <div class="mr-facts">${monthlyReportFacts(report).map(escapeHtml).join(' · ')}</div>
  `
}

/** One A4 page; «اشتراک PDF» opens the share sheet on Android, «ذخیره» only saves. */
export async function saveMonthlyReportPdf(
  report: MonthlyReportData,
  userName: string | null,
  share: boolean
): Promise<string | null> {
  const blob = await renderHtmlPdf(monthlyReportHtml(report, userName), STYLES)

  return saveExportFile(monthlyReportFileName(report.monthKey), blob, { share })
}
