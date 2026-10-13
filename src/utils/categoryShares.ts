import type { CategoryShare, CategorySummary } from '../types'

/**
 * Category totals, largest first, each with its share of the sum of all
 * categories (so the top rows of a short list still show their true weight).
 */
export function toCategoryShares(categories: CategorySummary[]): CategoryShare[] {
  const positive = categories.filter(item => item.total > 0)
  const sum = positive.reduce((acc, item) => acc + item.total, 0)

  return [...positive]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'fa'))
    .map(item => ({ ...item, share: sum > 0 ? item.total / sum : 0 }))
}

/** The `count` largest categories with their share of the whole. */
export function topCategoryShares(categories: CategorySummary[], count = 3): CategoryShare[] {
  return toCategoryShares(categories).slice(0, Math.max(0, count))
}
