import DangSplitPersonCard from './DangSplitPersonCard'
import {
  dangSplitBalanceLabelClass,
  dangSplitBalanceRowClass,
  dangSplitBalanceValueClass,
  dangSplitCountBadgeClass,
  dangSplitEmptySectionClass
} from './dangSplitStyles'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import type { DangSplitPersonSummary } from '../../types/dangSplit'
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
  summaryByPerson,
  expanded,
  onToggleExpand,
  depositPersonId,
  savingDepositId,
  onEditPerson,
  onDeletePerson,
  onOpenDepositForm,
  onCloseDepositForm,
  onDeposit,
  onEditCategory,
  onDeleteCategory
}: {
  title: string
  category: DangSplitCategoryWithRow | null
  people: DangSplitPersonWithRow[]
  summaryByPerson: Map<string, DangSplitPersonSummary>
  expanded: boolean
  onToggleExpand: () => void
  depositPersonId: string | null
  savingDepositId: string | null
  onEditPerson: (item: DangSplitPersonWithRow) => void
  onDeletePerson: (item: DangSplitPersonWithRow) => void
  onOpenDepositForm: (personId: string) => void
  onCloseDepositForm: () => void
  onDeposit: (person: DangSplitPersonWithRow, amount: number | '') => void
  onEditCategory: (item: DangSplitCategoryWithRow) => void
  onDeleteCategory: (item: DangSplitCategoryWithRow) => void
}) {
  const totals = people.reduce(
    (acc, item) => {
      const summary = summaryByPerson.get(item.id)

      return {
        share: acc.share + (summary?.share ?? 0),
        balance: acc.balance + (summary?.balance ?? 0)
      }
    },
    { share: 0, balance: 0 }
  )
  const balanceLabel = totals.balance < 0 ? 'طلبکار' : totals.balance > 0 ? 'بدهکار' : 'مانده'

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
            <div className={dangSplitBalanceRowClass}>
              <span className={dangSplitBalanceLabelClass}>{balanceLabel}:</span>
              <span
                className={dangSplitBalanceValueClass(
                  totals.balance === 0 ? 'settled' : totals.balance < 0 ? 'credit' : 'debt'
                )}
              >
                {formatMoney(Math.abs(totals.balance))}
              </span>
            </div>

            <div className={listCardSubtitleClass}>
              جمع سهم: <span className={listCardAmountPillClass}>{formatMoney(totals.share)}</span>
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
                  summary={summaryByPerson.get(item.id)}
                  showDepositForm={depositPersonId === item.id}
                  savingDeposit={savingDepositId === item.id}
                  onEdit={onEditPerson}
                  onDelete={onDeletePerson}
                  onOpenDepositForm={() => onOpenDepositForm(item.id)}
                  onCloseDepositForm={onCloseDepositForm}
                  onDeposit={amount => onDeposit(item, amount)}
                />
              ))}
            </div>
          )}
        </div>
      </AccordionCollapse>
    </div>
  )
}
