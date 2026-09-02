import { getSettings } from '../../services/settings'

export function getDefaultSettlementIncomeCategory(): string {
  const incomeForm = getSettings()?.forms.find(f => f.type === 'income')

  const options = incomeForm?.fields.find(f => f.id === 'category')?.options ?? []

  return options.includes('طلب') ? 'طلب' : options[0] ?? 'طلب'
}

export function buildSettlementTitle(debtor: string): string {
  return `طلب: ${debtor}`
}
