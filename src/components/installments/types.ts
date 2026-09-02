import type { PlanWithRow } from '../InstallmentPlanCard'

export type InstallmentsPageProps = {
  onReauth?: () => void
  active?: boolean
}

export type InstallmentFormState = {
  title: string
  amount: number | ''
  count: number | ''
  dueDay: number | ''
  startDate: string
  paidUntil: string
  note: string
}

export type DisplayPlanItem = {
  plan: PlanWithRow
  done: number
  complete: boolean
  progress: number
  dueDate: string
}

export type { PlanWithRow }
