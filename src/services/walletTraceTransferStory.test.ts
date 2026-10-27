import { beforeEach, describe, expect, it } from 'vitest'

import { isTransferInFlight, whileTransferring } from './transferInFlight'
import { isTransferActivity, transferActivitySummary } from './transfersModel'
import {
  dropTransientLooks,
  readDifferenceHistory,
  recordDifference,
  type DifferenceSnapshot
} from './walletDifferenceHistory'
import { buildStory, eventsBetween } from './walletTraceStory'
import type { TraceEvent, TraceInput } from './walletTraceTypes'

const MIN = 60_000
const REAL = 1_100_000

const snap = (at: number, difference: number): DifferenceSnapshot => ({
  at,
  difference,
  walletTotal: 0,
  periodBalance: 0
})

const event = (at: number, action: string, module: string, summary: string): TraceEvent => ({
  at,
  action,
  module,
  summary
})

function input(over: Partial<TraceInput>): TraceInput {
  return {
    difference: REAL,
    accounts: [],
    ledger: [],
    records: [],
    anchorMonthKey: '1405-06',
    anchorAmount: 0,
    anchorStart: '2026-08-23',
    anchorWrittenAtMs: null,
    anchorIsSnapshot: false,
    currentMonthKey: '1405-08',
    today: '2026-10-25',
    openingShifts: [],
    history: [],
    events: [],
    eventsOldestAt: null,
    ...over
  }
}

const transferLine = transferActivitySummary('ثبت کرد', 2_000_000, 'بانک ملی', 'بانک ملت')

describe('a transfer never reads as a change of the difference', () => {
  it('ignores a look taken between the two balance moves', () => {
    // Before: +1.1M. Mid-transfer look: -0.9M (source down 2M, destination not yet up). After: +1.1M.
    const history = [snap(0, REAL), snap(100 * MIN, REAL - 2_000_000), snap(101 * MIN, REAL)]

    expect(dropTransientLooks(history).map(item => item.difference)).toEqual([REAL, REAL])
    expect(
      buildStory(
        input({
          history,
          events: [event(100 * MIN, 'create', 'wallet', transferLine)]
        })
      )
    ).toBeNull()
  })

  it('does not record a look while a transfer is in flight, and records it afterwards', async () => {
    localStorage.clear()
    recordDifference('s', snap(0, REAL))
    await whileTransferring(async () => {
      expect(isTransferInFlight()).toBe(true)
      recordDifference('s', snap(MIN, REAL - 2_000_000))
    })
    expect(isTransferInFlight()).toBe(false)
    recordDifference('s', snap(2 * MIN, REAL))
    expect(readDifferenceHistory('s').map(item => item.difference)).toEqual([REAL])
  })

  it('clears the flag after a failure too', async () => {
    await expect(
      whileTransferring(async () => {
        throw new Error('x')
      })
    ).rejects.toThrow('x')
    expect(isTransferInFlight()).toBe(false)
  })

  it('names a transfer in the activity list as one, and lists it after everything else', () => {
    const events = [
      event(10 * MIN, 'create', 'wallet', transferLine),
      event(11 * MIN, 'create', 'records', 'حقوق')
    ]

    expect(eventsBetween(events, 0, 20 * MIN).map(item => item.summary)).toEqual([
      transferLine,
      'حقوق'
    ])
    expect(isTransferActivity(events[0])).toBe(true)
  })

  it('keeps a transfer from pushing a real change out of a full list', () => {
    const events = [
      event(10 * MIN, 'create', 'wallet', transferLine),
      ...Array.from({ length: 10 }, (_, i) => event(11 * MIN + i, 'create', 'records', `r${i}`))
    ]
    const found = eventsBetween(events, 0, 20 * MIN)

    expect(found).toHaveLength(10)
    expect(found.some(item => item.summary === transferLine)).toBe(false)
  })

  it('recognises the lines the app writes for a created and a deleted transfer', () => {
    for (const verb of ['ثبت کرد', 'حذف کرد'] as const) {
      const summary = transferActivitySummary(verb, 99_000_000, 'ملی', 'حساب حذف‌شده')

      expect(isTransferActivity({ module: 'wallet', summary })).toBe(true)
    }
  })

  it('does not take other wallet or record activity for a transfer', () => {
    expect(
      isTransferActivity({ module: 'wallet', summary: 'موجودی «ملی» را با پیامک‌ها تطبیق داد' })
    ).toBe(false)
    expect(isTransferActivity({ module: 'records', summary: transferLine })).toBe(false)
    expect(isTransferActivity({ module: 'wallet', summary: '«انتقال حقوق» را ثبت کرد' })).toBe(
      false
    )
  })
})

describe('control: real changes of the difference still show', () => {
  it('a manual balance edit that stays is told, with its size and what was done', () => {
    const story = buildStory(
      input({
        difference: 3_100_000,
        history: [snap(0, REAL), snap(200 * MIN, 3_100_000)],
        events: [event(199 * MIN, 'update', 'wallet', 'موجودی «ملی» را ویرایش کرد')]
      })
    )

    expect(story).toMatchObject({ kind: 'history', change: 2_000_000, exact: false })
    expect(story?.events.map(item => item.summary)).toEqual(['موجودی «ملی» را ویرایش کرد'])
  })

  it('an income without an account is told as exactly the whole difference', () => {
    const story = buildStory(
      input({
        difference: 2_500_000,
        history: [snap(0, 0), snap(50 * MIN, 2_500_000)],
        events: [event(49 * MIN, 'create', 'records', '«حقوق» را ثبت کرد')]
      })
    )

    expect(story).toMatchObject({ kind: 'history', change: 2_500_000, exact: true })
    expect(story?.events).toHaveLength(1)
  })

  it('a change that was undone only much later is still a change', () => {
    const history = [snap(0, REAL), snap(100 * MIN, 3_100_000), snap(400 * MIN, REAL)]

    expect(dropTransientLooks(history)).toHaveLength(3)
    expect(buildStory(input({ history }))).toMatchObject({ change: -2_000_000 })
  })

  it('a real change next to a transfer reports only the real change amount', () => {
    const story = buildStory(
      input({
        difference: 3_100_000,
        history: [snap(0, REAL), snap(200 * MIN, 3_100_000)],
        events: [
          event(199 * MIN, 'create', 'wallet', transferLine),
          event(199 * MIN, 'create', 'records', '«حقوق» را ثبت کرد')
        ]
      })
    )

    expect(story?.change).toBe(2_000_000)
    expect(story?.events.map(item => isTransferActivity(item))).toEqual([false, true])
  })
})

beforeEach(() => localStorage.clear())
