import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { getInstallmentEndDate, getPaidUntilFromPlan } from '../../services/installments'
import { formatIsoDatePersian, getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { InstallmentFormState, PlanWithRow } from './types'
import Button from '../ui/Button'
import { formReadonlyValueClass } from '../ui/formControlStyles'

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

  const { register, handleSubmit, reset, setValue, watch } = useForm<InstallmentFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingPlan?.id ?? 'create'
  })

  const startDate = watch('startDate')
  const count = watch('count')
  const dueDay = watch('dueDay')
  const paidUntil = watch('paidUntil')

  const computedEndDate = useMemo(() => {
    const countNumber = Number(count)
    const dueDayNumber = Number(dueDay)

    if (!startDate || !countNumber || countNumber < 1 || !dueDayNumber) return ''

    return getInstallmentEndDate(startDate, countNumber, dueDayNumber)
  }, [startDate, count, dueDay])

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values, computedEndDate))(event)
  }

  return (
    <FormModal
      open={open}
      title={editingPlan ? 'ویرایش قسط' : 'ثبت قسط جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingPlan ? 'ذخیره تغییرات' : 'ذخیره قسط'}
    >
      <FormField label="عنوان قسط" required>
        <input type="text" {...register('title')} placeholder="مثلاً: وام بانکی" />
      </FormField>

      <FormField label="مبلغ قسط" required>
        <AmountInput value={watch('amount')} onChange={val => setValue('amount', val)} />
      </FormField>

      <FormField label="تعداد بازپرداخت" required>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={count === '' ? '' : count}
          onChange={e => setValue('count', e.target.value === '' ? '' : Number(e.target.value))}
          dir="ltr"
        />
      </FormField>

      <FormField label="تاریخ شروع قسط" required>
        <JalaliDatePicker value={startDate} onChange={date => setValue('startDate', date)} />
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
          value={dueDay === '' ? '' : dueDay}
          onChange={e => setValue('dueDay', e.target.value === '' ? '' : Number(e.target.value))}
          dir="ltr"
          placeholder="۱ تا ۳۱"
        />
      </FormField>

      {computedEndDate ? (
        <FormField
          label="تاریخ پایان قسط"
          hint="بر اساس تاریخ شروع، تعداد بازپرداخت و موعد ماهانه محاسبه می‌شود"
        >
          <div className={formReadonlyValueClass}>{formatIsoDatePersian(computedEndDate)}</div>
        </FormField>
      ) : null}

      <FormField
        label="پرداخت‌شده تا تاریخ"
        hint="اقساطی که موعد آن‌ها تا این تاریخ است به‌عنوان پرداخت‌شده ثبت می‌شوند"
      >
        <JalaliDatePicker
          value={paidUntil}
          onChange={date => setValue('paidUntil', date)}
          allowEmpty
          emptyLabel="هنوز پرداختی ثبت نشده"
        />
      </FormField>
      {paidUntil ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setValue('paidUntil', '')}
        >
          پاک کردن
        </Button>
      ) : null}

      <FormField label="توضیحات">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
