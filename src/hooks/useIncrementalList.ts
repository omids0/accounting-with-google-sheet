import { useCallback, useMemo, useState } from 'react'

/** Rows a long list shows at first and adds per «نمایش بیشتر» tap. */
export const LIST_PAGE_SIZE = 50

/**
 * Renders a long list in steps instead of all at once (no library). Key the component that
 * calls it by the active filters so a new filter starts over at the first step.
 */
export function useIncrementalList<T>(items: T[], pageSize = LIST_PAGE_SIZE) {
  const [count, setCount] = useState(pageSize)
  const visible = useMemo(() => items.slice(0, count), [items, count])
  const remaining = Math.max(0, items.length - visible.length)
  const showMore = useCallback(() => setCount(current => current + pageSize), [pageSize])

  return {
    visible,
    remaining,
    /** What the next tap adds: «۵۰ مورد دیگر», or fewer at the end. */
    nextStep: Math.min(pageSize, remaining),
    showMore
  }
}
