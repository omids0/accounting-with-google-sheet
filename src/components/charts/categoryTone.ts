import type { TransactionTypeSegmentOption } from '../TransactionTypeSegment'

export type CategoryTone = 'expense' | 'income'

/** «هزینه | درآمد» toggle of the category views; expense first, the everyday question. */
export const CATEGORY_TONE_OPTIONS: TransactionTypeSegmentOption[] = [
  { id: 'expense', label: 'هزینه', tone: 'expense' },
  { id: 'income', label: 'درآمد', tone: 'income' }
]
