import { describe, expect, it } from 'vitest'

import {
  balanceHeadline,
  canEditRecord,
  latestRecord,
  matchesPerson,
  monthTotals,
  personName,
  recordLockNote,
  sharedPair,
  splitLabel,
  splitPreview
} from './sharedViewModel'
import { monthKeyOfIso } from '../../services/buildingMonths'
import { balanceOfRows } from '../../services/sharedSettlement'

const OWNER = 'nima@example.com'
const PARTNER = 'mina@example.com'
const VIEWER = 'sara@example.com'
const NAMES = { [OWNER]: 'نیما', [PARTNER]: 'مینا', [VIEWER]: 'سارا' }

describe('personName', () => {
  it('says «شما» for me and the known name or the e-mail local part for others', () => {
    expect(personName(OWNER, OWNER, NAMES)).toBe('شما')
    expect(personName(PARTNER, OWNER, NAMES)).toBe('مینا')
    expect(personName('Reza.K@Example.com', OWNER, {})).toBe('reza.k')
  })
})

describe('balanceHeadline', () => {
  it('tells me I owe the partner', () => {
    expect(balanceHeadline({ [OWNER]: -3140000, [PARTNER]: 3140000 }, OWNER, NAMES)).toBe(
      'شما به مینا بدهکارید'
    )
  })

  it('tells me the partner owes me', () => {
    expect(balanceHeadline({ [OWNER]: 3140000, [PARTNER]: -3140000 }, OWNER, NAMES)).toBe(
      'مینا به شما بدهکار است'
    )
  })

  it('says the account is settled below one toman', () => {
    expect(balanceHeadline({ [OWNER]: 0, [PARTNER]: 0 }, OWNER, NAMES)).toBe('حساب شما صاف است')
    expect(balanceHeadline({ [OWNER]: 0.4, [PARTNER]: -0.4 }, PARTNER, NAMES)).toBe(
      'حساب شما صاف است'
    )
  })

  it('names both people for a viewer', () => {
    expect(balanceHeadline({ [OWNER]: 500, [PARTNER]: -500 }, VIEWER, NAMES)).toBe(
      'مینا به نیما بدهکار است'
    )
    expect(balanceHeadline({ [OWNER]: 0, [PARTNER]: 0 }, VIEWER, NAMES)).toBe('حساب صاف است')
  })
})

describe('canEditRecord', () => {
  const base = { me: OWNER, creator: OWNER, canRecord: true, canEditOthers: false }

  it('lets the creator edit an own record', () => {
    expect(canEditRecord(base)).toBe(true)
    expect(canEditRecord({ ...base, creator: ' NIMA@example.com ' })).toBe(true)
  })

  it('never lets a viewer edit, not even an own record', () => {
    expect(canEditRecord({ ...base, canRecord: false })).toBe(false)
    expect(canEditRecord({ ...base, canRecord: false, canEditOthers: true })).toBe(false)
  })

  it("refuses another person's record without editOthers", () => {
    expect(canEditRecord({ ...base, creator: PARTNER })).toBe(false)
    expect(canEditRecord({ ...base, creator: '' })).toBe(false)
  })

  it("allows another person's record with editOthers", () => {
    expect(canEditRecord({ ...base, creator: PARTNER, canEditOthers: true })).toBe(true)
  })
})

describe('recordLockNote', () => {
  it('explains the lock to a viewer and to a partner on the other record', () => {
    expect(recordLockNote({ canRecord: false, creatorName: 'نیما' })).toBe(
      'ناظر نمی‌تواند ثبت‌ها را تغییر بدهد.'
    )
    expect(recordLockNote({ canRecord: true, creatorName: 'نیما' })).toBe(
      'این ثبت را نیما انجام داده و شما دسترسی «ویرایش ثبت‌های دیگران» ندارید.'
    )
  })

  it('names the settle permission on a settlement, never the viewer', () => {
    expect(recordLockNote({ canRecord: false, creatorName: 'نیما', settlement: true })).toBe(
      'ثبت تسویه با دسترسی «ثبت تسویه» ممکن است.'
    )
    expect(recordLockNote({ canRecord: true, creatorName: 'نیما', settlement: true })).toBe(
      'این ثبت را نیما انجام داده و شما دسترسی «ویرایش ثبت‌های دیگران» ندارید.'
    )
  })
})

describe('latestRecord', () => {
  const rows = [
    { id: 'a', rowNumber: 2 },
    { id: 'b', rowNumber: 3 }
  ]

  it('finds the record by id in the latest rows (its row may have shifted)', () => {
    expect(latestRecord(rows, 'b')).toEqual({ id: 'b', rowNumber: 3 })
  })

  it('is null once the record is gone, so nothing writes a stale row', () => {
    expect(latestRecord(rows, 'gone')).toBeNull()
  })
})

