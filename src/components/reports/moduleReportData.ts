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
import { getCachedTgjuPrices } from '../../services/tgju'
import { exportTreasuryPdf, computeHoldings, fetchVaultTransactions } from '../../services/treasury'
import { exportWalletAccountsPdf, fetchWalletAccounts } from '../../services/wallet'
import { getDateRange } from '../../utils/dateRange'
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
  exportPdf: (spreadsheetId: string) => Promise<void>
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

export interface ModuleReportData {
  total: number
  secondaryTotal?: number
  secondaryLabel?: string
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
      const prices = getCachedTgjuPrices()

      const transactions = prices ? await fetchVaultTransactions(spreadsheetId) : []

      const holdings = prices ? computeHoldings(transactions, prices) : []

      const total = holdings.reduce((sum, holding) => sum + holding.totalValue, 0)

      return {
        total,
        rows: holdings.map(holding => ({
          id: holding.assetType,
          title: holding.assetType,
          subtitle: `موجودی: ${holding.netQuantity}`,
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
          title: item.debtor,
          subtitle: `${item.category} · ${formatIsoDatePersian(item.borrowDate)}`,
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
