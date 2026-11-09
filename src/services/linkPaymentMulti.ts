import { attachRecordToTarget, isLedgerRefusal, type LinkedRecord } from './linkPayment'
import type { LinkTargetKind, LinkTargetKindId } from '../utils/linkTargetKinds'

/** One item of a record's payment: the item and the part of the record's amount that pays it. */
export interface LinkShare {
  id: string
  title: string
  amount: number
}

export interface MultiLinkResult {
  done: LinkShare[]
  failed: { share: LinkShare; err: unknown }[]
}

/**
 * Writes a record's shares as one payment each, in order. An item that refuses (paid meanwhile,
 * gone, less left than the share) does not stop the others: every share is tried and the result
 * says which were written. `record.amount` is replaced by each share.
 */
export async function attachRecordToTargets(
  kindId: LinkTargetKindId,
  spreadsheetId: string,
  record: LinkedRecord,
  shares: readonly LinkShare[]
): Promise<MultiLinkResult> {
  const result: MultiLinkResult = { done: [], failed: [] }

  for (const share of shares) {
    try {
      await attachRecordToTarget(kindId, spreadsheetId, share.id, {
        ...record,
        amount: share.amount
      })
      result.done.push(share)
    } catch (err) {
      result.failed.push({ share, err })
    }
  }

  return result
}

/**
 * What the user reads when some shares were not written after the record was saved. It names
 * the ones that failed and never says to save again (that would write the record twice).
 */
export function multiLinkFailureMessage(kind: LinkTargetKind, result: MultiLinkResult): string {
  const names = result.failed.map(({ share }) => `«${share.title}»`).join('، ')

  const reasons = [
    ...new Set(
      result.failed.flatMap(({ err }) => (isLedgerRefusal(err) && err.message ? [err.message] : []))
    )
  ].join(' ')

  const written = result.done.length
    ? ` پرداخت ${result.done.length} ${kind.noun} ثبت شد ولی`
    : ' ولی'

  return `رکورد ذخیره شد؛${written} ${kind.failureNoun} برای ${names} ثبت نشد. ${reasons} آن سهم را از صفحهٔ «${kind.page}» دستی ثبت کن؛ رکورد را دوباره ذخیره نکن.`
}
