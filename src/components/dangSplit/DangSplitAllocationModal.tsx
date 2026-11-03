import DangSplitAllocationFields from './DangSplitAllocationFields'
import { PERCENT_SAVE_HINT } from './dangSplitAllocationSeed'
import type {
  DangSplitCategoryWithRow,
  DangSplitExpenseWithRow,
  DangSplitPersonWithRow
} from './types'
import { useDangSplitAllocationDraft } from './useDangSplitAllocationDraft'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import type { DangSplitWeight } from '../../services/dangSplitMath'
import FormModal from '../FormModal'

export default function DangSplitAllocationModal({
  open,
  expense,
  people,
  categories,
  currentAllocations,
  saving,
  onClose,
  onSave
}: {
  open: boolean
  expense: DangSplitExpenseWithRow | null
  people: DangSplitPersonWithRow[]
  categories: DangSplitCategoryWithRow[]
  currentAllocations: DangSplitAllocationWithRow[]
  saving: boolean
  onClose: () => void
  onSave: (weights: DangSplitWeight[]) => void | Promise<void>
}) {
  const draft = useDangSplitAllocationDraft({
    open,
    amount: expense?.amount ?? 0,
    people,
    categories,
    currentAllocations
  })

  if (!expense) return null

  return (
    <FormModal
      open={open}
      title={`تخصیص افراد به «${expense.title}»`}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        if (draft.percentError) return

        return onSave(draft.weights)
      }}
      saving={saving}
      saveDisabled={draft.percentError !== null}
      saveHint={draft.percentError ? PERCENT_SAVE_HINT : undefined}
      saveLabel="ذخیره تخصیص"
      size="wide"
    >
      <DangSplitAllocationFields draft={draft} people={people} categories={categories} />
    </FormModal>
  )
}
