import { describe, expect, it } from 'vitest'

import { mergePaymentsById } from './mergePaymentsById'

const pay = (id: string, amount = 1, note = '') => ({ id, amount, note })

const ids = (list: { id: string }[]) => list.map(item => item.id)

describe('mergePaymentsById', () => {
  it('keeps a payment another device added since the write was computed', () => {
    // A paid p1; B (stale, empty base) writes its own p2.
    expect(ids(mergePaymentsById([], [pay('p2')], [pay('p1')]))).toEqual(['p1', 'p2'])
  })

  it('keeps a payment of the write that the sheet does not have yet', () => {
    expect(ids(mergePaymentsById([pay('p1')], [pay('p1'), pay('p2')], [pay('p1')]))).toEqual([
      'p1',
      'p2'
    ])
  })

  it('drops a payment only when the write removed it', () => {
    const base = [pay('p1'), pay('p2')]

    expect(ids(mergePaymentsById(base, [pay('p2')], [pay('p1'), pay('p2'), pay('p3')]))).toEqual([
      'p2',
      'p3'
    ])
  })

  it('does not bring back a payment another device removed', () => {
    const base = [pay('p1'), pay('p2')]

    expect(ids(mergePaymentsById(base, [pay('p1'), pay('p2')], [pay('p2')]))).toEqual(['p2'])
  })

  it('never repeats an id', () => {
    const merged = mergePaymentsById([], [pay('p1'), pay('p1')], [pay('p1'), pay('p2'), pay('p2')])

    expect(ids(merged)).toEqual(['p1', 'p2'])
  })

  it('leaves an untouched ledger as is', () => {
    const ledger = [pay('p1'), pay('p2')]

    expect(mergePaymentsById(ledger, ledger, ledger)).toEqual(ledger)
  })

  it('takes the sheet copy of a shared payment unless the write changed it', () => {
    const base = [pay('p1', 5, 'old')]

    expect(mergePaymentsById(base, [pay('p1', 5, 'old')], [pay('p1', 5, 'theirs')])).toEqual([
      pay('p1', 5, 'theirs')
    ])
    expect(mergePaymentsById(base, [pay('p1', 5, 'mine')], [pay('p1', 5, 'theirs')])).toEqual([
      pay('p1', 5, 'mine')
    ])
  })

  it('treats payments without an id by content, so two of them both survive', () => {
    const merged = mergePaymentsById([], [pay('', 3)], [pay('', 4)])

    expect(merged.map(item => item.amount)).toEqual([4, 3])
  })
})
