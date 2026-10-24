/**
 * The quick unit builder (journey step 3): units are numbered 1..total and handed out to the
 * floors in order; each floor has an end number and moving one redistributes the floors after
 * it, so the last floor always ends at the total.
 */
export interface FloorRange {
  floor: number
  /** First and last unit number of the floor; `to < from` = no unit on the floor. */
  from: number
  to: number
}

export interface QuickUnitDraft {
  number: string
  floor: number
  area: number
}

/** `count` units over floors `start..` as evenly as possible, the earlier floors getting one extra. */
function spread(count: number, floors: number, firstNumber: number, firstFloor: number) {
  const base = Math.floor(count / Math.max(1, floors))
  const extra = count % Math.max(1, floors)

  let next = firstNumber

  return Array.from({ length: floors }, (_, index): FloorRange => {
    const size = base + (index < extra ? 1 : 0)
    const range = { floor: firstFloor + index, from: next, to: next + size - 1 }

    next += size

    return range
  })
}

export function defaultRanges(total: number, floors: number): FloorRange[] {
  return spread(Math.max(0, total), Math.max(1, floors), 1, 1)
}

/** Unit numbers a floor's «تا واحد…» select offers: from its first unit up to the total. */
export function rangeEndOptions(ranges: FloorRange[], index: number, total: number): number[] {
  const from = ranges[index]?.from ?? 1

  return Array.from({ length: Math.max(0, total - from + 1) }, (_, offset) => from + offset)
}

/** Sets where floor `index` ends and spreads what is left over the floors after it. */
export function setRangeEnd(
  ranges: FloorRange[],
  index: number,
  upTo: number,
  total: number
): FloorRange[] {
  const current = ranges[index]

  if (!current) return ranges

  const last = index === ranges.length - 1
  const to = last ? total : Math.min(Math.max(upTo, current.from), total)

  const head = ranges.slice(0, index).concat({ ...current, to })
  const later = ranges.length - index - 1

  return later > 0 ? head.concat(spread(total - to, later, to + 1, current.floor + 1)) : head
}

/** One draft per unit; `areas` overrides the reference area for single units (by number). */
export function planQuickUnits(
  ranges: FloorRange[],
  referenceArea: number,
  areas: Record<string, number> = {}
): QuickUnitDraft[] {
  return ranges.flatMap(range =>
    Array.from({ length: Math.max(0, range.to - range.from + 1) }, (_, offset) => {
      const number = String(range.from + offset)

      return { number, floor: range.floor, area: areas[number] ?? referenceArea }
    })
  )
}
