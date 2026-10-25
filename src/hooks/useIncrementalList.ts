import { useCallback, useMemo, useState } from 'react'

/** Rows a long list shows at first and adds per «نمایش بیشتر» tap. */
export const LIST_PAGE_SIZE = 50

/**
 * How many leading rows must render so every row whose id is in `ids` is among them: the
 * position of the furthest one, plus one. 0 when none of them is in the list (yet).
 */
export function windowSizeFor<T>(
  items: readonly T[],
  ids: readonly string[],
  getId: (item: T) => string
): number {
  if (ids.length === 0) return 0

  let needed = 0

  for (let index = 0; index < items.length; index += 1) {
    if (ids.includes(getId(items[index]))) needed = index + 1
  }

  return needed
}

type IncrementalListOptions<T> = {
  pageSize?: number
  /** A new value (the active filters) starts over at the first step. */
  resetKey?: string
  /**
   * Ids that must be among the rendered rows: a deep link's target, the expanded card. When the
   * set changes and one of them lies beyond the window, the window grows (to the next step) to
   * include it. It is a one-time reveal, not a pin: a filter change resets the window as usual.
   */
  mustInclude?: ReadonlyArray<string | null | undefined>
  /** Reads a row's id for `mustInclude`; defaults to `item.id`. */
  getId?: (item: T) => string
}

const defaultGetId = (item: unknown) => (item as { id: string }).id

/**
 * Renders a long list in steps instead of all at once (no library). Pass `resetKey` (the active
 * filters) so a new filter starts over at the first step, and `mustInclude` so an item a link
 * or the user is working with is never hidden behind «نمایش بیشتر».
 */
export function useIncrementalList<T>(items: T[], options: IncrementalListOptions<T> = {}) {
  const { pageSize = LIST_PAGE_SIZE, resetKey = '', mustInclude, getId = defaultGetId } = options
  const [state, setState] = useState({ count: pageSize, resetKey, revealed: '' })
  const ids = (mustInclude ?? []).filter((id): id is string => Boolean(id))
  const includeKey = ids.join('\u0000')
  let { count, revealed } = state
  const reset = state.resetKey !== resetKey

  if (reset) count = pageSize

  if (includeKey && includeKey !== revealed) {
    const needed = windowSizeFor(items, ids, getId)

    // Only once a row is really in the list (data may still be loading), and once per set.
    if (needed > 0) {
      count = Math.max(count, Math.ceil(needed / pageSize) * pageSize)
      revealed = includeKey
    }
  }

  if (reset || count !== state.count || revealed !== state.revealed) {
    setState({ count, resetKey, revealed })
  }

  const visible = useMemo(() => items.slice(0, count), [items, count])
  const remaining = Math.max(0, items.length - visible.length)
  const showMore = useCallback(
    () => setState(current => ({ ...current, count: current.count + pageSize })),
    [pageSize]
  )

  return {
    visible,
    remaining,
    /** What the next tap adds: «۵۰ مورد دیگر», or fewer at the end. */
    nextStep: Math.min(pageSize, remaining),
    showMore
  }
}
