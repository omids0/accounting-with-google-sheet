import { parseCreatedAtMs } from './recordDuplicates'
import { lastDifferenceChange } from './walletDifferenceHistory'
import type { OpeningShift, TraceEvent, TraceInput, TraceStory } from './walletTraceTypes'

/** A write is stamped to the second; events a minute either side still belong to it. */
const MARGIN_MS = 60_000
const MAX_EVENTS = 10

/** Deleting something that carried records matters most, creating something least. */
const ACTION_WEIGHT: Record<string, number> = { delete: 0, unpay: 1, pay: 1, update: 2, create: 3 }

/** The things done in `[from, to]` that can move a balance, the most telling first. */
export function eventsBetween(events: TraceEvent[], from: number, to: number): TraceEvent[] {
  return windowEvents(events, from, to)
    .slice(0, MAX_EVENTS)
    .sort((a, b) => a.at - b.at)
}

function windowEvents(events: TraceEvent[], from: number, to: number): TraceEvent[] {
  return events
    .filter(event => event.at >= from - MARGIN_MS && event.at <= to + MARGIN_MS)
    .sort((a, b) => (ACTION_WEIGHT[a.action] ?? 4) - (ACTION_WEIGHT[b.action] ?? 4) || b.at - a.at)
}

const omittedIn = (events: TraceEvent[], from: number, to: number) =>
  Math.max(0, windowEvents(events, from, to).length - MAX_EVENTS)

const gapBefore = (input: TraceInput, from: number) =>
  input.eventsOldestAt != null && input.eventsOldestAt > from - MARGIN_MS

/** How the difference moved when this opening moved: a higher opening means a lower difference. */
const changeOf = (shift: OpeningShift) => shift.from - shift.to

function shiftStory(input: TraceInput): TraceStory | null {
  const dated = input.openingShifts
    .filter(shift => shift.fromAt != null && shift.toAt != null && shift.from !== shift.to)
    .sort((a, b) => (a.toAt ?? 0) - (b.toAt ?? 0))
  const exact = dated.filter(shift => Math.abs(changeOf(shift) - input.difference) < 1)
  const shift = exact[exact.length - 1] ?? dated[dated.length - 1]

  if (!shift || shift.fromAt == null || shift.toAt == null) return null

  return {
    kind: 'opening-shift',
    fromAt: shift.fromAt,
    toAt: shift.toAt,
    change: changeOf(shift),
    exact: exact.includes(shift),
    monthKey: shift.monthKey,
    openingFrom: shift.from,
    openingTo: shift.to,
    events: eventsBetween(input.events, shift.fromAt, shift.toAt),
    omitted: omittedIn(input.events, shift.fromAt, shift.toAt),
    logGap: gapBefore(input, shift.fromAt)
  }
}

function historyStory(input: TraceInput): TraceStory | null {
  const found = lastDifferenceChange(input.history)

  if (!found) return null

  const { before, after } = found
  const change = after.difference - before.difference

  return {
    kind: 'history',
    fromAt: before.at,
    toAt: after.at,
    change,
    exact: Math.abs(change - input.difference) < 1,
    events: eventsBetween(input.events, before.at, after.at),
    omitted: omittedIn(input.events, before.at, after.at),
    logGap: gapBefore(input, before.at)
  }
}

/**
 * «اختلاف از کجا آمد؟»: the latest moment the difference moved, and what was done then. An
 * opening balance stored twice for one month shows the move to the toman; the device's own
 * log of earlier looks shows it for any change after the first visit.
 */
export function buildStory(input: TraceInput): TraceStory | null {
  if (Math.abs(input.difference) < 1) return null

  const shift = shiftStory(input)

  if (shift?.exact) return shift

  const history = historyStory(input)

  if (history?.exact) return history

  return shift ?? history
}

/**
 * A month listed twice in «موجودی ماهانه» (two writers at once) still holds the opening it had
 * before: each pair of rows that disagree is a move of that opening, stamped by when it was written.
 */
export function openingShiftsFrom(
  rows: { monthKey: string; amount: number; updatedAt: string; rowNumber: number }[]
): OpeningShift[] {
  const byMonth = new Map<string, typeof rows>()

  for (const row of [...rows].sort((a, b) => a.rowNumber - b.rowNumber)) {
    byMonth.set(row.monthKey, [...(byMonth.get(row.monthKey) ?? []), row])
  }

  const shifts: OpeningShift[] = []

  for (const [monthKey, list] of byMonth) {
    for (let index = 1; index < list.length; index += 1) {
      const [earlier, later] = [list[index - 1], list[index]]

      if (earlier.amount === later.amount) continue
      shifts.push({
        monthKey,
        from: earlier.amount,
        to: later.amount,
        fromAt: parseCreatedAtMs(earlier.updatedAt),
        toAt: parseCreatedAtMs(later.updatedAt)
      })
    }
  }

  return shifts
}
