import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import { getInstallmentEndDate, getPaidUntilFromPlan } from '../../services/installments'
import { formatIsoDatePersian, getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { InstallmentFormState, PlanWithRow } from './types'
import Button from '../ui/Button'
import {
  formFieldLabelTextClass,
  formGroupClass,
  formReadonlyValueClass
} from '../ui/formControlStyles'
import { formHintClass } from '../ui/formStyles'

type InstallmentFormModalProps = {
  open: boolean
  editingPlan: PlanWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: InstallmentFormState, computedEndDate: string) => void | Promise<void>
}

export default function InstallmentFormModal({
  open,
  editingPlan,
  saving,
  onClose,
  onSubmit
}: InstallmentFormModalProps) {
  const initialValues = useMemo<InstallmentFormState>(() => {
    if (editingPlan) {
      return {
        title: editingPlan.title,
        amount: editingPlan.amount,
        count: editingPlan.count,
        dueDay: editingPlan.dueDay,
        startDate: editingPlan.startDate || getTodayIso(),
        paidUntil: getPaidUntilFromPlan(editingPlan),
        note: editingPlan.note
      }
    }

    return {
      title: '',
      amount: '',
      count: '',
      dueDay: '',
      startDate: getTodayIso(),
      paidUntil: '',
      note: ''
    }
  }, [editingPlan])

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingPlan?.id ?? 'create'
  })

  const computedEndDate = useMemo(() => {
    const count = Number(form.values.count)
    const dueDay = Number(form.values.dueDay)

    if (!form.values.startDate || !count || count < 1 || !dueDay) return ''

    return getInstallmentEndDate(form.values.startDate, count, dueDay)
  }, [form.values.startDate, form.values.count, form.values.dueDay])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values, computedEndDate)
  }

  return (
    <FormModal
      open={open}
      title={editingPlan ? 'ویرایش قسط' : 'ثبت قسط جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingPlan ? 'ذخیره تغییرات' : 'ذخیره قسط'}
    >
      <FormField label="عنوان قسط" required>
        <input
          type="text"
          value={form.values.title}
          onChange={e => form.setField('title', e.target.value)}
          placeholder="مثلاً: وام بانکی"
        />
      </FormField>

      <FormField label="مبلغ قسط" required>
        <AmountInput value={form.values.amount} onChange={val => form.setField('amount', val)} />
      </FormField>

      <FormField label="تعداد بازپرداخت" required>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={form.values.count === '' ? '' : form.values.count}
          onChange={e =>
            form.setField('count', e.target.value === '' ? '' : Number(e.target.value))
          }
          dir="ltr"
        />
      </FormField>

      <FormField label="تاریخ شروع قسط" required>
        <JalaliDatePicker
          value={form.values.startDate}
          onChange={date => form.setField('startDate', date)}
        />
      </FormField>

      <FormField
        label="موعد قسط در ماه"
        required
        hint="روز پرداخت هر قسط در ماه (مثلاً ۵ برای پنجم هر ماه)"
      >
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={form.values.dueDay === '' ? '' : form.values.dueDay}
          onChange={e =>
            form.setField('dueDay', e.target.value === '' ? '' : Number(e.target.value))
          }
          dir="ltr"
          placeholder="۱ تا ۳۱"
        />
      </FormField>

      {computedEndDate ? (
        <div className={formGroupClass}>
          <span className={formFieldLabelTextClass}>تاریخ پایان قسط</span>
          <div className={formReadonlyValueClass}>{formatIsoDatePersian(computedEndDate)}</div>
          <p className={formHintClass}>
            بر اساس تاریخ شروع، تعداد بازپرداخت و موعد ماهانه محاسبه می‌شود
          </p>
        </div>
      ) : null}

      <FormField
        label="پرداخت‌شده تا تاریخ"
        hint="اقساطی که موعد آن‌ها تا این تاریخ است به‌عنوان پرداخت‌شده ثبت می‌شوند"
      >
        <JalaliDatePicker
          value={form.values.paidUntil}
          onChange={date => form.setField('paidUntil', date)}
          allowEmpty
          emptyLabel="هنوز پرداختی ثبت نشده"
        />
      </FormField>
      {form.values.paidUntil ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => form.setField('paidUntil', '')}
        >
          پاک کردن
        </Button>
      ) : null}

      <FormField label="توضیحات">
        <textarea
          value={form.values.note}
          onChange={e => form.setField('note', e.target.value)}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
