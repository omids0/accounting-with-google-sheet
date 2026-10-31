import { useState } from 'react'

import SharedSplitFields from './SharedSplitFields'
import type { SharedRecords } from './useSharedRecords'
import { can } from '../../services/buildingRoles'
import { readCategoryList } from '../../services/categoryManage'
import { getTodayIso } from '../../utils/jalaliDate'
import { lockedCategoriesFor, SETTLEMENT_CATEGORY } from '../../utils/protectedCategories'
import AmountField from '../AmountField'
import { CategorySelect, FormField, SegmentedRadio } from '../form'
import {
  SHARED_CREATOR_FIELD_ID,
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID,
  effectiveSplit,
  type SharedSplit
} from '../form/sharedFields'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import { alertClassName } from '../ui/Alert'
import { formFieldClass, formLabelClass } from '../ui/formStyles'
import { sharedAlertClass } from '../ui/sharedStyles'

type RecordType = 'income' | 'expense'

const TYPE_OPTIONS: { value: RecordType; label: string }[] = [
  { value: 'expense', label: 'هزینه' },
  { value: 'income', label: 'درآمد' }
]

/** The shared list without «تسویه»: only the settle sheet writes that category. */
const categoriesOf = (type: RecordType) =>
  readCategoryList(type).filter(category => category !== SETTLEMENT_CATEGORY)

interface SharedAddSheetProps {
  shared: SharedRecords
  initialType?: RecordType
  onClose: () => void
}

/**
 * «ثبت هزینه» inside the shared account: amount, title, the shared account's categories, who paid
 * (default: me) and for whom (نصف‌نصف / فقط من / فقط X) with each person's share, and the date.
 * An income has no payer or split: it only shows in the shared account's reports.
 */
export default function SharedAddSheet({
  shared,
  initialType = 'expense',
  onClose
}: SharedAddSheetProps) {
  // Members only: a removed partner stays in the balance but cannot pay or bear a new expense.
  const people = shared.activePair ?? [shared.me]
  const [type, setType] = useState<RecordType>(initialType)
  const [amount, setAmount] = useState<number | ''>('')
  const [title, setTitle] = useState('')
  const [categories, setCategories] = useState(() => categoriesOf(initialType))
  const [category, setCategory] = useState('')
  const [payer, setPayer] = useState(people.includes(shared.me) ? shared.me : people[0])
  const [split, setSplit] = useState<SharedSplit>('equal')
  const [date, setDate] = useState(getTodayIso())
  const [saving, setSaving] = useState(false)
  // The first «ثبت» shows what is missing; the hint then follows the fields as they fill.
  const [tried, setTried] = useState(false)

  const expense = type === 'expense'
  const value = Number(amount) || 0
  const problem = !(value > 0) ? 'مبلغ را وارد کنید' : !category ? 'دسته را انتخاب کنید' : ''
  const error = tried ? problem : ''

  const changeType = (next: RecordType) => {
    setType(next)
    setCategories(categoriesOf(next))
    setCategory('')
  }

  const submit = async () => {
    setTried(true)
    if (problem) return

    setSaving(true)

    const values: Record<string, string | number> = {
      date,
      title: title.trim(),
      category,
      amount: value,
      [SHARED_CREATOR_FIELD_ID]: shared.me,
      ...(expense
        ? {
            [SHARED_PAYER_FIELD_ID]: payer,
            [SHARED_SPLIT_FIELD_ID]: effectiveSplit(split, people, shared.me)
          }
        : {})
    }

    const saved = await shared.add(type, values)

    setSaving(false)
    if (saved) onClose()
  }

  return (
    <FormModal
      open
      title={expense ? 'ثبت هزینه' : 'ثبت درآمد'}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        return submit()
      }}
      saving={saving}
      saveLabel="ثبت"
      saveButtonVariant={expense ? 'outflow' : 'inflow'}
      saveHint={error || undefined}
    >
      <div className={formFieldClass}>
        <span className={formLabelClass} aria-hidden="true">
          نوع ثبت
        </span>
        <SegmentedRadio label="نوع ثبت" options={TYPE_OPTIONS} value={type} onChange={changeType} />
      </div>
      <FormField label="مبلغ (تومان)" required controlWidth="full">
        <AmountField
          label="مبلغ"
          value={amount}
          onChange={setAmount}
          invalid={tried && !(value > 0)}
        />
      </FormField>
      <FormField label="عنوان" controlWidth="full">
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="مثلاً میوه و سبزی"
          autoComplete="off"
        />
      </FormField>
      <FormField label="دسته" required controlWidth="full">
        <CategorySelect
          value={category}
          onChange={setCategory}
          categories={categories}
          onCategoriesChange={next => {
            setCategories(next.filter(item => item !== SETTLEMENT_CATEGORY))
            if (category && !next.includes(category)) setCategory('')
          }}
          formId={shared.forms.find(form => form.type === type)?.id}
          categoryScope={type}
          lockedCategories={lockedCategoriesFor(type)}
          allowManage={can('budget')}
          invalid={tried && !category}
          aria-label={expense ? 'دسته هزینه' : 'دسته درآمد'}
        />
      </FormField>
      {expense ? (
        <SharedSplitFields
          people={people}
          me={shared.me}
          nameOf={shared.nameOf}
          former={!!shared.pair}
          amount={value}
          payer={payer}
          split={split}
          onPayer={setPayer}
          onSplit={setSplit}
        />
      ) : (
        <p className={alertClassName('info', sharedAlertClass)}>
          درآمد فقط در گزارش‌های حساب مشترک می‌آید و روی تراز اثری ندارد.
        </p>
      )}
      <FormField label="تاریخ" controlWidth="full">
        <JalaliDatePicker value={date} onChange={setDate} />
      </FormField>
    </FormModal>
  )
}
