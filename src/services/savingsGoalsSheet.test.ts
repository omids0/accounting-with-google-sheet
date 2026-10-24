import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getPendingGoalCongrats, queueGoalCongrats } from './goalCongrats'
import { saveSavingsGoal } from './savingsGoalsSheet'
import type { SavingsGoal } from '../types'

vi.mock('./sheets', () => ({
  appendSheetRow: vi.fn(),
  ensureSheetWithHeaders: vi.fn(),
  fetchSheetRows: vi.fn(),
  updateSheetRow: vi.fn()
}))
vi.mock('./activityLog', () => ({ logItemActivity: vi.fn() }))
vi.mock('./wallet', () => ({ fetchWalletAccounts: vi.fn(), updateWalletAccount: vi.fn() }))
vi.mock('./walletLedger', async importOriginal => ({
  ...(await importOriginal<object>()),
  appendLedgerEntries: vi.fn()
}))

const goal: SavingsGoal = {
  id: 'g1',
  createdAt: '',
  title: 'سفر',
  target: 10,
  targetDate: '',
  defaultAccountId: '',
  note: '',
  status: 'reached'
}

describe('saving a savings goal and its congratulation', () => {
  beforeEach(() => localStorage.clear())

  it('keeps the congratulation while the goal stays reached', async () => {
    queueGoalCongrats('s1', goal)
    await saveSavingsGoal('s1', goal, 2)
    expect(getPendingGoalCongrats('s1')).toHaveLength(1)
  })

  it('forgets it when the goal is reopened, e.g. by raising its target', async () => {
    queueGoalCongrats('s1', goal)
    await saveSavingsGoal('s1', { ...goal, target: 20, status: 'active' }, 2)
    expect(getPendingGoalCongrats('s1')).toEqual([])
    expect(queueGoalCongrats('s1', goal)).toBe(true)
  })
})
