import type { BankSmsReviewItem } from '../../services/bankSmsQueue'
import type { SmsSuggestionSource } from '../../services/bankSmsSuggest'
import { createdAgoLabel } from '../../services/recordDuplicates'
import type { SmsDirection, SmsSlotRole, SmsTemplate, SmsTemplateIssue } from '../../types'
import { formatPersianNumber } from '../../utils/formatMoney'

export const SMS_ROLE_LABELS: Record<SmsSlotRole, string> = {
  amount: 'مبلغ',
  balance: 'مانده',
  accountRef: 'کارت/حساب',
  ignore: 'نادیده'
}

/** Tap order on a number chip. */
const ROLE_CYCLE: SmsSlotRole[] = ['amount', 'balance', 'accountRef', 'ignore']

export function nextSmsRole(role: SmsSlotRole): SmsSlotRole {
  return ROLE_CYCLE[(ROLE_CYCLE.indexOf(role) + 1) % ROLE_CYCLE.length]
}

export const SMS_DIRECTION_LABELS: Record<SmsDirection, string> = {
  debit: 'برداشت (هزینه)',
  credit: 'واریز (درآمد)'
}

export const SMS_UNIT_LABELS = { rial: 'ریال', toman: 'تومان' } as const

export const SMS_ISSUE_LABELS: Record<SmsTemplateIssue, string> = {
  'amount-missing': 'یک عدد را «مبلغ» علامت بزنید.',
  'amount-multiple': 'فقط یک عدد می‌تواند «مبلغ» باشد.',
  'balance-multiple': 'فقط یک عدد می‌تواند «مانده» باشد.',
  'accountRef-multiple': 'فقط یک عدد می‌تواند «کارت/حساب» باشد.'
}

/** One-line summary of a saved template, e.g. «برداشت (هزینه) · ریال · مبلغ، مانده». */
export function describeSmsTemplate(template: SmsTemplate): string {
  const roles = template.parts.flatMap(part =>
    part.kind === 'slot' && part.role !== 'ignore' ? [SMS_ROLE_LABELS[part.role]] : []
  )
  const firstText = template.parts.find(part => part.kind === 'text')
  const head = firstText?.kind === 'text' ? firstText.value.trim().slice(0, 24) : ''

  return [
    SMS_DIRECTION_LABELS[template.direction],
    SMS_UNIT_LABELS[template.unit],
    roles.join('، '),
    head && `«${head}…»`
  ]
    .filter(Boolean)
    .join(' · ')
}

/** «۱۴۰۵/۷/۱۵، ۱۴:۳۲» */
export function formatSmsTime(ms: number): string {
  return new Date(ms).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
}

const timeOfDay = (date: Date) =>
  date.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })

/** Calendar days between two moments, in local time (0 = same day). */
function daysBetween(ms: number, nowMs: number): number {
  const start = (value: number) => new Date(value).setHours(0, 0, 0, 0)

  return Math.round((start(nowMs) - start(ms)) / 86_400_000)
}

/** «امروز ۱۴:۰۲» / «دیروز ۰۹:۱۵» / «۱۴۰۵/۷/۱۵، ۱۴:۳۲» */
export function formatSmsWhen(ms: number, nowMs = Date.now()): string {
  const days = daysBetween(ms, nowMs)

  if (days === 0) return `امروز ${timeOfDay(new Date(ms))}`
  if (days === 1) return `دیروز ${timeOfDay(new Date(ms))}`

  return formatSmsTime(ms)
}

/** «۱۲ دقیقه پیش» within the hour, else «امروز ۱۴:۰۲» / the date. */
const recordAge = (createdAtMs: number, nowMs: number) =>
  nowMs - createdAtMs < 60 * 60 * 1000
    ? createdAgoLabel(createdAtMs, nowMs)
    : formatSmsWhen(createdAtMs, nowMs)

/** «تکراری؟ · رکورد ۱۲ دقیقه پیش», or the record's time / date when older. */
export function smsDuplicateLabel(createdAtMs: number | null | undefined, nowMs = Date.now()) {
  if (!createdAtMs) return 'تکراری؟ · رکورد مشابه هست'

  return `تکراری؟ · رکورد ${recordAge(createdAtMs, nowMs)}`
}

