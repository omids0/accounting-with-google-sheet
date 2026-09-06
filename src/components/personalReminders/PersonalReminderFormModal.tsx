import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
import { PERSONAL_REMINDER_RECURRENCE_OPTIONS } from '../../types/personalReminders'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { CategorySelect, FormField, FormSelect } from '../form'
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

  const { register, handleSubmit, reset, setValue, watch } = useForm<PersonalReminderFormState>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const category = watch('category')

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values))(event)
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
      <FormField label="عنوان" required hint="مثلاً بیمه شخص ثالث پژو ۲۰۶">
        <input type="text" {...register('title')} placeholder="عنوان یادآوری" required />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={category}
          onChange={value => setValue('category', value)}
          categories={categories}
          categoryScope="personalReminder"
          onCategoriesChange={next => {
            onCategoriesChange(next)
            if (!next.includes(category)) {
              setValue('category', next[0] ?? '')
            }
          }}
          aria-label="دسته‌بندی یادآوری"
        />
      </FormField>

      <FormField label="تاریخ موعد" required>
        <JalaliDatePicker value={watch('dueDate')} onChange={date => setValue('dueDate', date)} />
      </FormField>

      <FormSelect
        label="تکرار"
        value={watch('recurrence')}
        onChange={value => setValue('recurrence', value as PersonalReminderFormState['recurrence'])}
        options={PERSONAL_REMINDER_RECURRENCE_OPTIONS.map(item => ({
          value: item.value,
          label: item.label
        }))}
      />

      <FormField label="مبلغ (اختیاری)">
        <AmountInput value={watch('amount')} onChange={value => setValue('amount', value)} />
      </FormField>

      <FormSelect
        label="چند روز قبل یادآوری شود؟"
        value={String(watch('daysBefore'))}
        onChange={value => setValue('daysBefore', Number(value))}
        options={DAYS_BEFORE_OPTIONS}
      />

      <label
        className="checkbox-row"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <input type="checkbox" {...register('enabled')} />
        <span>فعال</span>
      </label>
    </FormModal>
  )
}
