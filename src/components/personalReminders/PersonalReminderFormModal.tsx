import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { PERSONAL_REMINDER_RECURRENCE_OPTIONS } from '../../types/personalReminders'
import {
  formFieldError,
  requiredDate,
  requiredField,
  submitValidatedForm
} from '../../utils/formValidation'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { CategorySelect, FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { PersonalReminderFormState, PersonalReminderWithRow } from './types'
import { DAYS_BEFORE_OPTIONS } from '../reminders/reminderConstants'

type PersonalReminderFormModalProps = {
  open: boolean
  editingItem: PersonalReminderWithRow | null
  saving: boolean
  categories: string[]
  onClose: () => void
  onSubmit: (values: PersonalReminderFormState) => void | Promise<void>
  onCategoriesChange: (categories: string[]) => void
}

export default function PersonalReminderFormModal({
  open,
  editingItem,
  saving,
  categories,
  onClose,
  onSubmit,
  onCategoriesChange
}: PersonalReminderFormModalProps) {
  const initialValues = useMemo<PersonalReminderFormState>(
    () =>
      editingItem
        ? {
            title: editingItem.title,
            category: editingItem.category,
            dueDate: editingItem.dueDate,
            recurrence: editingItem.recurrence,
            amount: editingItem.amount,
            daysBefore: editingItem.daysBefore,
            enabled: editingItem.enabled
          }
        : {
            title: '',
            category: categories[0] ?? '',
            dueDate: getTodayIso(),
            recurrence: 'yearly',
            amount: '',
            daysBefore: 3,
            enabled: true
          },
    [categories, editingItem]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<PersonalReminderFormState>({
    defaultValues: initialValues,
    mode: 'onSubmit'
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const category = watch('category')

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش یادآوری' : 'یادآوری جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره یادآوری'}
    >
      <FormField
        label="عنوان"
        required
        hint="مثلاً بیمه شخص ثالث پژو ۲۰۶"
        controlWidth="full"
        error={formFieldError(errors, 'title')}
      >
        <input
          type="text"
          {...register('title', requiredField('عنوان'))}
          placeholder="عنوان یادآوری"
        />
      </FormField>

      <Controller
        name="category"
        control={control}
        rules={requiredField('دسته‌بندی')}
        render={({ field, fieldState }) => (
          <FormField
            label="دسته‌بندی"
            required
            controlWidth="full"
            error={fieldState.error?.message}
          >
            <CategorySelect
              value={field.value}
              onChange={value => {
                field.onChange(value)
                setValue('category', value, { shouldValidate: true })
              }}
              categories={categories}
              categoryScope="personalReminder"
              onCategoriesChange={next => {
                onCategoriesChange(next)
                if (!next.includes(category)) {
                  setValue('category', next[0] ?? '', { shouldValidate: true })
                }
              }}
              aria-label="دسته‌بندی یادآوری"
              invalid={Boolean(fieldState.error)}
            />
          </FormField>
        )}
      />

      <FormRow>
        <Controller
          name="dueDate"
          control={control}
          rules={requiredDate('تاریخ موعد')}
          render={({ field, fieldState }) => (
            <FormField label="تاریخ موعد" required error={fieldState.error?.message}>
              <JalaliDatePicker
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(fieldState.error)}
              />
            </FormField>
          )}
        />

        <FormSelect
          label="تکرار"
          controlWidth="full"
          value={watch('recurrence')}
          onChange={value =>
            setValue('recurrence', value as PersonalReminderFormState['recurrence'])
          }
          options={PERSONAL_REMINDER_RECURRENCE_OPTIONS.map(item => ({
            value: item.value,
            label: item.label
          }))}
        />
      </FormRow>

      <FormRow>
        <FormField label="مبلغ (اختیاری)">
          <AmountInput value={watch('amount')} onChange={value => setValue('amount', value)} />
        </FormField>

        <FormSelect
          label="چند روز قبل یادآوری شود؟"
          controlWidth="full"
          value={String(watch('daysBefore'))}
          onChange={value => setValue('daysBefore', Number(value))}
          options={DAYS_BEFORE_OPTIONS}
        />
      </FormRow>

      <label className="checkbox-row flex items-center gap-2">
        <input type="checkbox" {...register('enabled')} />
        <span>فعال</span>
      </label>
    </FormModal>
  )
}
