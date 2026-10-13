import { exportChecksPdf, fetchChecks, totalUnpaidChecksInRange } from '../../services/checks'
import { exportDangsPdf, fetchDangs, unpaidDangTotal } from '../../services/dang'
import {
  exportInstallmentsPdf,
  fetchInstallmentPlans,
  totalUnpaidInstallments
} from '../../services/installments'
import {
  exportReceivablesPdf,
  fetchReceivables,
  remainingAmount,
  paidAmount
} from '../../services/receivables'
import { getReceivableDisplayTitle } from '../../services/receivablesRow'
import { fetchTgjuPrices } from '../../services/tgju'
import { getSummableTgjuPrices, vaultPriceKeys } from '../../services/tgjuCurrency'
import { exportTreasuryPdf, fetchVaultTransactions } from '../../services/treasury'
import { getAssetClassLabel } from '../../services/treasuryCatalog'
import { loadVaultCatalog } from '../../services/treasuryCatalogSheet'
import { computeHoldings, totalsByClass } from '../../services/treasuryHoldings'
import { formatPct, realizedInRange } from '../../services/treasuryPnl'
import { formatQuantityValue } from '../../services/treasuryQuantity'
import { exportWalletAccountsPdf, fetchWalletAccounts } from '../../services/wallet'
import { getDateRange } from '../../utils/dateRange'
import { formatMoney } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import type { AppIconName } from '../AppIcon'

export type ModuleReportKind =
  | 'wallet'
  | 'treasury'
  | 'receivables'
  | 'dang'
  | 'installments'
  | 'checks'

interface ModuleConfig {
  title: string
  icon: AppIconName
  exportPdf: (spreadsheetId: string) => Promise<string | null>
}

export const MODULE_CONFIG: Record<ModuleReportKind, ModuleConfig> = {
  wallet: { title: 'گزارش کیف پول', icon: 'wallet', exportPdf: exportWalletAccountsPdf },
  treasury: { title: 'گزارش صندوقچه', icon: 'treasury', exportPdf: exportTreasuryPdf },
  receivables: { title: 'گزارش طلب‌ها', icon: 'receivables', exportPdf: exportReceivablesPdf },
  dang: { title: 'گزارش بدهی‌ها', icon: 'debt', exportPdf: exportDangsPdf },
  installments: { title: 'گزارش اقساط', icon: 'installments', exportPdf: exportInstallmentsPdf },
  checks: { title: 'گزارش چک‌ها', icon: 'checks', exportPdf: exportChecksPdf }
}

export interface ReportRow {
  id: string
  title: string
  subtitle: string
  amount: number
}

/** A subtotal line (the vault's asset classes). */
export interface ReportGroup {
  id: string
  label: string
  total: number
}

export interface ModuleReportData {
  total: number
  groups?: ReportGroup[]
  secondaryTotal?: number
  secondaryLabel?: string
  /** Extra signed lines (the vault's profit and loss): tinted by their sign. */
  stats?: { id: string; label: string; amount: number }[]
  rows: ReportRow[]
}

