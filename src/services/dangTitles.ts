/** Title prefix of the record a personal debt's payment creates: «بدهی: خرید لامپ». */
export const DANG_SETTLEMENT_PREFIX = 'بدهی: '

/** Title prefix of the record a building debt's repayment creates: «بازپرداخت به مدیر · …». */
export const DANG_REPAYMENT_PREFIX = 'بازپرداخت به '

/**
 * Every prefix a debt payment record has carried, newest first. A building's older repayments
 * were titled «بدهی: …», so unpaying and duplicate detection keep matching both.
 */
export const DANG_BUILDING_PREFIXES = [DANG_REPAYMENT_PREFIX, DANG_SETTLEMENT_PREFIX] as const

/** The prefixes to match for a debt of this workspace. */
export function dangPrefixes(building: boolean): readonly string[] {
  return building ? DANG_BUILDING_PREFIXES : [DANG_SETTLEMENT_PREFIX]
}

/**
 * Title of the record a payment writes: «بدهی: خرید لامپ» for a personal debt; in a building
 * «بازپرداخت به مدیر · خرید لامپ راه‌پله», named after who the debt is owed to.
 */
export function dangSettlementTitle(
  dang: { title: string; counterparty: string },
  building: boolean
): string {
  if (!building) return `${DANG_SETTLEMENT_PREFIX}${dang.title}`

  return `${DANG_REPAYMENT_PREFIX}${dang.counterparty.trim() || 'طلبکار'} · ${dang.title}`
}

/** True for the title of any record a debt payment wrote (old or new wording). */
export function isDangSettlementTitle(title: string): boolean {
  return DANG_BUILDING_PREFIXES.some(prefix => title.startsWith(prefix))
}
