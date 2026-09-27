import { useMemo, useState } from 'react'

import DangSplitCategorySection from './DangSplitCategorySection'
import { dangSplitToolbarClass } from './dangSplitStyles'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import AppIcon from '../AppIcon'
import Button from '../ui/Button'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'

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
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onEditCategory,
  onDeleteCategory
}: {
  people: DangSplitPersonWithRow[]
  categories: DangSplitCategoryWithRow[]
  summary: DangSplitGroupSummary
  onAddPerson: () => void
  onEditPerson: (item: DangSplitPersonWithRow) => void
  onDeletePerson: (item: DangSplitPersonWithRow) => void
  onEditCategory: (item: DangSplitCategoryWithRow) => void
  onDeleteCategory: (item: DangSplitCategoryWithRow) => void
}) {
  // دسته‌ها بسته شروع می‌شوند؛ این مجموعه دسته‌های بازشده را نگه می‌دارد.
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])

  const summaryByPerson = useMemo(
    () => new Map(summary.people.map(item => [item.personId, item])),
    [summary.people]
  )

  const sections = useMemo<PeopleSection[]>(() => {
    const grouped: PeopleSection[] = categories.map(category => ({
      key: category.id,
      title: category.title,
      category,
      people: people.filter(item => item.categoryId === category.id)
    }))
    const loose = people.filter(
      item => !item.categoryId || !categories.some(category => category.id === item.categoryId)
    )

    if (loose.length > 0) {
      grouped.push({ key: 'none', title: 'بدون دسته', category: null, people: loose })
    }

    return grouped
  }, [categories, people])

  const toggleSection = (key: string) => {
    setExpandedKeys(current =>
      current.includes(key) ? current.filter(item => item !== key) : [...current, key]
    )
  }

  if (sections.length === 0) {
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
          onEditPerson={onEditPerson}
          onDeletePerson={onDeletePerson}
          onEditCategory={onEditCategory}
          onDeleteCategory={onDeleteCategory}
        />
      ))}
    </div>
  )
}
