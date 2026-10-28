/** «نیم سکه، ربع سکه» — the live-priced vault assets that have no quote right now. */
const joinNames = (names: string[]) => names.join('، ')

/** Under the vault row of the assets breakdown. `undefined` when every asset is valued. */
export function unquotedBreakdownNote(names: string[] | undefined): string | undefined {
  if (!names?.length) return undefined

  const them = names.length > 1 ? 'آن‌ها' : 'آن'

  return `قیمت لحظه‌ای ${joinNames(names)} در دسترس نیست؛ ارزش ${them} حساب نشده`
}

/** Under the «دارایی قابل اتکا» hero value, which is then a floor. */
export function unquotedHeroNote(names: string[] | undefined): string | undefined {
  if (!names?.length) return undefined

  return `ارزش ${joinNames(names)} حساب نشده (قیمت در دسترس نیست)`
}
