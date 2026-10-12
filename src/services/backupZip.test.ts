import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'

import {
  BACKUP_FORMAT,
  buildBackupManifest,
  INVALID_BACKUP_MESSAGE,
  packBackup,
  unpackBackup,
  type BackupTabFile
} from './backupZip'

const tabs: BackupTabFile[] = [
  { name: 'رکوردها', csv: 'شناسه,مبلغ\r\na1,1500', rows: 1 },
  { name: 'چک‌ها', csv: 'شناسه,مبلغ', rows: 0 },
  { name: 'a/b', csv: 'x', rows: 0 },
  { name: 'a-b', csv: 'y', rows: 0 }
]

const meta = {
  appVersion: '2.1.0',
  spreadsheetLabel: 'حساب خانه',
  exportedAt: new Date('2026-10-12T08:00:00Z')
}

describe('backup manifest', () => {
  it('records version, label, export time and a row count per tab', () => {
    const manifest = buildBackupManifest(tabs, meta)

    expect(manifest).toMatchObject({
      format: BACKUP_FORMAT,
      formatVersion: 1,
      appVersion: '2.1.0',
      spreadsheetLabel: 'حساب خانه',
      exportedAt: '2026-10-12T08:00:00.000Z'
    })
    expect(manifest.tabs.map(tab => [tab.name, tab.rows])).toEqual([
      ['رکوردها', 1],
      ['چک‌ها', 0],
      ['a/b', 0],
      ['a-b', 0]
    ])
  })

  it('gives every tab a safe, unique file name', () => {
    const files = buildBackupManifest(tabs, meta).tabs.map(tab => tab.file)

    expect(files).toEqual(['رکوردها.csv', 'چک‌ها.csv', 'a-b.csv', 'a-b (2).csv'])
  })
})

describe('backup zip', () => {
  it('round-trips the manifest and every tab with Persian names', () => {
    const manifest = buildBackupManifest(tabs, meta)

    const { manifest: read, csvByTab } = unpackBackup(packBackup(manifest, tabs))

    expect(read).toEqual(manifest)
    expect(csvByTab.get('رکوردها')).toContain('a1,1500')
    expect(csvByTab.get('a/b')).toContain('x')
    expect(csvByTab.get('a-b')).toContain('y')
  })

  it('rejects a file that is not a zip, or a zip without our manifest', () => {
    expect(() => unpackBackup(strToU8('not a zip'))).toThrow(INVALID_BACKUP_MESSAGE)
    expect(() => unpackBackup(zipSync({ 'a.csv': strToU8('x') }))).toThrow(INVALID_BACKUP_MESSAGE)
    expect(() =>
      unpackBackup(zipSync({ 'manifest.json': strToU8('{"format":"other","tabs":[]}') }))
    ).toThrow(INVALID_BACKUP_MESSAGE)
  })

  it('refuses a backup made by a newer backup format', () => {
    const manifest = { ...buildBackupManifest([], meta), formatVersion: 99 }

    expect(() => unpackBackup(packBackup(manifest, []))).toThrow(/نسخه جدیدتر/)
  })
})
