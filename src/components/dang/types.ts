import type { Dang } from '../../types'

export type DangWithRow = Dang & { rowNumber: number }

export type DangFormState = {
  title: string
  category: string
  counterparty: string
  amount: number | ''
  date: string
  note: string
}
