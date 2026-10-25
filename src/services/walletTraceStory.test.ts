import { describe, expect, it } from 'vitest'

import { buildStory, eventsBetween, openingShiftsFrom } from './walletTraceStory'
import type { OpeningShift, TraceEvent, TraceInput } from './walletTraceTypes'

const MIN = 60_000

const event = (at: number, action: string, module: string, summary: string): TraceEvent => ({
  at,
  action,
  module,
  summary
})

function input(over: Partial<TraceInput>): TraceInput {
  return {
    difference: 8_000_000,
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

const shift: OpeningShift = {
  monthKey: '1405-08',
  from: 43_483_233,
  to: 35_483_233,
  fromAt: 1_000 * MIN,
  toAt: 1_045 * MIN
}

describe('openingShiftsFrom', () => {
  it('turns two different rows of one month into one move, oldest first', () => {
    const rows = [
      { monthKey: '1405-08', amount: 43_483_233, updatedAt: '۱۴۰۵/۸/۲, ۱۹:۵۹:۵۸', rowNumber: 8 },
      { monthKey: '1405-07', amount: 55_911_291, updatedAt: '۱۴۰۵/۷/۱, ۰:۰۳:۳۳', rowNumber: 5 },
      { monthKey: '1405-07', amount: 55_911_291, updatedAt: '۱۴۰۵/۷/۱, ۰:۰۳:۳۴', rowNumber: 6 },
      { monthKey: '1405-08', amount: 35_483_233, updatedAt: '۱۴۰۵/۸/۲, ۲۰:۴۴:۵۵', rowNumber: 9 }
    ]
    const shifts = openingShiftsFrom(rows)

    expect(shifts).toHaveLength(1)
    expect(shifts[0]).toMatchObject({ monthKey: '1405-08', from: 43_483_233, to: 35_483_233 })
    expect((shifts[0].toAt ?? 0) - (shifts[0].fromAt ?? 0)).toBe((44 * 60 + 57) * 1000)
  })

  it('finds nothing when every month is listed once', () => {
    expect(
      openingShiftsFrom([{ monthKey: '1405-08', amount: 1, updatedAt: '', rowNumber: 2 }])
    ).toEqual([])
  })
})

describe('eventsBetween', () => {
  it('keeps the window, puts deletions first and lists them by time', () => {
    const events = [
      event(1_010 * MIN, 'create', 'records', 'بنزین'),
      event(1_040 * MIN, 'delete', 'receivables', 'وام ملی'),
      event(1_020 * MIN, 'create', 'receivables', 'حقوق'),
      event(2_000 * MIN, 'delete', 'records', 'خارج از بازه')
    ]
    const found = eventsBetween(events, 1_000 * MIN, 1_045 * MIN)

    expect(found.map(item => item.summary)).toEqual(['بنزین', 'حقوق', 'وام ملی'])
  })

  it('caps the list at ten, deletions kept', () => {
    const events = [
      ...Array.from({ length: 20 }, (_, i) => event(1_001 * MIN + i, 'create', 'records', `c${i}`)),
      event(1_002 * MIN, 'delete', 'receivables', 'مهم')
    ]
    const found = eventsBetween(events, 1_000 * MIN, 1_045 * MIN)

    expect(found).toHaveLength(10)
    expect(found.some(item => item.summary === 'مهم')).toBe(true)
  })
})

describe('buildStory', () => {
  it('names the opening move that is the whole difference, with what was done meanwhile', () => {
    const story = buildStory(
      input({
        openingShifts: [shift],
        events: [event(1_044 * MIN, 'delete', 'receivables', 'وام ملی نوید')]
      })
    )

    expect(story).toMatchObject({
      kind: 'opening-shift',
      exact: true,
      change: 8_000_000,
      monthKey: '1405-08',
      openingFrom: 43_483_233,
      openingTo: 35_483_233
    })
    expect(story?.events.map(item => item.summary)).toEqual(['وام ملی نوید'])
  })

  it('does not call an opening move exact when it is not the whole difference', () => {
    const story = buildStory(input({ difference: 5_000_000, openingShifts: [shift] }))

    expect(story).toMatchObject({ kind: 'opening-shift', exact: false, change: 8_000_000 })
  })

  it("falls back to this device's own earlier looks", () => {
    const story = buildStory(
      input({
        history: [
          { at: 100 * MIN, difference: 0 },
          { at: 200 * MIN, difference: 0 },
          { at: 300 * MIN, difference: 8_000_000 }
        ],
        events: [event(250 * MIN, 'delete', 'records', 'یک رکورد')]
      })
    )

    expect(story).toMatchObject({
      kind: 'history',
      exact: true,
      fromAt: 200 * MIN,
      toAt: 300 * MIN
    })
    expect(story?.events).toHaveLength(1)
  })

  it('prefers the exact story over an inexact one', () => {
    const story = buildStory(
      input({
        openingShifts: [{ ...shift, to: 40_000_000 }],
        history: [
          { at: 100 * MIN, difference: 0 },
          { at: 300 * MIN, difference: 8_000_000 }
        ]
      })
    )

    expect(story?.kind).toBe('history')
  })

  it('says when the activity log no longer reaches back to the change', () => {
    const story = buildStory(input({ openingShifts: [shift], eventsOldestAt: 1_030 * MIN }))

    expect(story?.logGap).toBe(true)
    expect(buildStory(input({ openingShifts: [shift] }))?.logGap).toBe(false)
  })

  it('has no story without a difference or without anything to go on', () => {
    expect(buildStory(input({ difference: 0, openingShifts: [shift] }))).toBeNull()
    expect(buildStory(input({}))).toBeNull()
  })
})
