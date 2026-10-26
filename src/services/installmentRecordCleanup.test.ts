import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  foreign: new Set<string>(),
  remove: vi.fn(async (..._args: unknown[]) => undefined)
}))

vi.mock('./paymentTransactions', () => ({ deleteLinkedExpenseRecord: mocks.remove }))
vi.mock('./settleRecords', () => ({
  isLinkedForeignRecord: async (_sid: string, _type: string, id: string) => mocks.foreign.has(id)
}))

const { deleteRemovedPaymentRecords } = await import('./installmentRecordCleanup')

describe('deleteRemovedPaymentRecords', () => {
  beforeEach(() => {
    mocks.foreign = new Set()
    mocks.remove.mockClear()
  })

  it('deletes the records the app created', async () => {
    expect(await deleteRemovedPaymentRecords('sid', ['a', 'b'])).toBe(0)
    expect(mocks.remove.mock.calls.map(call => call[1])).toEqual(['a', 'b'])
  })

  it('keeps a record the user linked, and says how many it kept', async () => {
    mocks.foreign = new Set(['b'])
    expect(await deleteRemovedPaymentRecords('sid', ['a', 'b'])).toBe(1)
    expect(mocks.remove.mock.calls.map(call => call[1])).toEqual(['a'])
  })

  it('does nothing without records', async () => {
    expect(await deleteRemovedPaymentRecords('sid', [])).toBe(0)
    expect(mocks.remove).not.toHaveBeenCalled()
  })
})
