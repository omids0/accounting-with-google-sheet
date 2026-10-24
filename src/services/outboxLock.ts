/**
 * Cross-tab lock shared by the outbox flush and the yearly archive sweep. Two open tabs share one
 * localStorage outbox, and without it both would send the same append twice; the sweep needs it
 * so no local write reaches the sheet while rows are being moved.
 */
export function withOutboxLock<T>(spreadsheetId: string, task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined

  if (!locks?.request) return task()

  return locks.request(`accounting-outbox-${spreadsheetId}`, task).then(result => result)
}
