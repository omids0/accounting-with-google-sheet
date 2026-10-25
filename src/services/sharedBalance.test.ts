import { describe, expect, it } from 'vitest'

import { computeBalance, type SharedRecordLite } from './sharedBalance'

const A = 'a@mail.com'
const B = 'b@mail.com'

const expense = (amount: number, payer: string, split: SharedRecordLite['split'] = 'equal') =>
  ({ type: 'expense', amount, payer, split } as SharedRecordLite)

/** The prototype's month. */
const RECORDS: SharedRecordLite[] = [
  expense(18_000_000, A),
  expense(1_850_000, B),
  expense(640_000, A),
  expense(420_000, A, `only:${B}`),
  expense(1_350_000, B)
]

const SETTLED = [{ from: B, to: A, amount: 5_000_000 }]

describe('computeBalance', () => {
  it('matches the prototype: A is owed 3,140,000 after B settled 5,000,000', () => {
    const balance = computeBalance(RECORDS, SETTLED, [A, B])

    expect(balance.net[A]).toBe(3_140_000)
    expect(balance.net[B]).toBe(-3_140_000)
    expect(balance.paid).toEqual({ [A]: 19_060_000, [B]: 3_200_000 })
    expect(balance.share).toEqual({ [A]: 10_920_000, [B]: 11_340_000 })
  })

  it('never moves the balance for an income', () => {
    const income: SharedRecordLite = {
      type: 'income',
      amount: 60_000_000,
      payer: A,
      split: 'equal'
    }

    expect(computeBalance([...RECORDS, income], SETTLED, [A, B])).toEqual(
      computeBalance(RECORDS, SETTLED, [A, B])
    )
  })

  it('leaves the balance at zero when the payer bears their own expense', () => {
    const balance = computeBalance([expense(700_000, A, `only:${A}`)], [], [A, B])

    expect(balance.net).toEqual({ [A]: 0, [B]: 0 })
  })

  it('matches e-mails whatever their case', () => {
    const balance = computeBalance([expense(100, 'A@Mail.com ', `only:${B}`)], [], [A, B])

    expect(balance.net).toEqual({ [A]: 100, [B]: -100 })
  })

  it('starts both people at zero with nothing recorded', () => {
    expect(computeBalance([], [], [A, B])).toEqual({
      net: { [A]: 0, [B]: 0 },
      paid: { [A]: 0, [B]: 0 },
      share: { [A]: 0, [B]: 0 }
    })
  })
})
