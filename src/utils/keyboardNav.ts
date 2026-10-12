import { normalizeSearchText } from './search'

/** `vertical`: ↑↓ move; `horizontal`: ←→ move. Home/End work on both. */
export type NavAxis = 'vertical' | 'horizontal'

/**
 * Index an arrow/Home/End key moves to in a list of `count` items shown in visual
 * order (top→bottom or left→right), or null when the key does not navigate.
 * `index` -1 means focus is outside the list: forward enters at the first item.
 */
export function nextIndexForKey(
  key: string,
  index: number,
  count: number,
  axis: NavAxis,
  wrap = true
): number | null {
  if (count === 0) return null

  const back = axis === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
  const forward = axis === 'vertical' ? 'ArrowDown' : 'ArrowRight'

  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  if (key === back) return index <= 0 ? (wrap ? count - 1 : 0) : index - 1
  if (key === forward) return index >= count - 1 ? (wrap ? 0 : count - 1) : index + 1

  return null
}

/**
 * Elements in on-screen order. Arrows follow what the user sees, so in RTL ←
 * goes to the element on the left even though it comes later in the DOM.
 */
export function sortByVisualPosition<T extends Element>(elements: T[], axis: NavAxis): T[] {
  const position = (element: T) => {
    const rect = element.getBoundingClientRect()

    return axis === 'vertical' ? rect.top : rect.left
  }

  return elements
    .map(element => ({ element, at: position(element) }))
    .sort((a, b) => a.at - b.at)
    .map(entry => entry.element)
}

interface ArrowFocusOptions {
  axis: NavAxis
  wrap?: boolean
}

/** Moves focus among `items` for an arrow/Home/End key; true when it handled the key. */
export function moveFocusWithArrows(
  event: { key: string; preventDefault: () => void },
  items: HTMLElement[],
  { axis, wrap = true }: ArrowFocusOptions
): boolean {
  const ordered = sortByVisualPosition(items, axis)
  const current = ordered.findIndex(item => item === document.activeElement)
  const next = nextIndexForKey(event.key, current, ordered.length, axis, wrap)

  if (next === null) return false
  event.preventDefault()
  ordered[next].focus()

  return true
}

/**
 * Type-ahead: the first label after `from` that starts with `query`, wrapping
 * around; a repeated single letter cycles through the matches. -1 when none.
 */
export function findTypeaheadIndex(labels: string[], query: string, from: number): number {
  const needle = normalizeSearchText(query)

  if (!needle || labels.length === 0) return -1

  const repeated = needle.length > 1 && [...needle].every(char => char === needle[0])
  const prefix = repeated ? needle[0] : needle
  // A fresh multi-letter query may keep the current item; one letter moves on.
  const offset = prefix.length === 1 ? 1 : 0

  for (let step = 0; step < labels.length; step += 1) {
    const index = (from + offset + step + labels.length) % labels.length

    if (normalizeSearchText(labels[index]).startsWith(prefix)) return index
  }

  return -1
}

const TYPEAHEAD_RESET_MS = 500

/** Collects typed letters into one query until the user pauses. */
export function createTypeahead() {
  let buffer = ''
  let lastAt = 0

  return (char: string, now = Date.now()): string => {
    buffer = now - lastAt > TYPEAHEAD_RESET_MS ? char : buffer + char
    lastAt = now

    return buffer
  }
}

/** A printable single character with no modifier — a type-ahead keystroke. */
export function isTypeaheadKey(event: {
  key: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}): boolean {
  return (
    event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey
  )
}
