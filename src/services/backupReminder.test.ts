import { beforeEach, describe, expect, it } from 'vitest'

import {
  BACKUP_REMINDER_DAYS,
  backupReminderDue,
  getBackupState,
  markBackupDone,
  noteBackupFirstSeen,
  setBackupReminderOn,
  snoozeBackupReminder
} from './backupReminder'

const DAY = 24 * 60 * 60 * 1000
const T0 = Date.UTC(2026, 8, 1)

describe('backup reminder gate', () => {
  it('waits 30 days after the last backup', () => {
    const state = { lastBackupAt: T0 }

    expect(backupReminderDue(state, true, T0 + 29 * DAY)).toBeNull()
    expect(backupReminderDue(state, true, T0 + 40 * DAY)).toEqual({ kind: 'since', days: 40 })
  })

  it('counts from the first visit when there never was a backup, never in the first 30 days', () => {
    const state = { firstSeenAt: T0 }

    expect(backupReminderDue(state, true, T0)).toBeNull()
    expect(backupReminderDue(state, true, T0 + (BACKUP_REMINDER_DAYS - 1) * DAY)).toBeNull()
    expect(backupReminderDue(state, true, T0 + BACKUP_REMINDER_DAYS * DAY)).toEqual({
      kind: 'never'
    })
  })

  it('stays quiet without a clock, without data, while snoozed or when turned off', () => {
    const late = T0 + 60 * DAY

    expect(backupReminderDue({}, true, late)).toBeNull()
    expect(backupReminderDue({ lastBackupAt: T0 }, false, late)).toBeNull()
    expect(backupReminderDue({ lastBackupAt: T0, reminderOff: true }, true, late)).toBeNull()
    expect(backupReminderDue({ lastBackupAt: T0, snoozedUntil: late + 1 }, true, late)).toBeNull()
    expect(backupReminderDue({ lastBackupAt: T0, snoozedUntil: late }, true, late)).not.toBeNull()
  })
})

describe('backup reminder state', () => {
  beforeEach(() => localStorage.clear())

  it('is kept per spreadsheet', () => {
    noteBackupFirstSeen('a', T0)
    noteBackupFirstSeen('a', T0 + DAY)
    markBackupDone('b', T0)

    expect(getBackupState('a')).toEqual({ firstSeenAt: T0 })
    expect(getBackupState('b').lastBackupAt).toBe(T0)
  })

  it('snoozes for 30 days and a new backup clears the snooze', () => {
    markBackupDone('a', T0)
    snoozeBackupReminder('a', T0 + 31 * DAY)

    expect(backupReminderDue(getBackupState('a'), true, T0 + 40 * DAY)).toBeNull()
    expect(backupReminderDue(getBackupState('a'), true, T0 + 61 * DAY)).toEqual({
      kind: 'since',
      days: 61
    })

    markBackupDone('a', T0 + 62 * DAY)
    expect(getBackupState('a').snoozedUntil).toBeUndefined()
  })

  it('turns the monthly reminder off and on', () => {
    setBackupReminderOn('a', false)
    expect(getBackupState('a').reminderOff).toBe(true)
    setBackupReminderOn('a', true)
    expect(getBackupState('a').reminderOff).toBe(false)
  })
})
