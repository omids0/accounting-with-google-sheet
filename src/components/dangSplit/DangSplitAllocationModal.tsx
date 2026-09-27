import {
  dangSplitAllocationListClass,
  dangSplitAllocationRowClass,
  dangSplitChipClass,
  dangSplitChipsRowClass,
  dangSplitPercentInputClass,
  dangSplitSectionTitleClass,
  dangSplitStatLabelClass,
  dangSplitStatValueClass
} from './dangSplitStyles'
import type {
  DangSplitCategoryWithRow,
  DangSplitExpenseWithRow,
  DangSplitPersonWithRow
} from './types'
import { useDangSplitAllocationDraft } from './useDangSplitAllocationDraft'
import type { DangSplitAllocationWithRow } from '../../services/dangSplitExpenses'
import type { DangSplitWeight } from '../../services/dangSplitMath'
import { formatMoney } from '../../utils/formatMoney'
import ConfirmActionModal from '../ConfirmActionModal'
import FormModal from '../FormModal'
import TransactionTypeSegment from '../TransactionTypeSegment'
import Button from '../ui/Button'
import { formControlClassName } from '../ui/formStyles'

const MODE_OPTIONS = [
  { id: 'equal', label: 'سهم مساوی' },
  { id: 'manual', label: 'سهم دستی' }
]

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
    <>
      <FormModal
        open={open}
        title={`تخصیص افراد به «${expense.title}»`}
        onClose={onClose}
        onSubmit={event => {
          event.preventDefault()
          void onSave(draft.weights)
        }}
        saving={saving}
        saveLabel="ذخیره تخصیص"
        size="wide"
      >
        <div className={dangSplitChipsRowClass}>
          <Button type="button" variant="secondary" size="sm" onClick={draft.selectAll}>
            همه
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={draft.clearAll}>
            هیچ‌کس
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => draft.setPendingCategory(category)}
            >
              {category.title}
            </Button>
          ))}
        </div>

        <TransactionTypeSegment
          options={MODE_OPTIONS}
          value={draft.mode}
          onChange={id => draft.setMode(id === 'manual' ? 'manual' : 'equal')}
          ariaLabel="نحوه تقسیم سهم"
        />

        {draft.mode === 'manual' ? (
          <p className={dangSplitSectionTitleClass}>
            درصد هر کس را که می‌خواهی دستی بزن؛ بقیه به تناسب ضریبشان باقی درصد را پر می‌کنند. مجموع
            درصدهای دستی: {draft.manualTotal.toLocaleString('fa-IR')}٪
          </p>
        ) : null}

        <div className={dangSplitAllocationListClass}>
          {people.length === 0 ? (
            <p className={dangSplitSectionTitleClass}>ابتدا در تب افراد، افراد را ثبت کنید</p>
          ) : (
            people.map(person => {
              const selected = draft.selectedIds.includes(person.id)

              return (
                <div key={person.id} className={dangSplitAllocationRowClass}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => draft.togglePerson(person.id)}
                    />{' '}
                    {person.name}
                    <span className={dangSplitChipClass}>
                      ضریب {person.defaultWeight.toLocaleString('fa-IR')}
                    </span>
                  </label>

                  {selected && draft.mode === 'manual' ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      className={formControlClassName(dangSplitPercentInputClass)}
                      value={draft.manualPercents[person.id] ?? ''}
                      onChange={event =>
                        draft.setPercent(
                          person.id,
                          event.target.value === '' ? '' : Number(event.target.value)
                        )
                      }
                      aria-label={`درصد سهم ${person.name}`}
                    />
                  ) : null}

                  {selected ? (
                    <span className={dangSplitStatValueClass}>
                      {formatMoney(draft.shares.get(person.id) ?? 0)}
                    </span>
                  ) : (
                    <span className={dangSplitStatLabelClass}>بدون سهم</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </FormModal>

      <ConfirmActionModal
        open={draft.pendingCategory !== null}
        title="افزودن اعضای دسته"
        message={
          draft.pendingCategory
            ? `${draft
                .categoryPeople(draft.pendingCategory.id)
                .map(item => item.name)
                .join('، ')} به این هزینه اضافه شوند؟`
            : ''
        }
        confirmLabel="اضافه کن"
        onClose={() => draft.setPendingCategory(null)}
        onConfirm={draft.confirmCategory}
      />
    </>
  )
}
