import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { getInstallmentEndDate, getPaidUntilFromPlan } from '../../services/installments'
import {
  formFieldError,
  requiredDate,
  requiredField,
  requiredPositiveAmount,
  requiredPositiveInteger,
  submitValidatedForm
} from '../../utils/formValidation'
import { formatIsoDatePersian, getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField, FormRow } from '../form'
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

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<InstallmentFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
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
    submitValidatedForm(handleSubmit, values => onSubmit(values, computedEndDate), event)
  }

  const paidUntilField = (
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
      {paidUntil ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          onClick={() => setValue('paidUntil', '')}
        >
          پاک کردن
        </Button>
      ) : null}
    </FormField>
  )

  return (
    <FormModal
      open={open}
      title={editingPlan ? 'ویرایش قسط' : 'ثبت قسط جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingPlan ? 'ذخیره تغییرات' : 'ذخیره قسط'}
    >
      <FormField
        label="عنوان قسط"
        required
        controlWidth="full"
        error={formFieldError(errors, 'title')}
      >
        <input
          type="text"
          {...register('title', requiredField('عنوان قسط'))}
          placeholder="مثلاً: وام بانکی"
        />
      </FormField>

      <FormRow>
        <Controller
          name="amount"
          control={control}
          rules={requiredPositiveAmount('مبلغ قسط را وارد کنید')}
          render={({ field, fieldState }) => (
            <FormField label="مبلغ قسط" required error={fieldState.error?.message}>
              <AmountInput
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <FormField label="تعداد بازپرداخت" required error={formFieldError(errors, 'count')}>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            {...register('count', requiredPositiveInteger('تعداد بازپرداخت', 1))}
            dir="ltr"
          />
        </FormField>
      </FormRow>

      <FormRow>
        <Controller
          name="startDate"
          control={control}
          rules={requiredDate('تاریخ شروع قسط')}
          render={({ field, fieldState }) => (
            <FormField label="تاریخ شروع قسط" required error={fieldState.error?.message}>
              <JalaliDatePicker
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <FormField
          label="موعد قسط در ماه"
          required
          hint="روز پرداخت هر قسط در ماه (مثلاً ۵ برای پنجم هر ماه)"
          error={formFieldError(errors, 'dueDay')}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={31}
            {...register('dueDay', requiredPositiveInteger('موعد قسط', 1, 31))}
            dir="ltr"
            placeholder="۱ تا ۳۱"
          />
        </FormField>
      </FormRow>

      {computedEndDate ? (
        <FormRow>
          <FormField
            label="تاریخ پایان قسط"
            hint="بر اساس تاریخ شروع، تعداد بازپرداخت و موعد ماهانه محاسبه می‌شود"
          >
            <div className={formReadonlyValueClass}>{formatIsoDatePersian(computedEndDate)}</div>
          </FormField>
          {paidUntilField}
        </FormRow>
      ) : (
        paidUntilField
      )}

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('note')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
