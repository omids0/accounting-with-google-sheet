import { parseCreatedAtMs } from './recordDuplicates'
import type { LedgerEntry } from './walletLedger'
import { countsAfterOpening } from './walletTraceRecords'
import type { TraceContext, TraceFinding, TraceKind } from './walletTraceTypes'
import { normalizeSheetDate } from '../utils/sheetValues'

/** Whether a history row belongs to the stretch the calculated balance covers. */
export function relevant(ctx: TraceContext, entry: LedgerEntry): boolean {
  const { anchorStart, anchorWrittenAtMs } = ctx.input
  const date = normalizeSheetDate(entry.date)
  const created = parseCreatedAtMs(entry.createdAt)
  const inRange =
    (!!date && date >= anchorStart) ||
    (created != null && anchorWrittenAtMs != null && created >= anchorWrittenAtMs)

  return inRange && countsAfterOpening(ctx, entry)
}

export interface Draft {
  kind: TraceKind
  id: string
  suspect: boolean
  likely: boolean
  effect: number
  title: string
  detail: string
  date: string
  accountId?: string
}

export function make(ctx: TraceContext, draft: Draft): TraceFinding {
  const { suspect, likely, accountId, ...rest } = draft

  return {
    ...rest,
    group: suspect ? 'suspect' : 'known',
    certainty: likely ? 'likely' : 'exact',
    accountId: accountId || undefined,
    accountTitle: accountId ? ctx.accountTitles.get(accountId) : undefined
  }
}
