import { describe, expect, it } from 'vitest'

import { toBackupFile } from './driveBackups'

const listed = (appProperties?: Record<string, string>) => ({
  id: 'f1',
  name: 'حساب کتاب · پشتیبان · ۱۴۰۵-۰۷-۲۰ ۱۸-۴۰.zip',
  size: '2048',
  createdTime: '2026-10-12T15:10:00.000Z',
  appProperties
})

describe('toBackupFile', () => {
  it('reads files written before pre-update copies existed', () => {
    expect(toBackupFile(listed({ acctBackup: 'auto' })).kind).toBe('auto')
    expect(toBackupFile(listed({ acctBackup: 'manual' })).kind).toBe('manual')
    // Made by hand in Drive, or by a version that wrote no marker at all.
    expect(toBackupFile(listed({})).kind).toBe('manual')
    expect(toBackupFile(listed()).kind).toBe('manual')
  })

  it('tells the develop and production pre-update copies apart and reads their version', () => {
    const dev = toBackupFile(listed({ acctBackup: 'update-dev', acctVersion: '2.17.0-dev' }))
    const prod = toBackupFile(listed({ acctBackup: 'update-prod', acctVersion: '2.17.0' }))

    expect(dev).toMatchObject({ kind: 'update-dev', appVersion: '2.17.0-dev' })
    expect(prod).toMatchObject({ kind: 'update-prod', appVersion: '2.17.0' })
  })

  it('has no version on older files', () => {
    expect('appVersion' in toBackupFile(listed({ acctBackup: 'auto' }))).toBe(false)
  })

  it('treats an unknown marker as a manual copy, so it is never pruned', () => {
    expect(toBackupFile(listed({ acctBackup: 'update-staging' })).kind).toBe('manual')
  })
})
