/**
 * The record ids a module's items are linked to (the `transactionRecordId` of each payment or
 * settlement). The settle duplicate check skips them: they belong to a settlement already.
 * `getIds` may return empty cells; those are left out.
 */
export function linkedIdsOf<T>(
  items: readonly T[],
  getIds: (item: T) => readonly (string | undefined)[]
): string[] {
  return items.flatMap(item => getIds(item).filter((id): id is string => Boolean(id)))
}
