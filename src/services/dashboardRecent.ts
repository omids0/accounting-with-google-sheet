import { WALLET_ACCOUNT_FIELD_ID } from '../components/form/fieldUtils'
import type { DashboardRecord, WalletAccount } from '../types'
import { parseNumeric } from '../utils/parseNumeric'

type SheetRecord = {
  id?: string
  values: Record<string, string>
  createdAt?: string
  writer?: string
}

interface RecentSide {
  records: SheetRecord[]
  formName: string
  dateField: string
}

/** The period's income and expense records, newest first, for «آخرین تراکنش‌ها». */
export function buildRecentRecords(
  income: RecentSide,
  expense: RecentSide,
  accounts: Pick<WalletAccount, 'id' | 'title'>[]
): DashboardRecord[] {
  const accountTitles = new Map(accounts.map(account => [account.id, account.title]))

  const accountOf = (values: Record<string, string>) =>
    accountTitles.get(String(values[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()) || undefined

  const toRecent = (side: RecentSide, type: 'income' | 'expense') =>
    side.records.map(r => ({
      id: r.id,
      formName: side.formName,
      title: r.values.title || '—',
      amount: parseNumeric(r.values.amount),
      type,
      category: r.values.category || 'سایر',
      date: r.values[side.dateField] ?? '',
      account: accountOf(r.values),
      writer: r.writer || undefined,
      createdAt: r.createdAt
    }))

  return [...toRecent(income, 'income'), ...toRecent(expense, 'expense')]
    .sort((a, b) => {
      const byDate = (b.date || '').localeCompare(a.date || '')

      if (byDate !== 0) return byDate

      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })
    .map(({ createdAt: _, ...record }) => record)
}