describe('splitPreview', () => {
  const emails: [string, string] = [OWNER, PARTNER]

  it('halves an equal split, the payer bearing the smaller half of an odd amount', () => {
    expect(splitPreview(850000, 'equal', emails)).toEqual([
      { email: OWNER, share: 425000 },
      { email: PARTNER, share: 425000 }
    ])
    expect(splitPreview(1001, 'equal', emails, PARTNER)).toEqual([
      { email: OWNER, share: 501 },
      { email: PARTNER, share: 500 }
    ])
  })

  it('puts an only split on that person', () => {
    expect(splitPreview(1200000, `only:${PARTNER}`, emails)).toEqual([
      { email: OWNER, share: 0 },
      { email: PARTNER, share: 1200000 }
    ])
  })

  it('shows zero shares before an amount', () => {
    expect(splitPreview(0, 'equal', emails)).toEqual([
      { email: OWNER, share: 0 },
      { email: PARTNER, share: 0 }
    ])
  })
})

describe('splitLabel', () => {
  it('reads the split for a row', () => {
    expect(splitLabel('equal', OWNER, NAMES)).toBe('نصف‌نصف')
    expect(splitLabel(`only:${PARTNER}`, OWNER, NAMES)).toBe('فقط برای مینا')
    expect(splitLabel(`only:${OWNER}`, OWNER, NAMES)).toBe('فقط برای شما')
  })
})

describe('monthTotals', () => {
  const month = monthKeyOfIso('2026-10-25')
  const row = (type: 'income' | 'expense', values: Record<string, string>) => ({ type, values })

  it('sums the month expenses and who paid them, without settlements or incomes', () => {
    const totals = monthTotals(
      [
        row('expense', { date: '2026-10-24', amount: '850000', sharedPayer: OWNER }),
        row('expense', { date: '2026-10-25', amount: '200000', sharedPayer: 'MINA@example.com' }),
        row('expense', { date: '2026-10-25', amount: '300000', sharedPayer: OWNER }),
        row('expense', {
          date: '2026-10-25',
          amount: '999',
          category: 'تسویه',
          sharedPayer: PARTNER
        }),
        row('income', { date: '2026-10-25', amount: '60000000' }),
        row('expense', { date: '2026-09-01', amount: '777', sharedPayer: OWNER })
      ],
      month
    )

    expect(totals).toEqual({ total: 1350000, paid: { [OWNER]: 1150000, [PARTNER]: 200000 } })
  })
})

describe('matchesPerson', () => {
  it('filters by the payer, and an income by its creator', () => {
    expect(matchesPerson({ sharedPayer: OWNER, sharedCreator: PARTNER }, OWNER)).toBe(true)
    expect(matchesPerson({ sharedPayer: OWNER }, PARTNER)).toBe(false)
    expect(matchesPerson({ sharedCreator: 'Mina@Example.com' }, PARTNER)).toBe(true)
    expect(matchesPerson({ sharedPayer: OWNER }, 'all')).toBe(true)
  })
})

describe('sharedPair', () => {
  it('is the owner and the single partner, or null without a partner', () => {
    expect(
      sharedPair([
        { email: VIEWER, role: 'viewer' },
        { email: PARTNER, role: 'partner' },
        { email: OWNER, role: 'owner' }
      ])
    ).toEqual([OWNER, PARTNER])
    expect(sharedPair([{ email: OWNER, role: 'owner' }])).toBeNull()
  })

  const row = (payer: string, split: string, category = 'خوراک') => ({
    type: 'expense' as const,
    values: { amount: '1000', category, sharedPayer: payer, sharedSplit: split }
  })

  const rows = [
    row(OWNER, 'equal'),
    row(PARTNER, `only:${OWNER}`),
    row(OWNER, `only:${PARTNER}`),
    row(PARTNER, `only:${OWNER}`, 'تسویه')
  ]

  it('keeps the partner the rows name once their member row is gone (left or removed)', () => {
    const full = [
      { email: OWNER, role: 'owner' },
      { email: PARTNER, role: 'partner' },
      { email: VIEWER, role: 'viewer' }
    ]
    const left = full.filter(member => member.role !== 'partner')

    expect(sharedPair(left, rows)).toEqual([OWNER, PARTNER])
    expect(balanceOfRows(rows, sharedPair(left, rows)!)).toEqual(
      balanceOfRows(rows, sharedPair(full)!)
    )
    expect(balanceOfRows(rows, sharedPair(left, rows)!).net[OWNER]).not.toBe(0)
  })

  it('stays null when the rows name nobody but the owner', () => {
    const owner = [{ email: OWNER, role: 'owner' }]

    expect(sharedPair(owner, [row(OWNER, 'equal')])).toBeNull()
    expect(sharedPair(owner, [])).toBeNull()
  })
})
