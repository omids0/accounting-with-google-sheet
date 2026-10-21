import { buildingLabel } from './buildingLabel'
import type { PaymentResult } from './buildingPayment'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'
import type { StatCardImage } from '../utils/statCardPng'

const forWhat = (result: PaymentResult) =>
  result.months.length ? result.months.join('، ') : 'اعتبار شارژ'

/** The text «اشتراک رسید» shares. */
export function receiptText(building: string, result: PaymentResult): string {
  return [
    `رسید پرداخت · ${formatIsoDatePersian(result.date)}`,
    `${buildingLabel(building)} — واحد ${toPersianDigits(result.unitNumber)}${
      result.debtor ? ` · ${result.debtor}` : ''
    }`,
    `${formatMoney(result.amount)} بابت ${forWhat(result)}`,
    result.credit ? `(اعتبار ثبت‌شده: ${formatMoney(result.credit)})` : '',
    result.accountTitle ? `واریز به ${result.accountTitle}` : '',
    `ماندهٔ بدهی: ${formatMoney(result.remaining)}`
  ]
    .filter(Boolean)
    .join('\n')
}

/** The one-line summary the receipt card shows under its title. */
export function receiptSummary(result: PaymentResult): string {
  return `${formatMoney(result.amount)} بابت ${forWhat(result)}`
}

/** The receipt as the shareable stat card (the same canvas code as the year-in-review card). */
export function receiptImage(building: string, result: PaymentResult): StatCardImage {
  return {
    kicker: `رسید پرداخت · ${formatIsoDatePersian(result.date)}`,
    title: `واحد ${toPersianDigits(result.unitNumber)}${
      result.debtor ? ` · ${result.debtor}` : ''
    }`,
    stats: [
      { label: 'پرداخت‌شده', value: formatMoney(result.amount) },
      { label: 'ماندهٔ بدهی', value: formatMoney(result.remaining) },
      ...(result.credit ? [{ label: 'اعتبار واحد', value: formatMoney(result.credit) }] : [])
    ],
    footer: [
      buildingLabel(building),
      `بابت ${forWhat(result)}`,
      result.accountTitle ? `واریز به ${result.accountTitle}` : ''
    ]
      .filter(Boolean)
      .join(' · ')
  }
}
