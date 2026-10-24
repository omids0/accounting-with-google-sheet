import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'

import type { StoredRecord } from './recordsUtils'
import { useRecordsWalletOptions } from './useRecordsWalletOptions'

const fetchWalletAccounts = vi.fn()

vi.mock('../../services/settings', () => ({ getSettings: () => ({ spreadsheetId: 's1' }) }))
vi.mock('../../services/wallet', () => ({ fetchWalletAccounts: () => fetchWalletAccounts() }))

const records = [
  { values: { walletAccount: 'a1' } },
  { values: { walletAccount: 'gone' } }
] as unknown as StoredRecord[]

async function mount() {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const holder: { result?: ReturnType<typeof useRecordsWalletOptions> } = {}
  const Probe = () => {
    holder.result = useRecordsWalletOptions(records)

    return null
  }

  await act(async () => createRoot(document.createElement('div')).render(createElement(Probe)))

  return holder as { result: ReturnType<typeof useRecordsWalletOptions> }
}

describe('useRecordsWalletOptions', () => {
  it('titles the accounts once loaded and calls only a missing one deleted', async () => {
    fetchWalletAccounts.mockResolvedValue([{ id: 'a1', title: 'بانک ملی' }])

    const { result } = await mount()

    expect(result.options.map(option => option.label)).toEqual([
      'همه حساب‌ها',
      'بانک ملی',
      'حساب حذف‌شده'
    ])
    expect(result.titleOf('a1')).toBe('بانک ملی')
  })

  it('offers no account and no title while the read has not succeeded', async () => {
    fetchWalletAccounts.mockRejectedValue(new Error('offline'))

    const { result } = await mount()

    expect(result.options).toHaveLength(1)
    expect(result.titleOf('a1')).toBeUndefined()
  })
})
