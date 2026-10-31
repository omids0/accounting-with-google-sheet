import { describe, expect, it } from 'vitest'

import { sharedPair } from './sharedViewModel'
import { balanceOfRows } from '../../services/sharedSettlement'
import { effectiveSplit } from '../form/sharedFields'

const OWNER = 'nima@example.com'
const PARTNER = 'mina@example.com'

const old = (payer: string, split: string) => ({
  type: 'expense' as const,
  values: { amount: '1000000', category: 'خوراک', sharedPayer: payer, sharedSplit: split }
})

// Rows from the time the partner was a member; the partner then left or was removed.
const rows = [old(OWNER, 'equal'), old(PARTNER, `only:${OWNER}`)]
const ownerOnly = [{ email: OWNER, role: 'owner' }]
const invited = [...ownerOnly, { email: PARTNER, role: 'partner' }]

describe('an expense saved while no partner is a member', () => {
  it('is only-me and leaves the former partner balance unchanged', () => {
    const people = sharedPair(ownerOnly) ?? [OWNER]
    const pair = sharedPair(ownerOnly, rows)!
    const split = effectiveSplit('equal', people, OWNER)
    const before = balanceOfRows(rows, pair).net
    const after = balanceOfRows(
      [...rows, old(OWNER, split)].map(r => ({ ...r })),
      pair
    ).net

    // The picked «نصف‌نصف» never reaches the sheet: it would put 250,000 on the former partner.
    expect(split).toBe(`only:${OWNER}`)
    expect(after[PARTNER]).toBe(before[PARTNER])
    expect(after[OWNER]).toBe(before[OWNER])
    expect(balanceOfRows([...rows, old(OWNER, 'equal')], pair).net[PARTNER]).not.toBe(
      before[PARTNER]
    )
  })

  it('also holds when no partner ever joined', () => {
    expect(effectiveSplit('', [OWNER], OWNER)).toBe(`only:${OWNER}`)
  })

  it('goes back to the picked split (default equal) after a re-invite', () => {
    const people = sharedPair(invited) ?? [OWNER]

    expect(effectiveSplit('equal', people, OWNER)).toBe('equal')
    expect(effectiveSplit('', people, OWNER)).toBe('equal')
    expect(effectiveSplit(`only:${PARTNER}`, people, OWNER)).toBe(`only:${PARTNER}`)
  })
})
