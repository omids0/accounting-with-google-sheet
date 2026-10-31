import { describe, expect, it } from 'vitest'

import {
  autoBackupDue,
  backupOverdueDays,
  backupsToPrune,
  formatBackupSize,
  overdueNoticeDue,
  recentAutoBackup,
  updateBackupsToPrune,
  type DriveBackupFile
} from './autoBackupPlan'

const DAY = 24 * 60 * 60 * 1000

const NOW = Date.UTC(2026, 9, 13, 9)

const daysAgo = (days: number) => NOW - days * DAY

function file(id: string, kind: DriveBackupFile['kind'], ageDays: number): DriveBackupFile {
  return { id, name: `${id}.zip`, kind, createdAt: daysAgo(ageDays), size: 2_000_000 }
}

describe('autoBackupDue (7-day schedule)', () => {
  it('waits a full week after the last backup', () => {
    expect(autoBackupDue({ lastAutoBackupAt: daysAgo(6.9) }, NOW)).toBe(false)
    expect(autoBackupDue({ lastAutoBackupAt: daysAgo(7) }, NOW)).toBe(true)
  })

  it('counts a manual download as the last backup', () => {
    expect(autoBackupDue({ lastAutoBackupAt: daysAgo(30), lastBackupAt: daysAgo(2) }, NOW)).toBe(
      false
    )
  })

  it('starts the clock at first sight for a spreadsheet never backed up', () => {
    expect(autoBackupDue({}, NOW)).toBe(false)
    expect(autoBackupDue({ firstSeenAt: daysAgo(3) }, NOW)).toBe(false)
    expect(autoBackupDue({ firstSeenAt: daysAgo(8) }, NOW)).toBe(true)
  })

  it('stays off when switched off', () => {
    expect(autoBackupDue({ autoOff: true, lastBackupAt: daysAgo(40) }, NOW)).toBe(false)
  })

  it('skips while another tab holds the lease, and runs once it expires', () => {
    const lastBackupAt = daysAgo(10)

    expect(autoBackupDue({ lastBackupAt, autoLock: { token: 'a', until: NOW + 1 } }, NOW)).toBe(
      false
    )
    expect(autoBackupDue({ lastBackupAt, autoLock: { token: 'a', until: NOW - 1 } }, NOW)).toBe(
      true
    )
  })
})

describe('backupsToPrune (retention)', () => {
  it('keeps the three newest automatic backups and never touches manual ones', () => {
    const files = [
      file('m-old', 'manual', 90),
      file('a1', 'auto', 1),
      file('a4', 'auto', 22),
      file('a2', 'auto', 8),
      file('m-new', 'manual', 3),
      file('a3', 'auto', 15),
      file('a5', 'auto', 29)
    ]

    expect(backupsToPrune(files).map(item => item.id)).toEqual(['a4', 'a5'])
  })

  it('prunes nothing with three or fewer automatic backups', () => {
    expect(backupsToPrune([file('a1', 'auto', 1), file('m', 'manual', 50)])).toEqual([])
  })

  it('prunes only the chosen environment pre-update copies, past its newest five', () => {
    const dev = Array.from({ length: 7 }, (_, index) => file(`d${index}`, 'update-dev', index + 1))
    const prod = Array.from({ length: 7 }, (_, index) =>
      file(`p${index}`, 'update-prod', index + 1)
    )
    const others = [file('m', 'manual', 99), file('a', 'auto', 99)]
    const all = [...others, ...dev, ...prod]

    expect(updateBackupsToPrune(all, 'update-dev').map(item => item.id)).toEqual(['d5', 'd6'])
    expect(updateBackupsToPrune(all, 'update-prod').map(item => item.id)).toEqual(['p5', 'p6'])
    expect(updateBackupsToPrune(all.slice(0, 7), 'update-dev')).toEqual([])
  })

  it('the weekly prune never touches pre-update copies', () => {
    const files = [
      ...Array.from({ length: 9 }, (_, index) => file(`d${index}`, 'update-dev', index + 1)),
      ...Array.from({ length: 9 }, (_, index) => file(`p${index}`, 'update-prod', index + 1)),
      file('m', 'manual', 90)
    ]

    expect(backupsToPrune(files)).toEqual([])
    expect(recentAutoBackup(files, NOW)).toBeNull()
  })

  it('finds an automatic backup another device made this week', () => {
    expect(recentAutoBackup([file('m', 'manual', 1), file('a', 'auto', 9)], NOW)).toBeNull()
    expect(recentAutoBackup([file('a', 'auto', 9), file('b', 'auto', 2)], NOW)?.id).toBe('b')
  })
})

describe('overdueNoticeDue (14-day notice)', () => {
  it('fires after 14 days without a backup', () => {
    expect(overdueNoticeDue({ lastAutoBackupAt: daysAgo(13) }, NOW)).toBeNull()
    expect(overdueNoticeDue({ lastAutoBackupAt: daysAgo(14) }, NOW)).toBe(14)
    expect(overdueNoticeDue({ firstSeenAt: daysAgo(20) }, NOW)).toBe(20)
  })

  it('fires at most once per fortnight', () => {
    const state = { lastBackupAt: daysAgo(40), overdueNoticeAt: daysAgo(5) }

    expect(overdueNoticeDue(state, NOW)).toBeNull()
    expect(overdueNoticeDue({ ...state, overdueNoticeAt: daysAgo(14) }, NOW)).toBe(40)
  })

  it('stays quiet when switched off; the digest line follows the same switch', () => {
    const state = { lastBackupAt: daysAgo(20), overdueNoticeOff: true }

    expect(overdueNoticeDue(state, NOW)).toBeNull()
    expect(backupOverdueDays(state, NOW)).toBeNull()
    expect(backupOverdueDays({ lastBackupAt: daysAgo(20), overdueNoticeAt: NOW }, NOW)).toBe(20)
  })
})

describe('formatBackupSize', () => {
  it('reads as KB under a megabyte, MB with one decimal above', () => {
    expect(formatBackupSize(undefined)).toBe('')
    expect(formatBackupSize(300 * 1024)).toBe('۳۰۰ KB')
    expect(formatBackupSize(2.1 * 1024 * 1024)).toBe('۲٫۱ MB')
  })
})
