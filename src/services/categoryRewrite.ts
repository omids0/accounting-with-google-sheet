import { isAuthError, hasStoredSession, isTokenValid } from './auth'
import {
  rewriteCategoryValues,
  type CategoryRewriteTarget,
  type ManagedCategoryType
} from './categoryManagePlan'
import { getSettings } from './settings'
import { fetchRecords, updateRecord } from './sheets'
import { getOutboxEntries } from './syncOutbox'
import { SUBCATEGORY_FIELD_ID } from '../components/form/fieldUtils'

/**
 * Row side of a category rename or merge (round 6, D1): every row of the list's ledger
 * holding the old name is rewritten through the local mirror and the outbox, in batches,
 * with progress. Lost auth stops between batches — the rows done so far are valid under
 * the new name and the old category still exists, so running the action again finishes it.
 */

export type RewriteTask = () => Promise<void>

export interface RewriteProgress {
  done: number
  total: number
}

export class CategoryRewriteAbortedError extends Error {
  constructor(readonly done: number, readonly total: number) {
    // Worded so isAuthError() sends the user to sign in again.
    super('نشست گوگل منقضی شد')
    this.name = 'CategoryRewriteAbortedError'
  }
}

export const REWRITE_BATCH_SIZE = 25

export interface RewriteRunOptions {
  batchSize?: number
  onProgress?: (progress: RewriteProgress) => void
  /** False once the session is gone. */
  hasSession?: () => boolean
  /** Sends the queued writes; false when some did not go out. */
  flush?: () => Promise<boolean>
  /** True when a write that did not go out failed on auth. */
  authFailed?: () => boolean
}

export async function runRewriteTasks(
  tasks: RewriteTask[],
  {
    batchSize = REWRITE_BATCH_SIZE,
    onProgress,
    hasSession = () => true,
    flush = async () => true,
    authFailed = () => false
  }: RewriteRunOptions = {}
): Promise<void> {
  const total = tasks.length

  onProgress?.({ done: 0, total })

  for (let start = 0; start < total; start += batchSize) {
    if (!hasSession()) throw new CategoryRewriteAbortedError(start, total)

    const batch = tasks.slice(start, start + batchSize)

    for (const task of batch) await task()

    const done = start + batch.length

    onProgress?.({ done, total })

    // Offline or over quota the writes simply wait in the outbox; only auth stops the run.
    if (!(await flush()) && authFailed()) throw new CategoryRewriteAbortedError(done, total)
  }
}

/** Options wired to the real session and outbox of `spreadsheetId`. */
export function liveRewriteOptions(
  spreadsheetId: string,
  onProgress?: (progress: RewriteProgress) => void
): RewriteRunOptions {
  return {
    onProgress,
    hasSession: () => isTokenValid() || hasStoredSession(),
    flush: async () => (await import('./sheetSync')).flushOutbox(spreadsheetId),
    authFailed: () =>
      getOutboxEntries(spreadsheetId).some(entry => entry.lastError && isAuthError(entry.lastError))
  }
}

async function recordRewrites(
  spreadsheetId: string,
  type: 'income' | 'expense',
  from: CategoryRewriteTarget,
  to: CategoryRewriteTarget
): Promise<RewriteTask[]> {
  const form = getSettings()?.forms.find(item => item.type === type)

  if (!form) return []

  const records = await fetchRecords(spreadsheetId, form)

  return records.flatMap(record => {
    const next = rewriteCategoryValues(
      { category: record.values.category, subCategory: record.values[SUBCATEGORY_FIELD_ID] },
      from,
      to
    )

    if (!next) return []

    const values = {
      ...record.values,
      category: next.category,
      [SUBCATEGORY_FIELD_ID]: next.subCategory
    }

    return [
      () =>
        updateRecord(
          spreadsheetId,
          form,
          record.rowNumber,
          record.id,
          record.createdAt,
          values,
          record.sheetName
        )
    ]
  })
}

/** Rewrites of rows shaped `{ category, subCategory? }` saved back by `update`. */
function itemRewrites<T extends { category: string; subCategory?: string; rowNumber: number }>(
  items: T[],
  from: CategoryRewriteTarget,
  to: CategoryRewriteTarget,
  update: (rowNumber: number, item: T) => Promise<void>
): RewriteTask[] {
  return items.flatMap(item => {
    const next = rewriteCategoryValues(item, from, to)

    if (!next) return []

    const changed = { ...item, category: next.category }

    if (item.subCategory !== undefined) changed.subCategory = next.subCategory

    return [() => update(item.rowNumber, changed)]
  })
}

/** One task per row of the list's ledger that holds `from`. */
export async function collectCategoryRewrites(
  spreadsheetId: string,
  type: ManagedCategoryType,
  from: CategoryRewriteTarget,
  to: CategoryRewriteTarget
): Promise<RewriteTask[]> {
  if (type === 'income' || type === 'expense') {
    return recordRewrites(spreadsheetId, type, from, to)
  }

  if (type === 'dang') {
    const { fetchDangs, updateDang } = await import('./dang')

    return itemRewrites(await fetchDangs(spreadsheetId), from, to, (row, item) =>
      updateDang(spreadsheetId, row, item)
    )
  }

  if (type === 'receivable') {
    const { fetchReceivables, updateReceivable } = await import('./receivablesCrud')

    return itemRewrites(await fetchReceivables(spreadsheetId), from, to, (row, item) =>
      updateReceivable(spreadsheetId, row, item)
    )
  }

  const { fetchPersonalReminders, updatePersonalReminder } = await import('./personalReminders')

  return itemRewrites(await fetchPersonalReminders(spreadsheetId), from, to, (row, item) =>
    updatePersonalReminder(spreadsheetId, row, item)
  )
}

/** The rows of every category of the list, with their dates where the ledger has one. */
export async function loadCategoryRows(
  spreadsheetId: string,
  type: ManagedCategoryType
): Promise<{ category: string; date?: string }[]> {
  if (type === 'income' || type === 'expense') {
    const form = getSettings()?.forms.find(item => item.type === type)

    if (!form) return []

    const dateField = form.fields.find(field => field.type === 'date')?.id ?? 'date'

    return (await fetchRecords(spreadsheetId, form)).map(record => ({
      category: record.values.category ?? '',
      date: record.values[dateField]
    }))
  }

  const items =
    type === 'dang'
      ? await (await import('./dang')).fetchDangs(spreadsheetId)
      : type === 'receivable'
      ? await (await import('./receivablesCrud')).fetchReceivables(spreadsheetId)
      : await (await import('./personalReminders')).fetchPersonalReminders(spreadsheetId)

  return items.map(item => ({ category: item.category }))
}
