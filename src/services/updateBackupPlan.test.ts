import { describe, expect, it } from 'vitest'

import { MAX_NAME_LABEL_CHARS, updateBackupKindFor, updateBackupName } from './updateBackupPlan'

const AT = new Date(2026, 9, 31, 18, 40)

const base = {
  spreadsheetLabel: 'حساب شخصی',
  kind: 'update-prod' as const,
  fromVersion: '2.17.0',
  at: AT
}

describe('updateBackupKindFor', () => {
  it('separates the develop and the production app', () => {
    expect(updateBackupKindFor(true)).toBe('update-dev')
    expect(updateBackupKindFor(false)).toBe('update-prod')
  })
})

describe('updateBackupName', () => {
  it('carries the spreadsheet, environment, both versions and the Jalali date and time', () => {
    const name = updateBackupName({ ...base, toVersion: '2.18.0' })

    expect(name).toBe(
      'حساب شخصی · پشتیبان به‌روزرسانی · prod · 2.17.0 to 2.18.0 ۱۴۰۵-۰۸-۰۹ ۱۸-۴۰.zip'
    )
  })

  it('names the develop copy and its -dev version', () => {
    const name = updateBackupName({ ...base, kind: 'update-dev', fromVersion: '2.17.0-dev' })

    expect(name).toContain(' · dev · 2.17.0-dev ')
    expect(name).not.toContain(' to ')
  })

  it('leaves the target out when it is unknown or the same', () => {
    expect(updateBackupName({ ...base, toVersion: '' })).toContain(' · prod · 2.17.0 ')
    expect(updateBackupName({ ...base, toVersion: '2.17.0' })).toContain(' · prod · 2.17.0 ')
    expect(updateBackupName({ ...base, toVersion: '2.17.0' })).not.toContain(' to ')
  })

  it('makes names of one spreadsheet sort by time', () => {
    const early = updateBackupName({ ...base, at: new Date(2026, 9, 31, 9, 5) })
    const late = updateBackupName({ ...base, at: new Date(2026, 9, 31, 18, 40) })

    expect(early < late).toBe(true)
  })

  it('replaces characters a file system rejects', () => {
    const name = updateBackupName({ ...base, spreadsheetLabel: 'a/bc:d*e?f"g<h>i|j' })

    expect(name).not.toMatch(/[\/:*?"<>|]/)
    expect(name.endsWith('.zip')).toBe(true)
  })

  it('drops control characters and folds whitespace in the spreadsheet name', () => {
    const name = updateBackupName({ ...base, spreadsheetLabel: '  حساب\n\u0000  من\t ' })

    expect(name.startsWith('حساب من · ')).toBe(true)
  })

  it('cuts a very long spreadsheet name and keeps the rest of the name whole', () => {
    const name = updateBackupName({
      ...base,
      spreadsheetLabel: 'ب'.repeat(300),
      toVersion: '2.18.0'
    })

    expect(name.startsWith('ب'.repeat(MAX_NAME_LABEL_CHARS) + ' · ')).toBe(true)
    expect(name.length).toBeLessThan(120)
    expect(name).toContain(' · prod · 2.17.0 to 2.18.0 ')
    expect(name.endsWith('.zip')).toBe(true)
  })

  it('does not split an emoji in a cut name', () => {
    const name = updateBackupName({ ...base, spreadsheetLabel: '😀'.repeat(60) })

    expect(name).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/)
  })

  it('works without a spreadsheet name or version', () => {
    const name = updateBackupName({ ...base, spreadsheetLabel: '', fromVersion: '' })

    expect(name.startsWith('پشتیبان به‌روزرسانی · prod ')).toBe(true)
  })

  it('keeps version text to safe characters', () => {
    const name = updateBackupName({ ...base, fromVersion: '2.17.0/../x y', toVersion: '3?0' })

    expect(name).toContain(' · prod · 2.17.0..xy to 30 ')
  })
})
