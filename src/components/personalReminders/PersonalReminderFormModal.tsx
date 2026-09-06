import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
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

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش یادآوری' : 'یادآوری جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره یادآوری'}
    >
      <FormField label="عنوان" required hint="مثلاً بیمه شخص ثالث پژو ۲۰۶">
        <input
          type="text"
          value={form.values.title}
          onChange={e => form.setField('title', e.target.value)}
          placeholder="عنوان یادآوری"
          required
        />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={form.values.category}
          onChange={category => form.setField('category', category)}
          categories={categories}
          categoryScope="personalReminder"
          onCategoriesChange={next => {
            onCategoriesChange(next)
            if (!next.includes(form.values.category)) {
              form.setField('category', next[0] ?? '')
            }
          }}
          aria-label="دسته‌بندی یادآوری"
        />
      </FormField>

      <FormField label="تاریخ موعد" required>
        <JalaliDatePicker
          value={form.values.dueDate}
          onChange={date => form.setField('dueDate', date)}
        />
      </FormField>

      <FormSelect
        label="تکرار"
        value={form.values.recurrence}
        onChange={value =>
          form.setField('recurrence', value as PersonalReminderFormState['recurrence'])
        }
        options={PERSONAL_REMINDER_RECURRENCE_OPTIONS.map(item => ({
          value: item.value,
          label: item.label
        }))}
      />

      <FormField label="مبلغ (اختیاری)">
        <AmountInput
          value={form.values.amount}
          onChange={value => form.setField('amount', value)}
        />
      </FormField>

      <FormSelect
        label="چند روز قبل یادآوری شود؟"
        value={String(form.values.daysBefore)}
        onChange={value => form.setField('daysBefore', Number(value))}
        options={DAYS_BEFORE_OPTIONS}
      />

      <label
        className="checkbox-row"
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <input
          type="checkbox"
          checked={form.values.enabled}
          onChange={e => form.setField('enabled', e.target.checked)}
        />
        <span>فعال</span>
      </label>
    </FormModal>
  )
}
