import { useMemo } from 'react'

import DangSplitPersonCard from './DangSplitPersonCard'
import {
  dangSplitCountBadgeClass,
  dangSplitEmptySectionClass,
  dangSplitGroupClass,
  dangSplitGroupHeaderClass,
  dangSplitGroupHeaderTitleClass,
  dangSplitToolbarClass
} from './dangSplitStyles'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitGroupSummary } from '../../types/dangSplit'
import AppIcon from '../AppIcon'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import Button from '../ui/Button'
import { emptyStateClass, emptyStateIconClass } from '../ui/displayStyles'
import { cardActionButtonsClass, listCardsContainerClass } from '../ui/featureCardStyles'

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
  const shareByPerson = useMemo(
    () => new Map(summary.people.map(item => [item.personId, item.share])),
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

  if (people.length === 0 && categories.length === 0) {
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
        <div key={section.key} className={dangSplitGroupClass}>
          <div className={dangSplitGroupHeaderClass}>
            <span className={dangSplitGroupHeaderTitleClass}>
              {section.title}
              <span className={dangSplitCountBadgeClass}>
                {section.people.length.toLocaleString('fa-IR')} نفر
              </span>
            </span>
            {section.category ? (
              <span className={cardActionButtonsClass}>
                <CardEditButton
                  onClick={() => onEditCategory(section.category as DangSplitCategoryWithRow)}
                  ariaLabel={`ویرایش دسته ${section.title}`}
                />
                <CardDeleteButton
                  onClick={() => onDeleteCategory(section.category as DangSplitCategoryWithRow)}
                  ariaLabel={`حذف دسته ${section.title}`}
                />
              </span>
            ) : null}
          </div>

          {section.people.length === 0 ? (
            <p className={dangSplitEmptySectionClass}>کسی در این دسته نیست</p>
          ) : (
            <div className={listCardsContainerClass}>
              {section.people.map(item => (
                <DangSplitPersonCard
                  key={item.id}
                  item={item}
                  share={shareByPerson.get(item.id) ?? 0}
                  onEdit={onEditPerson}
                  onDelete={onDeletePerson}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
