import { describe, expect, it } from 'vitest'

import { buildReviewItems } from './bankSmsQueue'
import { linkedTo, M10, M20, record, singles, smsOf } from './bankSmsQueueTestKit'

describe('N1: a MANUAL payment record is consumed by the SMS that closes it', () => {
  const manual = () => record('r1', M20, { date: '2026-10-07' })
  const debt = linkedTo(['r1', 'قسط وام'])

  it('SMS1 20M and SMS2 10M pending together: the first takes the record, the second is NOT a part of it', () => {
    const [first, second] = singles(
      buildReviewItems([smsOf('m1', M20), smsOf('m2', M10)], [manual()], new Set(), debt)
    )

    expect(first).toMatchObject({ duplicatePayment: { title: 'قسط وام' }, splitUncovered: null })
    expect(second).toMatchObject({ probableDuplicate: false, splitUncovered: null })
  })

  it('SMS1 was closed earlier with «همان است» (coverage {r1: 20M}): SMS2 10M is not a part either', () => {
    const [card] = singles(
      buildReviewItems([smsOf('m2', M10)], [manual()], new Set(), debt, new Map([['r1', M20]]))
    )

    expect(card).toMatchObject({ probableDuplicate: false, duplicatePayment: null })
  })

  it('a record SMS1 half-covered still takes the rest as parts', () => {
    const [card] = singles(
      buildReviewItems([smsOf('m2', M10)], [manual()], new Set(), debt, new Map([['r1', M10]]))
    )

    expect(card).toMatchObject({ probableDuplicate: true, splitUncovered: M10 })
  })

  it('an ordinary record is consumed once across sessions too', () => {
    const plain = record('r1', 5_000_000)
    const [again] = singles(
      buildReviewItems(
        [smsOf('m2', 5_000_000)],
        [plain],
        new Set(),
        undefined,
        new Map([['r1', 5_000_000]])
      )
    )

    expect(again.probableDuplicate).toBe(false)
  })
})

describe('NEW1: an exact SMS owns the record before an older partial one', () => {
  const manual = () => record('r1', M20, { date: '2026-10-07' })
  const debt = linkedTo(['r1', 'قسط وام'])

  it('older 10M, newer 20M: the 20M card is the payment, the 10M card is plain', () => {
    const [older, newer] = singles(
      buildReviewItems([smsOf('m1', M10), smsOf('m2', M20)], [manual()], new Set(), debt)
    )

    expect(newer).toMatchObject({ duplicatePayment: { title: 'قسط وام' }, splitUncovered: null })
    expect(older).toMatchObject({ probableDuplicate: false, splitUncovered: null })
  })

  it('older 20M, newer 10M: the same answer (the order of the SMS does not matter)', () => {
    const [older, newer] = singles(
      buildReviewItems([smsOf('m1', M20), smsOf('m2', M10)], [manual()], new Set(), debt)
    )

    expect(older).toMatchObject({ duplicatePayment: { title: 'قسط وام' }, splitUncovered: null })
    expect(newer).toMatchObject({ probableDuplicate: false, splitUncovered: null })
  })

  it('without an exact SMS the parts still share the record in time order', () => {
    const cards = singles(
      buildReviewItems([smsOf('m1', M10), smsOf('m2', M10)], [manual()], new Set(), debt)
    )

    expect(cards.map(card => card.splitUncovered)).toEqual([M20, M10])
  })

  it('two parts and an exact SMS: the exact one wins, the parts find nothing left', () => {
    const cards = singles(
      buildReviewItems(
        [smsOf('m1', M10), smsOf('m2', M10), smsOf('m3', M20)],
        [manual()],
        new Set(),
        debt
      )
    )

    expect(cards.map(card => card.probableDuplicate)).toEqual([false, false, true])
  })
})
