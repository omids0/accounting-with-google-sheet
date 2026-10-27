import type { LedgerEntry } from './walletLedger'
import { make, type Draft } from './walletTraceDraft'
import { isSignificant, money, sumDelta } from './walletTraceRecords'
import type { TraceContext, TraceFinding } from './walletTraceTypes'
import { normalizeSheetDate } from '../utils/sheetValues'

/** The history row is one leg of a transfer between two wallet accounts (or its reversal). */
export function isTransferEntry(entry: LedgerEntry): boolean {
  return entry.source === 'transfer'
}

/**
 * Whether the transfer row of a history row is still in «انتقال‌ها». Unknown (the tab could not be
 * read) counts as there: a read failure must not turn every transfer into a suspect finding.
 */
export function transferRowExists(ctx: TraceContext, entry: LedgerEntry): boolean {
  const ids = ctx.input.transferIds

  return !ids || !entry.recordId || ids.has(entry.recordId)
}

/** A leg of a transfer that exists: a deliberate move the formula cannot see, equal and opposite elsewhere. */
export function transferDraft(ctx: TraceContext, entry: LedgerEntry): Draft {
  const account = ctx.accountTitles.get(entry.accountId) ?? 'حساب'

  return {
    id: `transfer:${entry.id}`,
    effect: entry.delta,
    date: normalizeSheetDate(entry.date),
    accountId: entry.accountId,
    kind: 'transfer',
    suspect: false,
    likely: false,
    title: entry.title || 'انتقال بین حساب‌ها',
    detail: `پول ${entry.delta < 0 ? 'از' : 'به'} «${account}» ${
      entry.delta < 0 ? 'به حساب دیگری رفته' : 'از حساب دیگری آمده'
    }؛ هزینه یا درآمد نیست و جمع کیف پول را عوض نمی‌کند، ولی موجودی این حساب را عوض می‌کند.`
  }
}

/**
 * History rows of transfers whose row in «انتقال‌ها» no longer exists (deleted straight in the
 * sheet). Grouped per transfer and account: a transfer that was deleted in the app leaves its
 * moves and their reversals, which add up to nothing; only a move left without its reversal shows.
 */
export function orphanTransferFindings(
  ctx: TraceContext,
  orphans: Map<string, LedgerEntry[]>
): TraceFinding[] {
  const findings: TraceFinding[] = []

  for (const [key, entries] of orphans) {
    const effect = sumDelta(entries)

    if (!isSignificant(effect)) continue

    const last = entries[entries.length - 1]
    const account = ctx.accountTitles.get(last.accountId) ?? 'حساب'

    findings.push(
      make(ctx, {
        id: `orphan-ledger:${key}`,
        kind: 'orphan-ledger',
        suspect: true,
        likely: true,
        effect,
        title: last.title || 'انتقال ناپیدا',
        detail: `موجودی «${account}» با یک انتقال به اندازهٔ ${money(
          effect
        )} عوض شده، ولی ردیف آن انتقال دیگر در «انتقال‌ها» پیدا نمی‌شود؛ احتمالاً مستقیم در فایل گوگل‌شیت پاک شده. سمت دیگر انتقال همین مبلغ را در حساب مقابل جابه‌جا کرده، پس جمع کیف پول درست است.`,
        date: normalizeSheetDate(last.date),
        accountId: last.accountId
      })
    )
  }

  return findings
}
