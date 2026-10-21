import { beforeEach, describe, expect, it } from 'vitest'

import {
  clearPreparedRecords,
  isPreparedRecently,
  markFreshlyCreated,
  markPreparedRecently,
  PREPARED_MAX_AGE_MS,
  SESSION_PREPARED_KEY,
  takeFreshlyCreated
} from './spreadsheetPreparedSession'

describe('which spreadsheets were checked recently', () => {
  beforeEach(() => localStorage.clear())

  it('remembers each spreadsheet on its own, not only the last one', () => {
    markPreparedRecently('a', 'sig-a', 1_000)
    markPreparedRecently('b', 'sig-b', 2_000)

    expect(isPreparedRecently('a', 'sig-a', 3_000)).toBe(true)
    expect(isPreparedRecently('b', 'sig-b', 3_000)).toBe(true)
    expect(isPreparedRecently('c', 'sig-c', 3_000)).toBe(false)
  })

  it('asks for a new check when an app update changed the tabs or the day passed', () => {
    markPreparedRecently('a', 'sig-a', 1_000)

    expect(isPreparedRecently('a', 'sig-a-new', 2_000)).toBe(false)
    expect(isPreparedRecently('a', 'sig-a', 1_000 + PREPARED_MAX_AGE_MS)).toBe(false)
    expect(isPreparedRecently('a', 'sig-a', 1_000 + PREPARED_MAX_AGE_MS - 1)).toBe(true)
  })

  it('reads the first version\'s single record as "check once"', () => {
    localStorage.setItem(SESSION_PREPARED_KEY, JSON.stringify({ signature: 'sig-a', at: 1_000 }))

    expect(isPreparedRecently('a', 'sig-a', 2_000)).toBe(false)
  })

  it('keeps only the newest records', () => {
    for (let index = 0; index < 25; index += 1) markPreparedRecently(`s${index}`, 'sig', index)

    expect(isPreparedRecently('s0', 'sig', 30)).toBe(false)
    expect(isPreparedRecently('s24', 'sig', 30)).toBe(true)
  })

  it('forgets everything on clear', () => {
    markPreparedRecently('a', 'sig-a', 1_000)
    clearPreparedRecords()

    expect(isPreparedRecently('a', 'sig-a', 2_000)).toBe(false)
  })

  it('hands a freshly created spreadsheet over exactly once', () => {
    markFreshlyCreated('new')

    expect(takeFreshlyCreated('new')).toBe(true)
    expect(takeFreshlyCreated('new')).toBe(false)
    expect(takeFreshlyCreated('other')).toBe(false)
  })
})
