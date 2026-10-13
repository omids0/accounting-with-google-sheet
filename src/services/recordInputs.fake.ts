import type { RecordInput } from './recordInputs'

let counter = 0

/** A test record; override only what the case cares about. */
export function fakeRecord(overrides: Partial<RecordInput> = {}): RecordInput {
  counter += 1

  return {
    id: `r${counter}`,
    type: 'expense',
    date: '2026-10-01',
    category: 'خوراک',
    subCategory: '',
    title: '',
    amount: 0,
    counterparty: '',
    items: [],
    createdAtMs: null,
    ...overrides
  }
}
