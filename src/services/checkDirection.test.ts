import { describe, expect, it } from 'vitest'

import {
  checkRecordType,
  checksOfDirection,
  checkTypeLabel,
  headerDirectionColumn,
  parseCheckDirection,
  unknownDirectionCell
} from './checkDirection'
import { checkToRow, rowToCheck } from './checkRows'
import { checkCounterpartyLabel } from '../components/checks/checkDirectionOptions'
import type { Check } from '../types'

describe('check direction', () => {
  it('reads «دریافتی» and its variants as received', () => {
    for (const cell of [
      'دریافتی',
      ' دریافتی ',
      'دریافتـی',
      'دريافتي',
      'دری‌افتی',
      'دریافت',
      'received',
      ' Received ',
      'RECEIVED'
    ]) {
      expect(parseCheckDirection(cell), cell).toBe('received')
    }
  })

  it('reads a hand-typed cell by its stem', () => {
    for (const cell of ['چک دریافتی', 'دریافتی (نقدی)', 'دريافتي', 'receive', 'Check received']) {
      expect(parseCheckDirection(cell), cell).toBe('received')
      expect(unknownDirectionCell(cell), cell).toBe('')
    }
    for (const cell of ['چک پرداختی', 'پرداخت‌شده', 'payable', 'paid (cash)']) {
      expect(parseCheckDirection(cell), cell).toBe('paid')
      expect(unknownDirectionCell(cell), cell).toBe('')
    }
  })

  it('reads a cell with both stems or neither as paid, and shows what it says', () => {
    expect(parseCheckDirection('دریافت و پرداخت')).toBe('paid')
    expect(unknownDirectionCell('دریافت و پرداخت')).toBe('دریافت و پرداخت')
    expect(unknownDirectionCell('نقدی')).toBe('نقدی')
  })

  it('reads a missing cell and every payable spelling as paid, so old rows keep their meaning', () => {
    for (const cell of ['پرداختی', 'پرداخت', 'paid', 'Paid', '', '  ', undefined, null]) {
      expect(parseCheckDirection(cell)).toBe('paid')
    }
  })

  it('reads an unknown word as paid but keeps it to show', () => {
    expect(parseCheckDirection('نقدی')).toBe('paid')
    expect(unknownDirectionCell(' نقدی ')).toBe('نقدی')
    expect(unknownDirectionCell('دریافتی')).toBe('')
    expect(unknownDirectionCell('پرداختی')).toBe('')
    expect(unknownDirectionCell('')).toBe('')
    expect(unknownDirectionCell(undefined)).toBe('')
  })

  it('finds the header label however it is spelled', () => {
    expect(headerDirectionColumn(['الف', 'ب', 'نوع چک'])).toBe(2)
    expect(headerDirectionColumn(['الف', ' نوع‌ چک '])).toBe(1)
    expect(headerDirectionColumn(['الف'])).toBe(-1)
    expect(headerDirectionColumn(null)).toBe(-1)
  })

  it('passes a payable as an expense and a received check as income', () => {
    expect(checkRecordType({ direction: 'paid' })).toBe('expense')
    expect(checkRecordType({ direction: 'received' })).toBe('income')
  })

  it('words the type and the other side of the check', () => {
    expect(checkTypeLabel({ direction: 'paid' })).toBe('چک پرداختی')
    expect(checkTypeLabel({ direction: 'received' })).toBe('چک دریافتی')
    expect(checkCounterpartyLabel('paid')).toBe('در وجه (گیرنده)')
    expect(checkCounterpartyLabel('received')).toBe('از طرف (صادرکننده)')
  })

  it('filters by type', () => {
    const items = [{ direction: 'paid' as const }, { direction: 'received' as const }]

    expect(checksOfDirection(items, 'received')).toEqual([{ direction: 'received' }])
  })
})

const check: Check = {
  id: 'c1',
  createdAt: '',
  checkNumber: '1',
  direction: 'received',
  counterparty: 'علی',
  amount: 5,
  creationDate: '',
  dueDate: '',
  paid: false,
  paidAt: ''
}

describe('check rows', () => {
  it('reads the type from the given column only', () => {
    const row = ['c1', '', '1', 'علی', '5', '', '', 'خیر', '', '', '', '', '', 'x', 'دریافتی']

    expect(rowToCheck(row, 2, 14).direction).toBe('received')
    expect(rowToCheck(row, 2, 13).direction).toBe('paid')
    expect(rowToCheck(row, 2, 13).directionRaw).toBe('x')
    expect(rowToCheck(row, 2).direction).toBe('paid')
  })

  it('never drops the type of a received check for want of a column', () => {
    expect(() => checkToRow(check, -1)).toThrow()
    expect(() => checkToRow({ ...check, direction: 'paid' }, -1)).not.toThrow()
  })

  it('writes onto the stored row: nothing the app does not own is touched', () => {
    const stored = ['c1', '', '', '', '', '', '', '', '', '', '', 'att', 'me@x.com', 'خصوصی']
    const row = checkToRow(check, 14, stored)

    expect(row.slice(11, 14)).toEqual(['att', 'me@x.com', 'خصوصی'])
    expect(row[14]).toBe('دریافتی')
    expect(row[3]).toBe('علی')
  })

  it('keeps the writer when nobody is signed in, since the stored cell is not blanked', () => {
    const stored = ['c1', '', '', '', '', '', '', '', '', '', '', '', 'me@x.com']

    expect(checkToRow({ ...check, direction: 'paid' }, -1, stored)[12]).toBe('me@x.com')
  })

  it('does not write a type without a column', () => {
    expect(checkToRow({ ...check, direction: 'paid' }, -1)).toHaveLength(11)
  })
})
