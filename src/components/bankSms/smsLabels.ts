import type { SmsSuggestionSource } from '../../services/bankSmsSuggest'
import { createdAgoLabel } from '../../services/recordDuplicates'
import type { SmsDirection, SmsSlotRole, SmsTemplate, SmsTemplateIssue } from '../../types'

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

/** «تکراری؟ · رکورد ۱۲ دقیقه پیش», or the record's time / date when older. */
export function smsDuplicateLabel(createdAtMs: number | null | undefined, nowMs = Date.now()) {
  if (!createdAtMs) return 'تکراری؟ · رکورد مشابه هست'
  if (nowMs - createdAtMs < 60 * 60 * 1000) {
    return `تکراری؟ · رکورد ${createdAgoLabel(createdAtMs, nowMs)}`
  }

  return `تکراری؟ · رکورد ${formatSmsWhen(createdAtMs, nowMs)}`
}

/** Why the card suggests its category (small line under «دسته: …»). */
export function smsChoiceReason(choice: {
  category: string
  title?: string
  source?: SmsSuggestionSource
  count?: number
}): string {
  switch (choice.source) {
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
