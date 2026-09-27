import DangSplitPersonCard from './DangSplitPersonCard'
import { dangSplitCountBadgeClass, dangSplitEmptySectionClass } from './dangSplitStyles'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import { cn } from '../../utils/cn'
import { formatMoney } from '../../utils/formatMoney'
import { AccordionCollapse } from '../AccordionCollapse'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import CardExpandButton from '../CardExpandButton'
import {
  cardActionButtonsClass,
  cardHeaderWithEditClass,
  installmentCardClass,
  installmentHeaderClass,
  installmentPaymentsClass,
  listCardAmountPillClass,
  listCardSubtitleClass,
  listCardTitleClass,
  listCardsContainerClass
} from '../ui/featureCardStyles'

export default function DangSplitCategorySection({
  title,
  category,
  people,
  shareByPerson,
  expanded,
  onToggleExpand,
  onEditPerson,
  onDeletePerson,
  onEditCategory,
  onDeleteCategory
}: {
  title: string
  category: DangSplitCategoryWithRow | null
  people: DangSplitPersonWithRow[]
  shareByPerson: Map<string, number>
  expanded: boolean
  onToggleExpand: () => void
  onEditPerson: (item: DangSplitPersonWithRow) => void
  onDeletePerson: (item: DangSplitPersonWithRow) => void
  onEditCategory: (item: DangSplitCategoryWithRow) => void
  onDeleteCategory: (item: DangSplitCategoryWithRow) => void
}) {
  const totalShare = people.reduce((sum, item) => sum + (shareByPerson.get(item.id) ?? 0), 0)

  return (
    <div className={installmentCardClass({ expanded })}>
      <div className={cardHeaderWithEditClass}>
        <button
          type="button"
          className={cn('installment-header', installmentHeaderClass(expanded))}
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? `بستن افراد ${title}` : `نمایش افراد ${title}`}
        >
          <div>
            <div className={listCardTitleClass}>
              {title}
              <span className={dangSplitCountBadgeClass}>
                {people.length.toLocaleString('fa-IR')} نفر
              </span>
            </div>
            <div className={listCardSubtitleClass}>
              جمع سهم: <span className={listCardAmountPillClass}>{formatMoney(totalShare)}</span>
            </div>
          </div>
        </button>
        <div className={cardActionButtonsClass}>
          {category ? (
            <>
              <CardEditButton
                onClick={event => {
                  event.stopPropagation()
                  onEditCategory(category)
                }}
                ariaLabel={`ویرایش دسته ${title}`}
              />
              <CardDeleteButton
                onClick={event => {
                  event.stopPropagation()
                  onDeleteCategory(category)
                }}
                ariaLabel={`حذف دسته ${title}`}
              />
            </>
          ) : null}
          <CardExpandButton
            expanded={expanded}
            onClick={event => {
              event.stopPropagation()
              onToggleExpand()
            }}
            ariaLabel={expanded ? `بستن افراد ${title}` : `نمایش افراد ${title}`}
          />
        </div>
      </div>

      <AccordionCollapse open={expanded}>
        <div className={installmentPaymentsClass}>
          {people.length === 0 ? (
            <p className={dangSplitEmptySectionClass}>کسی در این دسته نیست</p>
          ) : (
            <div className={listCardsContainerClass}>
              {people.map(item => (
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
      </AccordionCollapse>
    </div>
  )
}
