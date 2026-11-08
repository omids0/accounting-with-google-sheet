import { roundMoney, sumMoney } from './roundMoney'

/** An open item a record can take a share of: its id and what is left on it. */
export interface ShareTarget {
  id: string
  remaining: number
}

/** The shares picked so far: item id → the part of the record's amount that pays it. */
export type LinkShares = Record<string, number>

/**
 * Spreads `total` over the picked items in list order (oldest first, like the building sheet):
 * each takes up to what is left on it, the rest goes to the next. Items nobody picked get no key.
 * An amount larger than every pick can take leaves the surplus unplaced (the sum then differs from
 * the total and the user is told).
 */
export function autoFillShares(
  targets: readonly ShareTarget[],
  pickedIds: readonly string[],
  total: number
): LinkShares {
  const picked = new Set(pickedIds)
  const shares: LinkShares = {}

  let left = Math.max(0, roundMoney(total))

  for (const target of targets) {
    if (!picked.has(target.id)) continue

    const use = Math.min(left, Math.max(0, target.remaining))

    shares[target.id] = roundMoney(use)
    left = roundMoney(left - use)
  }

  return shares
}

/** What the picked shares add up to (no binary noise). */
export const sharesSum = (shares: LinkShares): number => sumMoney(Object.values(shares))

export type SharesProblem =
  /** A share is more than what is left on its item: `id` is that item. */
  | { kind: 'over'; id: string; remaining: number }
  /** A picked item has no amount. */
  | { kind: 'empty'; id: string }
  /** The shares do not add up to the record's amount: `diff` is record minus shares. */
  | { kind: 'sum'; diff: number }

/**
 * The first reason the picked shares cannot be saved, or null. The shares must add up to exactly
 * the record's amount (the record is the payment, so none of it may be left over).
 */
export function sharesProblem(
  targets: readonly ShareTarget[],
  shares: LinkShares,
  total: number
): SharesProblem | null {
  const ids = Object.keys(shares)

  if (!ids.length) return null

  for (const target of targets) {
    const share = shares[target.id]

    if (share === undefined) continue
    if (!(share > 0)) return { kind: 'empty', id: target.id }
    if (roundMoney(share) > roundMoney(target.remaining)) {
      return { kind: 'over', id: target.id, remaining: target.remaining }
    }
  }

  const diff = roundMoney(total - sharesSum(shares))

  return diff === 0 ? null : { kind: 'sum', diff }
}
