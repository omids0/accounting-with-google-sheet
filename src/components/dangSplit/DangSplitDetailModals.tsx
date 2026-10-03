import DangSplitAllocationModal from './DangSplitAllocationModal'
import DangSplitAssignCategoryModal from './DangSplitAssignCategoryModal'
import DangSplitCategoryFormModal from './DangSplitCategoryFormModal'
import DangSplitExpenseFormModal from './DangSplitExpenseFormModal'
import DangSplitPersonFormModal from './DangSplitPersonFormModal'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import type { useDangSplitCategoryActions } from './useDangSplitCategoryActions'
import type { useDangSplitExpenseActions } from './useDangSplitExpenseActions'
import type { useDangSplitPersonActions } from './useDangSplitPersonActions'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'

export default function DangSplitDetailModals({
  groupId,
  onCategoriesSaved,
  people,
  categories,
  allocationsByExpense,
  personActions,
  categoryActions,
  expenseActions
}: {
  groupId: string
  onCategoriesSaved: () => Promise<void> | void
  people: DangSplitPersonWithRow[]
  categories: DangSplitCategoryWithRow[]
  allocationsByExpense: Map<string, DangSplitAllocationWithRow[]>
  personActions: ReturnType<typeof useDangSplitPersonActions>
  categoryActions: ReturnType<typeof useDangSplitCategoryActions>
  expenseActions: ReturnType<typeof useDangSplitExpenseActions>
}) {
  return (
    <>
      <DangSplitPersonFormModal
        open={personActions.showForm}
        editingItem={personActions.editingItem}
        groupId={groupId}
        categories={categories}
        onCategoriesSaved={onCategoriesSaved}
        saving={personActions.saving}
        onClose={personActions.closeForm}
        onSubmit={personActions.handleSubmit}
      />

      <ConfirmDeleteModal
        open={personActions.deletingItem !== null}
        title="حذف فرد"
        message={`با حذف «${
          personActions.deletingItem?.name ?? ''
        }» تخصیص‌های او هم حذف می‌شوند. مطمئن هستید؟`}
        deleting={personActions.deleting}
        onClose={personActions.closeDeleteConfirm}
        onConfirm={personActions.handleDelete}
      />

      <DangSplitAssignCategoryModal
        open={personActions.assigningItem !== null}
        person={personActions.assigningItem}
        groupId={groupId}
        categories={categories}
        saving={personActions.savingCategory}
        onClose={personActions.closeAssignCategory}
        onCategoriesSaved={onCategoriesSaved}
        onSubmit={categoryId => {
          if (personActions.assigningItem) {
            void personActions.saveCategory(personActions.assigningItem, categoryId)
          }
        }}
      />

      <ConfirmActionModal
        open={personActions.leavingItem !== null}
        title="خروج از دسته"
        message={`«${
          personActions.leavingItem?.name ?? ''
        }» از دسته‌اش خارج شود؟ خود فرد و هزینه‌هایش حذف نمی‌شوند.`}
        confirmLabel="خارج کن"
        confirming={personActions.savingCategory}
        onClose={personActions.closeLeaveCategory}
        onConfirm={() => {
          if (personActions.leavingItem) {
            void personActions.saveCategory(personActions.leavingItem, '')
          }
        }}
      />

      <DangSplitCategoryFormModal
        open={categoryActions.showForm}
        editingItem={categoryActions.editingItem}
        saving={categoryActions.saving}
        onClose={categoryActions.closeForm}
        onSubmit={categoryActions.handleSubmit}
      />

      <ConfirmDeleteModal
        open={categoryActions.deletingItem !== null}
        title="حذف دسته"
        message={`دسته «${
          categoryActions.deletingItem?.title ?? ''
        }» حذف شود؟ افراد آن حذف نمی‌شوند و بی‌دسته می‌مانند.`}
        deleting={categoryActions.deleting}
        onClose={categoryActions.closeDeleteConfirm}
        onConfirm={categoryActions.handleDelete}
      />

      <DangSplitExpenseFormModal
        open={expenseActions.showForm}
        editingItem={expenseActions.editingItem}
        people={people}
        categories={categories}
        currentAllocations={
          expenseActions.editingItem
            ? allocationsByExpense.get(expenseActions.editingItem.id) ?? []
            : []
        }
        saving={expenseActions.saving}
        onClose={expenseActions.closeForm}
        onSubmit={expenseActions.handleSubmit}
      />

      <ConfirmDeleteModal
        open={expenseActions.deletingItem !== null}
        title="حذف هزینه"
        message={`با حذف «${
          expenseActions.deletingItem?.title ?? ''
        }» تخصیص‌های آن هم حذف می‌شوند. مطمئن هستید؟`}
        deleting={expenseActions.deleting}
        onClose={expenseActions.closeDeleteConfirm}
        onConfirm={expenseActions.handleDelete}
      />

      <DangSplitAllocationModal
        open={expenseActions.allocatingItem !== null}
        expense={expenseActions.allocatingItem}
        people={people}
        categories={categories}
        currentAllocations={
          expenseActions.allocatingItem
            ? allocationsByExpense.get(expenseActions.allocatingItem.id) ?? []
            : []
        }
        saving={expenseActions.savingAllocation}
        onClose={expenseActions.closeAllocationModal}
        onSave={expenseActions.handleSaveAllocations}
      />
    </>
  )
}
