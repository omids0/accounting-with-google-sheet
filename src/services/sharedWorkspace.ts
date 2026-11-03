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

/** «مشترک» as a word of its own, with more after it («مشترک خرج خانه», not «مشترکین»). */
const PREFIX_WORD = /^مشترک\s+(?=\S)/

/** The sheet label «مشترک <name>»; a name that already starts with «مشترک» is not prefixed again. */
export function sharedLabel(name: string): string {
  const trimmed = name.trim()

  return PREFIX_WORD.test(trimmed) ? trimmed : SHARED_NAME_PREFIX + trimmed
}

/** An older doubled label («مشترک مشترک خرج خانه») reads once («مشترک خرج خانه»); others stay. */
export function collapseSharedPrefix(label: string): string {
  return label.replace(/^(مشترک\s+)(?:مشترک\s+(?=\S))+/, '$1')
}

/**
 * The account's own name from its sheet label («مشترک <name>» → `<name>`); every leading «مشترک»
 * goes, so a doubled older label gives the same name as a single one.
 */
export function sharedNameOf(label: string): string {
  let name = label

  while (PREFIX_WORD.test(name)) name = name.replace(PREFIX_WORD, '')

  return name
}
