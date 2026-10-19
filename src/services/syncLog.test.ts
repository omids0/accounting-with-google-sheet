import { beforeEach, describe, expect, it } from 'vitest'

import { SYNC_LOG_LIMIT, clearSyncLog, formatSyncLog, getSyncLog, logSync } from './syncLog'
import { addOutboxEntry } from './syncOutbox'
import { buildSyncReport } from './syncReport'

describe('sync log', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('keeps events in order and drops the oldest past the limit', () => {
    for (let index = 0; index < SYNC_LOG_LIMIT + 5; index += 1) logSync(`event-${index}`)

    const log = getSyncLog()

    expect(log).toHaveLength(SYNC_LOG_LIMIT)
    expect(log[0].event).toBe('event-5')
    expect(log[log.length - 1].event).toBe(`event-${SYNC_LOG_LIMIT + 4}`)
  })

  it('collapses an identical event repeated back to back', () => {
    logSync('write:failed', 'append «هزینه»')
    logSync('write:failed', 'append «هزینه»')
    logSync('write:failed', 'append «درآمد»')

    expect(getSyncLog()).toHaveLength(2)
  })

  it('shortens spreadsheet ids inside error texts', () => {
    logSync(
      'pull:failed',
      'Requested entity 1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd was not found'
    )

    expect(getSyncLog()[0].detail).toBe('Requested entity …abcd was not found')
  })

  it('clears the diary', () => {
    logSync('state:idle')
    clearSyncLog()

    expect(getSyncLog()).toEqual([])
  })

  it('prints one line per event', () => {
    logSync('flush:start', '2 تغییر در صف')

    expect(formatSyncLog(getSyncLog())).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} {2}flush:start {2}2 تغییر در صف$/
    )
  })
})

describe('sync report', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('lists the queued writes and the recent events without cell values', () => {
    addOutboxEntry('sheet-1', {
      type: 'append',
      sheetName: 'تراکنش‌ها',
      row: ['1', 'محرمانه', '999']
    })
    logSync('flush:start', '1 تغییر در صف')

    const report = buildSyncReport('sheet-1')

    expect(report).toContain('در صف: 1')
    expect(report).toContain('append روی «تراکنش‌ها»')
    expect(report).toContain('flush:start')
    expect(report).not.toContain('محرمانه')
  })
})