export async function loadModuleReport(
  spreadsheetId: string,
  kind: ModuleReportKind
): Promise<ModuleReportData> {
  switch (kind) {
    case 'wallet': {
      const accounts = await fetchWalletAccounts(spreadsheetId)

      const total = accounts.reduce((sum, account) => sum + account.balance, 0)

      return {
        total,
        rows: accounts.map(account => ({
          id: account.id,
          title: account.title,
          subtitle: account.note || '—',
          amount: account.balance
        }))
      }
    }

    case 'treasury': {
      const [transactions] = await Promise.all([
        fetchVaultTransactions(spreadsheetId),
        loadVaultCatalog(spreadsheetId)
      ])

      // Opened straight from the menu, before the vault page cached tgju's quotes.
      await fetchTgjuPrices(vaultPriceKeys()).catch(() => null)

      const prices = getSummableTgjuPrices()

      const holdings = prices ? computeHoldings(transactions, prices) : []

      const total = holdings.reduce((sum, holding) => sum + holding.totalValue, 0)

      const year = getDateRange('year-to-date')

      return {
        total,
        stats: [
          {
            id: 'unrealized',
            label: 'سود/زیان باز',
            amount: holdings.reduce((sum, holding) => sum + holding.unrealized, 0)
          },
          {
            id: 'realized-year',
            label: 'سود قطعی امسال',
            amount: realizedInRange(transactions, { from: year.start, to: year.end })
          },
          {
            id: 'realized-all',
            label: 'سود قطعی کل',
            amount: realizedInRange(transactions, { from: '0000-01-01', to: '9999-12-31' })
          }
        ],
        groups: totalsByClass(holdings).map(group => ({
          id: group.assetClass,
          label: group.label,
          total: group.total
        })),
        rows: holdings.map(holding => ({
          id: holding.assetType,
          title: holding.asset.name,
          subtitle: [
            getAssetClassLabel(holding.asset.assetClass),
            holding.asset.symbol,
            `موجودی: ${formatQuantityValue(holding.netQuantity, holding.asset.decimals)} ${
              holding.asset.unit
            }`,
            holding.avgUnitCost > 0 ? `خرید میانگین: ${formatMoney(holding.avgUnitCost)}` : '',
            holding.avgUnitCost > 0
              ? `سود باز: ${formatMoney(holding.unrealized)} (${formatPct(holding.unrealizedPct)})`
              : '',
            holding.sellCount > 0 ? `سود قطعی: ${formatMoney(holding.realized)}` : ''
          ]
            .filter(Boolean)
            .join(' · '),
          amount: holding.totalValue
        }))
      }
    }

    case 'receivables': {
      const items = await fetchReceivables(spreadsheetId)

      const total = items.reduce((sum, item) => sum + remainingAmount(item), 0)

      const paid = items.reduce((sum, item) => sum + paidAmount(item), 0)

      return {
        total,
        secondaryTotal: paid,
        secondaryLabel: 'تسویه‌شده',
        rows: items.map(item => ({
          id: item.id,
          title: getReceivableDisplayTitle(item),
          subtitle: `${item.debtor} · ${item.category} · ${formatIsoDatePersian(item.borrowDate)}`,
          amount: remainingAmount(item)
        }))
      }
    }

    case 'dang': {
      const items = await fetchDangs(spreadsheetId)

      const total = unpaidDangTotal(items)

      return {
        total,
        rows: items
          .filter(item => !item.paid)
          .map(item => ({
            id: item.id,
            title: item.title,
            subtitle: `${item.counterparty} · ${formatIsoDatePersian(item.date)}`,
            amount: item.amount
          }))
      }
    }

    case 'installments': {
      const plans = await fetchInstallmentPlans(spreadsheetId)

      const range = getDateRange('year-to-date')

      const total = totalUnpaidInstallments(plans, range)

      return {
        total,
        rows: plans.flatMap(plan =>
          plan.payments
            .filter(payment => !payment.paid)
            .map(payment => ({
              id: `${plan.id}-${payment.n}`,
              title: plan.title,
              subtitle: `قسط ${payment.n} · ${formatIsoDatePersian(payment.dueDate)}`,
              amount: payment.amount ?? plan.amount
            }))
        )
      }
    }

    case 'checks': {
      const items = await fetchChecks(spreadsheetId)

      const range = getDateRange('year-to-date')

      const total = totalUnpaidChecksInRange(items, range)

      return {
        total,
        rows: items
          .filter(item => !item.paid)
          .map(item => ({
            id: item.id,
            title: item.counterparty || item.checkNumber,
            subtitle: `سررسید ${formatIsoDatePersian(item.dueDate)}`,
            amount: item.amount
          }))
      }
    }
  }
}
