import { describe, expect, it } from 'vitest'

import {
  chargeDebtor,
  chargeReference,
  creditsOf,
  dedupeChargeReferences,
  missingIssueMonths,
  unitBalance,
  unitOpenReceivables,
  type ChargeResident
} from './buildingCharges'
import type { Receivable } from '../types'
import { findGregorianForJalali, toIsoDate } from '../utils/jalaliDate'

const receivable = (
  reference: string,
  amount: number,
  paid: number[] = [],
  paidAt = '2026-10-05'
): Receivable => ({
  id: reference,
  createdAt: '',
  title: reference,
  debtor: 'احمدی',
  category: 'شارژ ساختمان',
  amount,
  borrowDate: '2026-10-01',
  note: '',
  payments: paid.map((value, index) => ({
    id: `${reference}-${index}`,
    amount: value,
    paidAt,
    note: ''
  })),
  reference
})

describe('chargeDebtor', () => {
  const stay = (
    personId: string,
    role: 'owner' | 'tenant',
    current = true,
    unitId = 'u1'
  ): ChargeResident => ({ unitId, personId, name: personId, role, current })

  it('bills the tenant while one lives there, else the owner', () => {
    const both = [stay('owner', 'owner'), stay('tenant', 'tenant')]

    expect(chargeDebtor({ id: 'u1' }, both)).toEqual({
      id: 'tenant',
      name: 'tenant',
      role: 'tenant'
    })
    expect(
      chargeDebtor({ id: 'u1' }, [stay('owner', 'owner'), stay('old', 'tenant', false)])
    ).toEqual({
      id: 'owner',
      name: 'owner',
      role: 'owner'
    })
  })

  it('is null for a unit with neither, and ignores other units', () => {
    expect(chargeDebtor({ id: 'u1' }, [])).toBeNull()
    expect(chargeDebtor({ id: 'u1' }, [stay('x', 'owner', false)])).toBeNull()
    expect(chargeDebtor({ id: 'u1' }, [stay('x', 'owner', true, 'u2')])).toBeNull()
  })
})

describe('references and credit', () => {
  it('keys a charge by unit and month', () => {
    expect(chargeReference('u1', '1405-07')).toBe('charge:u1:1405-07')
  })

  it('reads the credit a unit holds from its credit rows, minus what issues spent', () => {
    const spent: Receivable = {
      ...receivable('credit:u1', 500_000),
      payments: [{ id: 'p', amount: 200_000, paidAt: '2026-10-01', note: '', fromCredit: true }]
    }

    expect(
      creditsOf([
        spent,
        receivable('credit:u2', 100_000),
        receivable('credit:u3', 5, [5]),
        receivable('charge:u1:1405-07', 9)
      ])
    ).toEqual([
      { unitId: 'u1', amount: 300_000 },
      { unitId: 'u2', amount: 100_000 }
    ])
  })

  it('a credit row is never a debt of the unit', () => {
    const items = [receivable('credit:u1', 500_000), receivable('charge:u1:1405-07', 100)]

    expect(unitBalance('u1', items, creditsOf(items))).toMatchObject({ open: 100, credit: 500_000 })
  })
})

describe('allocation order', () => {
  it('puts a previous debt first, then months, then shares of the month', () => {
    const items = [
      receivable('share:u1:r1', 3),
      receivable('charge:u1:1405-07', 2),
      receivable('opening:u1', 1),
      receivable('charge:u1:1405-05', 4)
    ]

    expect(unitOpenReceivables('u1', items).map(item => item.reference)).toEqual([
      'opening:u1',
      'charge:u1:1405-05',
      'charge:u1:1405-07',
      'share:u1:r1'
    ])
  })
})

describe('missingIssueMonths', () => {
  const issued = (monthKey: string) => receivable(`charge:u1:${monthKey}`, 1)

  // 1405-08-05 (Jalali).
  const today = toIsoDate(findGregorianForJalali(1405, 8, 5))

  it('before the first issue only the due month comes back (the first charge is manual)', () => {
    expect(missingIssueMonths({ issueDay: 1 }, [], today)).toEqual(['1405-08'])
    expect(missingIssueMonths({ issueDay: 5 }, [], today)).toEqual(['1405-08'])
    expect(missingIssueMonths({ issueDay: 6 }, [], today)).toEqual(['1405-07'])
  })

  it('lists every month since the last issue, oldest first', () => {
    expect(missingIssueMonths({ issueDay: 1 }, [issued('1405-05')], today)).toEqual([
      '1405-06',
      '1405-07',
      '1405-08'
    ])
  })

  it('is empty once the due month is issued, and waits for the issue day', () => {
    expect(missingIssueMonths({ issueDay: 1 }, [issued('1405-08')], today)).toEqual([])
    expect(missingIssueMonths({ issueDay: 6 }, [issued('1405-07')], today)).toEqual([])
    expect(missingIssueMonths({ issueDay: 1 }, [issued('1405-07')], today)).toEqual(['1405-08'])
  })

  it('goes back at most twelve months', () => {
    expect(missingIssueMonths({ issueDay: 1 }, [issued('1404-01')], today)).toHaveLength(12)
  })
})

describe('dedupeChargeReferences', () => {
  const row = (reference: string, rowNumber: number, paid: number[] = []) => ({
    ...receivable(reference, 100, paid),
    id: `${reference}#${rowNumber}`,
    rowNumber
  })

  it('keeps the earliest row of a reference and removes later unpaid ones', () => {
    const rows = [
      row('charge:u1:1405-07', 5),
      row('charge:u1:1405-07', 3),
      row('charge:u2:1405-07', 4)
    ]

    const { keep, removeUnpaid } = dedupeChargeReferences(rows)

    expect(removeUnpaid.map(item => item.rowNumber)).toEqual([5])
    expect(keep.map(item => item.rowNumber)).toEqual([3, 4])
  })

  it('never removes a later duplicate that was already paid, nor repeating credit rows', () => {
    const rows = [
      row('charge:u1:1405-07', 2),
      row('charge:u1:1405-07', 3, [40]),
      row('credit:u1', 4),
      row('credit:u1', 5)
    ]

    const { keep, removeUnpaid } = dedupeChargeReferences(rows)

    expect(removeUnpaid).toEqual([])
    expect(keep).toHaveLength(4)
  })
})
