import type { Receivable } from '../../types'

export type ReceivableWithRow = Receivable & { rowNumber: number }

export type ReceivablesPageProps = {
  active?: boolean
}

export type ReceivableFormState = {
  debtor: string
  category: string
  amount: number | ''
  borrowDate: string
  note: string
}

export type PaymentFormState = {
  receivableId: string
  amount: number | ''
  note: string
}

export type SettlementFormState = {
  receivableId: string
  title: string
  note: string
}
