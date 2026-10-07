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
