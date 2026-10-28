import { describe, expect, it } from 'vitest'

import {
  monthEndNetWorthReader,
  rebuildMonthValues,
  unquotedVaultAssetsAt,
  type NetWorthRebuildInput
} from './netWorthRebuild'
import type { NetAvailableConfig, VaultAsset, VaultTransaction } from '../types'
import { jalaliToIso } from '../utils/jalaliDate'

const ALL_ON: NetAvailableConfig = {
  assets: { wallet: true, treasury: true, goals: true, receivables: true, checksReceived: true },
  liabilities: { installments: true, dangs: true, checks: true }
}

const buy = (assetType: string, quantity: number): VaultTransaction => ({
  id: `v-${assetType}`,
  createdAt: '',
  assetType,
  action: 'buy',
  quantity,
  unitPrice: 0,
  transactionDate: jalaliToIso(1405, 5, 10),
  note: ''
})

const asset = (id: string, priceSource: 'tgju' | 'manual', manualPrice = 0): VaultAsset => ({
  id,
  assetClass: 'gold',
  symbol: id,
  name: id === 'coin' ? 'سکه دستی' : 'نیم سکه',
  unit: 'عدد',
  decimals: 0,
  priceSource,
  tgjuKey: priceSource === 'tgju' ? id : '',
  manualPrice,
  manualPriceAt: '',
  active: true
})

const base: NetWorthRebuildInput = {
  walletTotal: 1_000,
  monthlyNet: new Map([['1405-05', { income: 100, expense: 0 }]]),
  vaultTransactions: [buy('coin', 2), buy('nim', 1)],
  prices: null,
  catalog: [asset('coin', 'manual', 500), asset('nim', 'tgju')],
  goalsTotal: 0,
  receivables: [],
  installmentPlans: [],
  checks: [],
  dangs: []
}

describe('the vault of a rebuilt month without tgju prices', () => {
  it('values manual-priced assets and names the live-priced one that has no quote', () => {
    expect(rebuildMonthValues(base, '1405-06', ALL_ON)?.assets).toBe(1_000 + 2 * 500)
    expect(unquotedVaultAssetsAt(base, '1405-06')).toEqual(['نیم سکه'])
  })

  it('names nothing once the quote exists, and values the live-priced asset', () => {
    const quoted = { ...base, prices: { nim: 20_000 } }

    expect(unquotedVaultAssetsAt(quoted, '1405-06')).toEqual([])
    expect(rebuildMonthValues(quoted, '1405-06', ALL_ON)?.assets).toBe(1_000 + 1_000 + 20_000)
  })

  it('names nothing for a month before the asset was bought', () => {
    expect(unquotedVaultAssetsAt(base, '1405-04')).toEqual([])
  })

  it('gives the report reader no value for a month it could only half value', () => {
    expect(monthEndNetWorthReader(base, ALL_ON)('1405-06')).toBeNull()
    expect(
      monthEndNetWorthReader({ ...base, vaultTransactions: [buy('coin', 2)] }, ALL_ON)('1405-06')
    ).toBe(2_000)
  })
})
