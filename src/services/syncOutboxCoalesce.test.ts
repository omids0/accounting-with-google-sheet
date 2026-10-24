import { beforeEach, describe, expect, it } from 'vitest'

import { cellsMatchForCompare, rowsMatchForCompare } from './sheetsCellValues'
import {
  addOutboxEntry,
  getFailedOutboxEntries,
  getOutboxEntries,
  moveOutboxEntryToFailed,
  type OutboxOperation
} from './syncOutbox'
import {
  clearInFlight,
  coalesceUpdate,
  dropSupersededFailures,
  markInFlight,
  queuedIdentities
} from './syncOutboxCoalesce'

const ID = 'coalesce-sheet'

const TAB = 'موجودی ماهانه'

const update = (
  amount: string,
  expected: string,
  rowNumber = 7
): Extract<OutboxOperation, { type: 'update' }> => ({
  type: 'update',
  sheetName: TAB,
  rowNumber,
  row: ['1405-08', amount, 't', 'n'],
  expectedRow: ['1405-08', expected, 't0', 'n']
})

describe('coalescing queued updates of one row', () => {
  beforeEach(() => localStorage.clear())

  it('replaces an earlier waiting update and inherits the base the sheet really holds', () => {
    addOutboxEntry(ID, update('2', '1'))

    const merged = coalesceUpdate(ID, update('3', '2'))

    expect(getOutboxEntries(ID)).toHaveLength(0)
    expect(merged).toMatchObject({ row: ['1405-08', '3', 't', 'n'] })
    expect(merged.type === 'update' && merged.expectedRow?.[1]).toBe('1')
  })

  it('keeps the earliest base through a chain of updates', () => {
    addOutboxEntry(ID, update('2', '1'))
    addOutboxEntry(ID, coalesceUpdate(ID, update('3', '2')))

    const merged = coalesceUpdate(ID, update('4', '3'))

    expect(getOutboxEntries(ID)).toHaveLength(0)
    expect(merged.type === 'update' && merged.expectedRow?.[1]).toBe('1')
  })

  it('drops parked updates of the same row, because the new write supersedes them', () => {
    const entry = addOutboxEntry(ID, update('2', '1'))

    moveOutboxEntryToFailed(ID, entry.id, 'row not found')

    const merged = coalesceUpdate(ID, update('3', '2'))

    expect(getFailedOutboxEntries(ID)).toHaveLength(0)
    expect(merged.type === 'update' && merged.expectedRow?.[1]).toBe('2')
  })

  it('leaves other rows, other tabs, other records at the same row and other kinds alone', () => {
    addOutboxEntry(ID, update('2', '1', 8))
    addOutboxEntry(ID, { ...update('2', '1'), sheetName: 'دیگر' })
    addOutboxEntry(ID, {
      ...update('2', '1'),
      row: ['1405-09', '2', 't', 'n'],
      expectedRow: ['1405-09', '1', 't', 'n']
    })
    addOutboxEntry(ID, { type: 'append', sheetName: TAB, row: ['1405-08', '2'] })

    coalesceUpdate(ID, update('3', '2'))

    expect(getOutboxEntries(ID)).toHaveLength(4)
  })

  it('never replaces a write that is being sent right now', () => {
    const entry = addOutboxEntry(ID, update('2', '1'))

    markInFlight(entry.id)
    try {
      const merged = coalesceUpdate(ID, update('3', '2'))

      expect(getOutboxEntries(ID)).toHaveLength(1)
      expect(merged.type === 'update' && merged.expectedRow?.[1]).toBe('2')
    } finally {
      clearInFlight(entry.id)
    }
  })

  it('leaves deletes and appends untouched', () => {
    const append: OutboxOperation = { type: 'append', sheetName: TAB, row: ['x'] }

    expect(coalesceUpdate(ID, append)).toBe(append)
  })

  it('drops parked updates that a later parked update of the same row made pointless', () => {
    for (const [amount, base] of [
      ['2', '1'],
      ['3', '2'],
      ['4', '3']
    ]) {
      moveOutboxEntryToFailed(ID, addOutboxEntry(ID, update(amount, base)).id, 'x')
    }
    moveOutboxEntryToFailed(ID, addOutboxEntry(ID, update('9', '8', 9)).id, 'x')

    expect(dropSupersededFailures(ID)).toBe(2)
    expect(getFailedOutboxEntries(ID)).toHaveLength(2)
  })

  it('reports which tab/month already has a waiting or parked write', () => {
    addOutboxEntry(ID, update('2', '1'))
    moveOutboxEntryToFailed(
      ID,
      addOutboxEntry(ID, {
        ...update('2', '1'),
        row: ['1405-09', '2'],
        expectedRow: ['1405-09', '1']
      }).id,
      'x'
    )

    expect([...queuedIdentities(ID, TAB)].sort()).toEqual(['1405-08', '1405-09'])
    expect(queuedIdentities(ID, 'دیگر').size).toBe(0)
  })
})

describe('comparing cells that Google rounded to 15 significant digits', () => {
  it('matches the same decimal number, not different ones', () => {
    expect(cellsMatchForCompare('52305378.29999998', '52305378.3')).toBe(true)
    expect(cellsMatchForCompare('10931882.299999997', '10931882.3')).toBe(true)
    expect(cellsMatchForCompare('0.10000000894069672', '0.100000008940697')).toBe(true)
    expect(cellsMatchForCompare('52305378.3', '52305378.4')).toBe(false)
  })

  it('keeps whole numbers, ids and card numbers exact', () => {
    expect(cellsMatchForCompare('1500000', '1500001')).toBe(false)
    expect(cellsMatchForCompare('6037997112345678', '6037997112345679')).toBe(false)
    expect(cellsMatchForCompare('09121234567', '9121234567')).toBe(false)
    expect(cellsMatchForCompare('', '0.5')).toBe(false)
  })

  it('still ignores thousands separators and Persian digits', () => {
    expect(cellsMatchForCompare('1,500,000', '1500000')).toBe(true)
    expect(cellsMatchForCompare('۱۲۳٫۵', '123.5')).toBe(false)
  })

  it('compares whole rows with the tolerance', () => {
    expect(rowsMatchForCompare(['1405-08', '52305378.29999998'], ['1405-08', '52305378.3'])).toBe(
      true
    )
    expect(rowsMatchForCompare(['1405-08', '1'], ['1405-09', '1'])).toBe(false)
  })
})
