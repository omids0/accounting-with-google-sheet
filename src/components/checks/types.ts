import type { Check } from '../../types'

export type CheckWithRow = Check & { rowNumber: number }

export type CheckFormState = {
  checkNumber: string
  counterparty: string
  amount: number | ''
  creationDate: string
  dueDate: string
}

export type ChecksPageProps = {
  active?: boolean
}
