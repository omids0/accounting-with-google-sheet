import { newestRecord, type ConfirmableSms } from './bankSmsQueue'
import type { LedgerEntry } from './recordDuplicates'
import { findRecurringMatch } from './recurring'
import type { RecurringItem } from '../types'

/**
 * «دسته پیشنهادی» of a bank SMS card (round 6, Task E). Rule order:
 * 1. an active monthly recurring item with the same amount and account,
 * 2. the last record with the same amount and account,
 * 3. the category last chosen for SMS from the same sender (then the same template),
 * 4. none — the card then opens the entry form.
 */

export interface SmsCategoryChoice {
  category: string
  subCategory: string
}

export type SmsSuggestionSource = 'recurring' | 'amount' | 'sender'

export interface SmsCategorySuggestion extends SmsCategoryChoice {
  source: SmsSuggestionSource
  /** Title of the recurring item or the earlier record ('' when none). */
  title: string
  /** `amount`: earlier records with this amount, account and category. */
  count: number
}

export interface SmsSuggestInput {
  type: 'income' | 'expense'
  /** App currency. */
  amount: number
  accountId: string
  sender: string
  templateId: string
}

export interface SmsSuggestContext {
  recurring: RecurringItem[]
  ledger: LedgerEntry[]
  /** Device-local memory, keyed by `smsSenderKey`. */
  bySender: Record<string, SmsCategoryChoice>
  /** Device-local memory, keyed by template id (the older per-template default). */
  byTemplate: Record<string, SmsCategoryChoice>
}

/** What the suggestion reads from a recognised SMS (queue cards and the reconciliation wizard). */
export function smsSuggestInput(entry: ConfirmableSms): SmsSuggestInput {
  return {
    type: entry.result.direction === 'debit' ? 'expense' : 'income',
    amount: entry.amount,
    accountId: entry.result.accountId,
    sender: entry.sms.sender,
    templateId: entry.result.templateId
  }
}

/** One memory slot per sender and record type. */
export function smsSenderKey(sender: string, type: SmsSuggestInput['type']): string {
  const id = sender.replace(/\s+/g, '').toLowerCase()

  return id ? `${type}:${id}` : ''
}

export function suggestSmsCategory(
  input: SmsSuggestInput,
  context: SmsSuggestContext
): SmsCategorySuggestion | null {
  const sameType = context.recurring.filter(item => item.type === input.type)
  const recurring = findRecurringMatch(input.amount, input.accountId, sameType)

  if (recurring?.category) {
    return {
      category: recurring.category,
      subCategory: recurring.subCategory,
      source: 'recurring',
      title: recurring.title,
      count: 0
    }
  }

  const same = context.ledger.filter(
    record =>
      record.type === input.type &&
      record.amount === input.amount &&
      !!input.accountId &&
      record.accountId === input.accountId &&
      !!record.category
  )
  const last = newestRecord(same)

  if (last?.category) {
    return {
      category: last.category,
      subCategory: last.subCategory ?? '',
      source: 'amount',
      title: last.title ?? '',
      count: same.filter(record => record.category === last.category).length
    }
  }

  const key = smsSenderKey(input.sender, input.type)
  const remembered = (key && context.bySender[key]) || context.byTemplate[input.templateId]

  return remembered?.category ? { ...remembered, source: 'sender', title: '', count: 0 } : null
}
