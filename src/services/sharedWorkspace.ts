/**
 * The shared account («حساب مشترک»): a third workspace type next to personal and building. Kept
 * free of imports so `workspace.ts` can read the marker value without an import cycle.
 */

/** The value of the `نوع فضا` marker row in a shared account's own spreadsheet. */
export const WORKSPACE_SHARED_VALUE = 'حساب مشترک'

/** The name part (after the title prefix) of a shared account's spreadsheet. */
export const SHARED_NAME_PREFIX = 'مشترک '

/** v1 has one shared account per person (wireframes/shared-account/SPEC.md «More calls»). */
export const ONE_SHARED_ACCOUNT_MESSAGE =
  'شما از قبل یک حساب مشترک دارید؛ اگر خاموشش کرده‌اید، از «فضاهای من» دوباره روشنش کنید'

export function sharedLabel(name: string): string {
  return SHARED_NAME_PREFIX + name.trim()
}

/** The account's own name from its sheet label («مشترک <name>» → `<name>`). */
export function sharedNameOf(label: string): string {
  return label.startsWith(SHARED_NAME_PREFIX) ? label.slice(SHARED_NAME_PREFIX.length) : label
}
