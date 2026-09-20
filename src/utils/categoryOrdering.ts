import { reorderItems } from './reorderItems'

/** The catch-all bucket every category and subcategory list ends with. */
export const OTHER_CATEGORY = 'سایر'

export function isOtherCategory(name: string): boolean {
  return name.trim() === OTHER_CATEGORY
}

export function withoutOtherCategory(categories: string[]): string[] {
  return categories.filter(name => name.trim() && !isOtherCategory(name))
}

/** Guarantees «سایر» exists in a list and sits last, keeping the rest in order. */
export function withOtherLast(categories: string[]): string[] {
  return [...withoutOtherCategory(categories), OTHER_CATEGORY]
}

/** Reorders a list while «سایر» stays pinned to the end. */
export function reorderWithOtherLast(
  categories: string[],
  fromIndex: number,
  toIndex: number
): string[] {
  const lastMovable = categories.length - (isOtherCategory(categories.at(-1) ?? '') ? 2 : 1)

  if (fromIndex > lastMovable || toIndex > lastMovable) return categories

  return reorderItems(categories, fromIndex, toIndex)
}
