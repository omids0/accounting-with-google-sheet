import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  REMINDER_DEFAULTS_FLAG_KEY,
  migrateReminderDefaults,
  planReminderDefaultsMigration
} from './reminderDefaultsMigration'
import type * as RemindersModule from './reminders'
import { parseReminderRows, saveReminderRules } from './reminders'
import { fetchSheetRows } from './sheets'

vi.mock('./sheets', () => ({ fetchSheetRows: vi.fn(async () => []) }))

vi.mock('./reminders', async importOriginal => ({
  ...(await importOriginal<typeof RemindersModule>()),
  ensureReminderSheets: vi.fn(async () => undefined),
  saveReminderRules: vi.fn(async () => undefined)
}))

const summary = (rows: string[][]) =>
  planReminderDefaultsMigration(rows).map(rule => `${rule.kind}:${rule.enabled}@${rule.hour}`)

describe('reminder defaults migration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('turns the four due-date reminders and the nightly digest on for an empty tab', () => {
    expect(summary([])).toEqual([
      'installments:true@9',
      'checks:true@9',
      'dang:true@9',
      'personal:true@9',
      'nightly:true@21'
    ])
  })

  it('treats the auto-written daily row as no choice and switches it off', () => {
    expect(summary([['daily', 'TRUE', '0', '10', '30']])).toEqual([
      'installments:true@9',
      'checks:true@9',
      'dang:true@9',
      'personal:true@9',
      'nightly:true@21',
      'daily:false@10'
    ])
  })

  it('keeps explicit rows and pins missing due-date kinds off', () => {
    const plan = summary([
      ['daily', 'TRUE', '0', '9', '0'],
      ['installments', 'FALSE', '2', '8', '0']
    ])

    expect(plan).toEqual([
      'checks:false@9',
      'dang:false@9',
      'personal:false@9',
      'nightly:true@21',
      'daily:false@9'
    ])
  })

  it('has nothing to do once the nightly row and the four kinds exist', () => {
    const rows = ['installments', 'checks', 'dang', 'personal', 'nightly'].map(kind => [
      kind,
      'FALSE',
      '1',
      '9',
      '0'
    ])

    expect(planReminderDefaultsMigration([...rows, ['daily', 'TRUE', '0', '9', '0']])).toEqual([])
  })

  it('reads nightly rows and ignores unknown kinds', () => {
    expect(
      parseReminderRows([
        ['nightly', 'TRUE', '0', '21', '30'],
        ['weekly', 'TRUE', '0', '9', '0']
      ])
    ).toEqual([{ kind: 'nightly', enabled: true, daysBefore: 0, hour: 21, minute: 30 }])
  })

  it('runs once per spreadsheet', async () => {
    await migrateReminderDefaults('sheet-a')
    await migrateReminderDefaults('sheet-a')

    expect(fetchSheetRows).toHaveBeenCalledTimes(1)
    expect(saveReminderRules).toHaveBeenCalledTimes(1)
    expect(JSON.parse(localStorage.getItem(REMINDER_DEFAULTS_FLAG_KEY) ?? '[]')).toEqual([
      'sheet-a'
    ])

    await migrateReminderDefaults('sheet-b')

    expect(fetchSheetRows).toHaveBeenCalledTimes(2)
  })
})
