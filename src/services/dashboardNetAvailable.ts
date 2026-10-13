import type { FinancialSummary, NetAvailableConfig } from '../types'
import { getDefaultNetAvailableConfig } from './settings'

export function applyNetAvailableConfig(
  financial: Omit<FinancialSummary, 'totalAssets' | 'totalLiabilities' | 'netAvailable'>,
  config: NetAvailableConfig = getDefaultNetAvailableConfig()
): Pick<FinancialSummary, 'totalAssets' | 'totalLiabilities' | 'netAvailable'> {
  // Goal balances sit inside `treasuryTotal` but have their own switch.
  const goalsTotal = financial.goalsTotal ?? 0
  const vaultAssets = financial.treasuryTotal - goalsTotal

  const totalAssets =
    (config.assets.wallet ? financial.walletTotal : 0) +
    (config.assets.treasury ? vaultAssets : 0) +
    (config.assets.goals ? goalsTotal : 0) +
    (config.assets.receivables ? financial.receivablesTotal : 0)

  const totalLiabilities =
    (config.liabilities.installments ? financial.installmentsDue : 0) +
    (config.liabilities.dangs ? financial.dangsTotal : 0) +
    (config.liabilities.checks ? financial.checksDue : 0)

  return {
    totalAssets,
    totalLiabilities,
    netAvailable: totalAssets - totalLiabilities
  }
}
