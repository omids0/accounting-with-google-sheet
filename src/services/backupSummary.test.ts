import { describe, expect, it } from 'vitest'

import type { RestorePreview, RestoreReport } from './backupRestore'
import { formatBackupSummary, formatRestoreReport } from './backupSummary'
import { BACKUP_FORMAT } from './backupZip'

const tab = (rows: number) => ({ name: `t${rows}`, csv: '', rows, headers: [], archive: false })

const preview = (...rows: number[]): RestorePreview => ({
  manifest: {
    format: BACKUP_FORMAT,
    formatVersion: 1,
    appVersion: '2.9.0',
    spreadsheetLabel: '',
    exportedAt: '2026-10-01T00:00:00.000Z',
    tabs: []
  },
  tabs: rows.map(tab),
  unknownTabs: []
})

describe('formatBackupSummary', () => {
  it('counts every tab and names how many of them hold rows', () => {
    const summary = formatBackupSummary(preview(5, 0, 3, 0))

    expect(summary).toContain('۴ تب (۲ دارای ردیف)، ۸ ردیف')
  })

  it('adds no remark when every tab holds rows', () => {
    expect(formatBackupSummary(preview(5, 3))).toContain('۲ تب، ۸ ردیف')
  })

  it('matches the tab count of the restore result', () => {
    const report: RestoreReport = {
      tabs: 4,
      written: 8,
      skipped: 0,
      unknownTabs: [],
      incompatibleTabs: []
    }

    expect(formatBackupSummary(preview(5, 0, 3, 0))).toContain('۴ تب')
    expect(formatRestoreReport(report)).toContain('۴ تب بازیابی شد')
  })
})
