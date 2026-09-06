import { fetchChecks } from './checks'
import { fetchDangs } from './dang'
import { fetchInstallmentPlans, getInstallmentPaymentAmount } from './installments'
import type { Check, Dang, InstallmentPlan, ReminderRule } from '../types'
import { formatMoney } from '../utils/formatMoney'
import { addDaysToIso, formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate'

export interface UpcomingDueDateReminder {
  kind: 'installments' | 'checks' | 'dang'
  reference: string
  title: string
  body: string
  dueDate: string
  remindOn: string
}

function collectInstallmentReminders(
  plans: InstallmentPlan[],
  todayIso: string,
  targetDueDate: string
): UpcomingDueDateReminder[] {
  const reminders: UpcomingDueDateReminder[] = []

  for (const plan of plans) {
    for (const payment of plan.payments) {
      if (payment.paid) continue
      if (payment.dueDate.slice(0, 10) !== targetDueDate) continue

      const amount = getInstallmentPaymentAmount(payment, plan)
      const dueLabel = formatIsoDatePersian(payment.dueDate)

      reminders.push({
        kind: 'installments',
        reference: `${plan.id}_p${payment.n}_${targetDueDate}`,
        title: 'یادآوری قسط',
        body: `${plan.title} — قسط ${payment.n} (${formatMoney(amount)}) — موعد: ${dueLabel}`,
        dueDate: payment.dueDate,
        remindOn: todayIso
      })
    }
  }

  return reminders
}

function collectCheckReminders(
  checks: Check[],
  todayIso: string,
  targetDueDate: string
): UpcomingDueDateReminder[] {
  return checks
    .filter(check => !check.paid)
    .filter(check => check.dueDate.slice(0, 10) === targetDueDate)
    .map(check => {
      const label = check.counterparty || check.checkNumber || 'چک'
      const dueLabel = formatIsoDatePersian(check.dueDate)
      const numberPart = check.checkNumber ? ` — شماره ${check.checkNumber}` : ''

      return {
        kind: 'checks' as const,
        reference: `check_${check.id}_${targetDueDate}`,
        title: 'یادآوری چک',
        body: `${label}${numberPart} (${formatMoney(check.amount)}) — سررسید: ${dueLabel}`,
        dueDate: check.dueDate,
        remindOn: todayIso
      }
    })
}

function collectDangReminders(
  dangs: Dang[],
  todayIso: string,
  targetDueDate: string
): UpcomingDueDateReminder[] {
  return dangs
    .filter(dang => !dang.paid)
    .filter(dang => dang.date.slice(0, 10) === targetDueDate)
    .map(dang => {
      const dueLabel = formatIsoDatePersian(dang.date)
      const subtitle = dang.counterparty || dang.category || 'بدهی'

      return {
        kind: 'dang' as const,
        reference: `dang_${dang.id}_${targetDueDate}`,
        title: 'یادآوری بدهی',
        body: `${dang.title} (${subtitle}) — ${formatMoney(dang.amount)} — موعد: ${dueLabel}`,
        dueDate: dang.date,
        remindOn: todayIso
      }
    })
}

export function getUpcomingDueDateReminders(
  kind: 'installments' | 'checks' | 'dang',
  data: InstallmentPlan[] | Check[] | Dang[],
  rule: ReminderRule,
  todayIso = getTodayIso()
): UpcomingDueDateReminder[] {
  if (!rule.enabled || rule.kind !== kind) return []

  const targetDueDate = addDaysToIso(todayIso, rule.daysBefore).slice(0, 10)

  if (kind === 'installments') {
    return collectInstallmentReminders(data as InstallmentPlan[], todayIso, targetDueDate)
  }
  if (kind === 'checks') {
    return collectCheckReminders(data as Check[], todayIso, targetDueDate)
  }

  return collectDangReminders(data as Dang[], todayIso, targetDueDate)
}

export async function previewDueDateReminders(
  spreadsheetId: string,
  kind: 'installments' | 'checks' | 'dang',
  rule: ReminderRule
): Promise<UpcomingDueDateReminder[]> {
  if (kind === 'installments') {
    const plans = await fetchInstallmentPlans(spreadsheetId)

    return getUpcomingDueDateReminders(kind, plans, rule)
  }
  if (kind === 'checks') {
    const checks = await fetchChecks(spreadsheetId)

    return getUpcomingDueDateReminders(kind, checks, rule)
  }

  const dangs = await fetchDangs(spreadsheetId)

  return getUpcomingDueDateReminders(kind, dangs, rule)
}

/** @deprecated Use UpcomingDueDateReminder */
export type UpcomingInstallmentReminder = UpcomingDueDateReminder

/** @deprecated Use previewDueDateReminders */
export const previewInstallmentReminders = (spreadsheetId: string, rule: ReminderRule) =>
  previewDueDateReminders(spreadsheetId, 'installments', rule)

/** @deprecated Use getUpcomingDueDateReminders */
export const getUpcomingInstallmentReminders = (
  plans: InstallmentPlan[],
  rule: ReminderRule,
  todayIso?: string
) => getUpcomingDueDateReminders('installments', plans, rule, todayIso)

/** @deprecated Use UpcomingDueDateReminder body directly */
export function formatInstallmentReminderMessage(reminder: UpcomingDueDateReminder): {
  title: string
  body: string
} {
  return { title: reminder.title, body: reminder.body }
}
