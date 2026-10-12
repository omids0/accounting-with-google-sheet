import {
  DEFAULT_RULES,
  REMINDERS_SHEET,
  ensureReminderSheets,
  parseReminderRows,
  saveReminderRules
} from './reminders'
import { fetchSheetRows } from './sheets'
import { getItem, setItem } from './storage'
import type { ReminderKind, ReminderRule } from '../types'

/** Spreadsheet ids already migrated on this device. */
export const REMINDER_DEFAULTS_FLAG_KEY = 'accounting_reminder_defaults_v2'

const DUE_DATE_DEFAULT_KINDS: ReminderKind[] = ['installments', 'checks', 'dang', 'personal']

function defaultRule(kind: ReminderKind): ReminderRule {
  return { ...DEFAULT_RULES.find(rule => rule.kind === kind)! }
}

/**
 * Rows to write so the sheet (which the web cron reads) matches the new defaults.
 * Older versions wrote the `daily` row by themselves on every launch, so only rows of
 * other kinds count as the user's own choice; with those present, missing due-date
 * rows are pinned off, as the user last saw them.
 */
export function planReminderDefaultsMigration(rows: string[][]): ReminderRule[] {
  const existing = parseReminderRows(rows)
  const has = (kind: ReminderKind) => existing.some(rule => rule.kind === kind)
  const explicit = existing.some(rule => rule.kind !== 'daily')
  const plan: ReminderRule[] = []

  for (const kind of DUE_DATE_DEFAULT_KINDS) {
    if (!has(kind)) plan.push({ ...defaultRule(kind), enabled: !explicit })
  }

  if (!has('nightly')) {
    plan.push(defaultRule('nightly'))

    // The forced daily nudge steps aside for the nightly digest, keeping its time.
    const daily = existing.find(rule => rule.kind === 'daily')

    if (daily?.enabled) plan.push({ ...daily, enabled: false })
  }

  return plan
}

function migratedSheets(): string[] {
  const stored = getItem<unknown>(REMINDER_DEFAULTS_FLAG_KEY)

  return Array.isArray(stored) ? stored.filter(item => typeof item === 'string') : []
}

/** Runs once per spreadsheet on this device. */
export async function migrateReminderDefaults(spreadsheetId: string): Promise<void> {
  const done = migratedSheets()

  if (!spreadsheetId || done.includes(spreadsheetId)) return

  await ensureReminderSheets(spreadsheetId)

  const plan = planReminderDefaultsMigration(await fetchSheetRows(spreadsheetId, REMINDERS_SHEET))

  if (plan.length) await saveReminderRules(spreadsheetId, plan)

  setItem(REMINDER_DEFAULTS_FLAG_KEY, [...done, spreadsheetId])
}
