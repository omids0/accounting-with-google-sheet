import { getReceivableDisplayTitle } from '../../services/receivablesRow'
import { getSettings } from '../../services/settings'
import type { Receivable } from '../../types'

export function getDefaultSettlementIncomeCategory(): string {
  const incomeForm = getSettings()?.forms.find(f => f.type === 'income')

  const options = incomeForm?.fields.find(f => f.id === 'category')?.options ?? []

  return options.includes('طلب') ? 'طلب' : options[0] ?? 'طلب'
}

export function buildSettlementTitle(receivable: Pick<Receivable, 'title' | 'debtor'>): string {
  return `طلب: ${getReceivableDisplayTitle(receivable)}`
}
