import { useMemo, useState } from 'react'

import DangSplitDetailModals from './DangSplitDetailModals'
import DangSplitExpensesTab from './DangSplitExpensesTab'
import DangSplitPeopleTab from './DangSplitPeopleTab'
import { dangSplitToolbarClass } from './dangSplitStyles'
import DangSplitSummaryTab from './DangSplitSummaryTab'
import type { DangSplitDetailTab, DangSplitGroupWithRow } from './types'
import { useDangSplitCategoryActions } from './useDangSplitCategoryActions'
import { useDangSplitDetailData } from './useDangSplitDetailData'
import { useDangSplitDetailSpeedDial } from './useDangSplitDetailSpeedDial'
import { useDangSplitExpenseActions } from './useDangSplitExpenseActions'
import { useDangSplitPersonActions } from './useDangSplitPersonActions'
import { isConfigured } from '../../services/settings'
import AppIcon from '../AppIcon'
import { DangCardListSkeleton } from '../skeleton'
import TransactionTypeSegment from '../TransactionTypeSegment'
import Card from '../ui/Card'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listModulePageClass } from '../ui/featureCardStyles'

export default function DangSplitDetailPage({
  group,
  active = true
}: {
  group: DangSplitGroupWithRow
  active?: boolean
}) {
  const [detailTab, setDetailTab] = useState<DangSplitDetailTab>('summary')
  const data = useDangSplitDetailData(group)

  const personActions = useDangSplitPersonActions({ groupId: group.id, onSaved: data.loadItems })
  const categoryActions = useDangSplitCategoryActions({
    groupId: group.id,
    onSaved: data.loadItems
  })
  const expenseActions = useDangSplitExpenseActions({ groupId: group.id, onSaved: data.loadItems })

  useDangSplitDetailSpeedDial({
    active,
    detailTab,
    groupTitle: group.title,
    summary: data.summary,
    loading: data.loading,
    onAddExpense: expenseActions.openCreateForm,
    onAddPerson: personActions.openCreateForm,
    onAddCategory: categoryActions.openCreateForm,
    onRefresh: () => void data.loadItems()
  })

  const tabOptions = useMemo(
    () => [
      { id: 'summary', label: 'جمع‌بندی دنگ' },
      { id: 'people', label: `افراد (${data.people.length.toLocaleString('fa-IR')})` },
      { id: 'expenses', label: `اقلام (${data.expenses.length.toLocaleString('fa-IR')})` }
    ],
    [data.expenses.length, data.people.length]
  )

  if (!isConfigured()) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="calculator" />
        </div>
        <p>ابتدا با گوگل وارد شوید</p>
      </div>
    )
  }

  return (
    <div className={listModulePageClass}>
      <Card className={dangSplitToolbarClass}>
        <TransactionTypeSegment
          options={tabOptions}
          value={detailTab}
          onChange={id => setDetailTab(id as DangSplitDetailTab)}
          ariaLabel="بخش‌های دنگ"
          className="mb-0"
        />
      </Card>

      {data.loading && data.people.length === 0 && data.expenses.length === 0 ? (
        <DangCardListSkeleton filterChips={0} />
      ) : detailTab === 'summary' ? (
        <DangSplitSummaryTab
          summary={data.summary}
          people={data.people}
          categoryTitleById={data.categoryTitleById}
          onSaved={data.loadItems}
        />
      ) : detailTab === 'people' ? (
        <DangSplitPeopleTab
          people={data.people}
          categories={data.categories}
          summary={data.summary}
          onAddPerson={personActions.openCreateForm}
          onEditPerson={personActions.openEditForm}
          onDeletePerson={personActions.setDeletingItem}
          onEditCategory={categoryActions.openEditForm}
          onDeleteCategory={categoryActions.setDeletingItem}
        />
      ) : (
        <DangSplitExpensesTab
          expenses={data.expenses}
          allocationsByExpense={data.allocationsByExpense}
          peopleById={data.peopleById}
          onAdd={expenseActions.openCreateForm}
          onAllocate={expenseActions.setAllocatingItem}
          onEdit={expenseActions.openEditForm}
          onDelete={expenseActions.setDeletingItem}
        />
      )}

      <DangSplitDetailModals
        groupId={group.id}
        onCategoriesSaved={data.loadItems}
        people={data.people}
        categories={data.categories}
        allocationsByExpense={data.allocationsByExpense}
        personActions={personActions}
        categoryActions={categoryActions}
        expenseActions={expenseActions}
      />
    </div>
  )
}
