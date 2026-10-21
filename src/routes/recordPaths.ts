/** Query key of the records page that shows one record only (round 6, duplicate warning). */
export const RECORD_FOCUS_PARAM = 'record'

/** With `edit=1` the records page also opens that record's edit form (reconciliation wizard). */
export const RECORD_EDIT_PARAM = 'edit'

/** With `open=1` the records page opens that record's detail sheet (round 9). */
export const RECORD_OPEN_PARAM = 'open'

/** Query keys of the records page filters that a report link sets (round 7.5). */
export const RECORD_COUNTERPARTY_PARAM = 'counterparty'
export const RECORD_FROM_PARAM = 'from'
export const RECORD_TO_PARAM = 'to'

/** The records page filtered to one counterparty over `range`; `type` 'all' shows both forms. */
export function recordsCounterpartyPath(
  name: string,
  type: 'income' | 'expense' | 'all',
  range: { start: string; end: string }
): string {
  const params = new URLSearchParams()

  if (type !== 'all') params.set('type', type)
  params.set(RECORD_COUNTERPARTY_PARAM, name)
  params.set(RECORD_FROM_PARAM, range.start)
  params.set(RECORD_TO_PARAM, range.end)

  return `/records?${params.toString()}`
}

/** The records page showing only `recordId`, optionally with its edit form open. */
export function recordFocusPath(
  type: 'income' | 'expense',
  recordId: string,
  edit = false
): string {
  const path = `/records?type=${type}&${RECORD_FOCUS_PARAM}=${encodeURIComponent(recordId)}`

  return edit ? `${path}&${RECORD_EDIT_PARAM}=1` : path
}

/** The records page showing only `recordId`, with its detail sheet open. */
export function recordOpenPath(type: 'income' | 'expense', recordId: string): string {
  return `${recordFocusPath(type, recordId)}&${RECORD_OPEN_PARAM}=1`
}

/** Query key a module page reads to scroll to and flash one item (`useHighlightParam`). */
export const HIGHLIGHT_PARAM = 'highlight'

/** `basePath` with the item `id` highlighted. */
export function highlightPath(basePath: string, id: string): string {
  return `${basePath}?${HIGHLIGHT_PARAM}=${encodeURIComponent(id)}`
}
