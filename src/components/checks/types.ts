import type { Check, CheckDirection } from '../../types'

export type CheckWithRow = Check & { rowNumber: number }

export type CheckFormState = {
  direction: CheckDirection
  checkNumber: string
  counterparty: string
  subCategory: string
  amount: number | ''
  creationDate: string
  dueDate: string
}

export type ChecksPageProps = {
  active?: boolean
}
