import { useMemo, useState } from 'react'

import DangSplitCategorySection from './DangSplitCategorySection'
import DangSplitPersonCard from './DangSplitPersonCard'
import { dangSplitToolbarClass } from './dangSplitStyles'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { listCardsContainerClass } from '../ui/featureCardStyles'

type PeopleSection = {
  key: string
  title: string
  category: DangSplitCategoryWithRow | null
  people: DangSplitPersonWithRow[]
}

export default function DangSplitPeopleTab({
  people,
  categories,
  summary,
  depositPersonId,
  savingDepositId,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onOpenDepositForm,
  onCloseDepositForm,
  onDeposit,
  onAssignCategory,
  onLeaveCategory,
  onEditCategory,
  onDeleteCategory
}: {
  people: DangSplitPersonWithRow[]
  categories: DangSplitCategoryWithRow[]
  summary: DangSplitGroupSummary
  depositPersonId: string | null
  savingDepositId: string | null
  onAddPerson: () => void
  onEditPerson: (item: DangSplitPersonWithRow) => void
  onDeletePerson: (item: DangSplitPersonWithRow) => void
  onOpenDepositForm: (personId: string) => void
  onCloseDepositForm: () => void
  onDeposit: (person: DangSplitPersonWithRow, amount: number | '') => void
  onAssignCategory: (item: DangSplitPersonWithRow) => void
  onLeaveCategory: (item: DangSplitPersonWithRow) => void
  onEditCategory: (item: DangSplitCategoryWithRow) => void
  onDeleteCategory: (item: DangSplitCategoryWithRow) => void
}) {
  // دسته‌ها بسته شروع می‌شوند؛ این مجموعه دسته‌های بازشده را نگه می‌دارد.
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  const summaryByPerson = useMemo(
    () => new Map(summary.people.map(item => [item.personId, item])),
    [summary.people]
  )

  const sections = useMemo<PeopleSection[]>(
    () =>
      categories
        .map(category => ({
          key: category.id,
          title: category.title,
          category,
          people: people.filter(item => item.categoryId === category.id)
        }))
        // دسته بدون عضو کارتی نمی‌گیرد؛ مدیریتش از انتخابگر دسته‌بندی انجام می‌شود.
        .filter(section => section.people.length > 0),
    [categories, people]
  )

  // افراد بی‌دسته کارت گروهی ندارند و مستقیم لیست می‌شوند.
  const loosePeople = useMemo(
    () =>
      people.filter(
        item => !item.categoryId || !categories.some(category => category.id === item.categoryId)
      ),
    [categories, people]
  )

  const toggleSection = (key: string) => {
    setExpandedKeys(current =>
      current.includes(key) ? current.filter(item => item !== key) : [...current, key]
    )
  }

  if (sections.length === 0 && loosePeople.length === 0) {
    return (
      <div className={emptyStateClass}>
        <div className={emptyStateIconClass}>
          <AppIcon name="counterparties" />
        </div>
        <p>هنوز کسی به این دنگ اضافه نشده</p>
        <Button type="button" variant="primary" size="sm" onClick={onAddPerson}>
          افزودن فرد
        </Button>
      </div>
    )
  }

  return (
    <div className={dangSplitToolbarClass}>
      {sections.map(section => (
        <DangSplitCategorySection
          key={section.key}
          title={section.title}
          category={section.category}
          people={section.people}
          summaryByPerson={summaryByPerson}
          expanded={expandedKeys.includes(section.key)}
          onToggleExpand={() => toggleSection(section.key)}
          depositPersonId={depositPersonId}
          savingDepositId={savingDepositId}
          onEditPerson={onEditPerson}
          onDeletePerson={onDeletePerson}
          onOpenDepositForm={onOpenDepositForm}
          onCloseDepositForm={onCloseDepositForm}
          onDeposit={onDeposit}
          onAssignCategory={onAssignCategory}
          onLeaveCategory={onLeaveCategory}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ))}

      {loosePeople.length > 0 ? (
        <div className={listCardsContainerClass}>
          {loosePeople.map(item => (
            <DangSplitPersonCard
              key={item.id}
              item={item}
              summary={summaryByPerson.get(item.id)}
              showDepositForm={depositPersonId === item.id}
              savingDeposit={savingDepositId === item.id}
              onEdit={onEditPerson}
              onDelete={onDeletePerson}
              onOpenDepositForm={() => onOpenDepositForm(item.id)}
              onCloseDepositForm={onCloseDepositForm}
              onDeposit={amount => onDeposit(item, amount)}
              onAssignCategory={onAssignCategory}
              onLeaveCategory={onLeaveCategory}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