const TITLE_CLIP = 18

/** «پرداخت بدهی «وام» ثبت شده · ۱۲ دقیقه پیش» / «دریافت طلب «x» ثبت شده». */
export function smsPaymentLabel(
  payment: { noun: string; title: string; income?: boolean },
  createdAtMs: number | null | undefined,
  nowMs = Date.now()
) {
  const title =
    payment.title.length > TITLE_CLIP
      ? `${payment.title.slice(0, TITLE_CLIP).trim()}…`
      : payment.title
  const verb = payment.income ? 'دریافت' : 'پرداخت'
  const label = `${verb} ${payment.noun} «${title}» ثبت شده`

  return createdAtMs ? `${label} · ${recordAge(createdAtMs, nowMs)}` : label
}

const paymentVerb = (income: boolean) => (income ? 'دریافت' : 'پرداخت')

const clipTitle = (title: string) =>
  title.length > TITLE_CLIP ? `${title.slice(0, TITLE_CLIP).trim()}…` : title

/** «بخشی از پرداخت «وام»؟»: the badge of an SMS smaller than a payment record. */
export function smsSplitBadge(payment: { title: string }, income: boolean) {
  return `بخشی از ${paymentVerb(income)} «${clipTitle(payment.title)}»؟`
}

/** «بخشی از پرداخت «وام» (۲۰٬۰۰۰٬۰۰۰، پوشش‌نیافته ۲۰٬۰۰۰٬۰۰۰)؟» */
export function smsSplitLine(item: {
  duplicateOf: { amount: number; type: string } | null
  duplicatePayment: { title: string } | null
  splitUncovered: number | null
}) {
  const { duplicateOf, duplicatePayment, splitUncovered } = item

  if (!duplicateOf || !duplicatePayment || splitUncovered === null) return ''

  const verb = paymentVerb(duplicateOf.type === 'income')
  const amounts = `${formatPersianNumber(duplicateOf.amount)}، پوشش‌نیافته ${formatPersianNumber(
    splitUncovered
  )}`

  return `بخشی از ${verb} «${clipTitle(duplicatePayment.title)}» (${amounts})؟`
}

/** The badge text of a queued SMS whose record already exists: the payment, else «تکراری؟». */
export function smsDuplicateStatus(
  item: Pick<
    Extract<BankSmsReviewItem, { kind: 'single' }>,
    'duplicateOf' | 'duplicatePayment' | 'splitUncovered'
  >,
  nowMs = Date.now()
) {
  const createdAtMs = item.duplicateOf?.createdAtMs
  const income = item.duplicateOf?.type === 'income'

  if (item.duplicatePayment && item.splitUncovered !== null) {
    return smsSplitBadge(item.duplicatePayment, income)
  }

  return item.duplicatePayment
    ? smsPaymentLabel({ ...item.duplicatePayment, income }, createdAtMs, nowMs)
    : smsDuplicateLabel(createdAtMs, nowMs)
}

/** Why the card suggests its category (small line under «دسته: …»). */
export function smsChoiceReason(choice: {
  category: string
  title?: string
  source?: SmsSuggestionSource
  count?: number
}): string {
  switch (choice.source) {
    case 'unit':
      return `کارت پرداخت‌کننده با کارت ثبت‌شدهٔ ساکن می‌خواند: ${choice.title}`
    case 'recurring':
      return `تکرار ماهانه «${choice.title || choice.category}» با همین مبلغ`
    case 'amount':
      return (choice.count ?? 0) > 1
        ? `چون ${(choice.count ?? 0).toLocaleString('fa-IR')} بار قبل همین مبلغ را «${
            choice.category
          }» زدی`
        : `قبلاً همین مبلغ از همین حساب را «${choice.category}» زدی`
    case 'sender':
      return 'آخرین دسته‌ای که برای پیامک‌های همین بانک زدی'
    default:
      return choice.title ? `انتخاب خودت · عنوان «${choice.title}»` : 'انتخاب خودت'
  }
}
