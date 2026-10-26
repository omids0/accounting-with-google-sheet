interface Identified {
  id: string
}

/** A payment without an id (very old data) is told apart by its content, never merged blindly. */
const keyOf = (payment: Identified): string => payment.id || `anon:${JSON.stringify(payment)}`

/**
 * Three-way merge of one payments ledger, by payment id.
 *
 * - `base`: the ledger the queued write was computed from.
 * - `mine`: the ledger the write carries.
 * - `theirs`: the ledger on the sheet right now (other devices may have added or removed meanwhile).
 *
 * A payment survives when either side added it; it goes only when a side that HAD it (it is in
 * `base`) no longer lists it, so a stale write can neither drop a payment it never saw nor bring
 * back one another device took out. Payments whose id is shared keep the sheet's copy, unless this
 * write changed that payment. Ids never repeat in the result. Pure, so a backend can run it too.
 */
export function mergePaymentsById<T extends Identified>(
  base: readonly T[],
  mine: readonly T[],
  theirs: readonly T[]
): T[] {
  const baseKeys = new Set(base.map(keyOf))
  const mineByKey = new Map(mine.map(payment => [keyOf(payment), payment]))
  const baseByKey = new Map(base.map(payment => [keyOf(payment), payment]))
  const result: T[] = []
  const seen = new Set<string>()

  for (const theirPayment of theirs) {
    const key = keyOf(theirPayment)

    if (seen.has(key)) continue
    // Taken out by this write: it was in the base and this write no longer lists it.
    if (baseKeys.has(key) && !mineByKey.has(key)) continue
    seen.add(key)

    const mineCopy = mineByKey.get(key)

    const changedByMe =
      mineCopy !== undefined && JSON.stringify(mineCopy) !== JSON.stringify(baseByKey.get(key))

    result.push(changedByMe ? mineCopy : theirPayment)
  }

  for (const payment of mine) {
    const key = keyOf(payment)

    // In the base and gone from the sheet: another device removed it, so it stays removed.
    if (seen.has(key) || baseKeys.has(key)) continue
    seen.add(key)
    result.push(payment)
  }

  return result
}
