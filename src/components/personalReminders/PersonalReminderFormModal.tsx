import { useMemo, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import {
  PERSONAL_REMINDER_CATEGORIES,
  PERSONAL_REMINDER_RECURRENCE_OPTIONS
} from '../../types/personalReminders'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { PersonalReminderFormState, PersonalReminderWithRow } from './types'
import { DAYS_BEFORE_OPTIONS } from '../reminders/reminderConstants'

type PersonalReminderFormModalProps = {
  open: boolean
  editingItem: PersonalReminderWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: PersonalReminderFormState) => void | Promise<void>
}

export default function PersonalReminderFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: PersonalReminderFormModalProps) {
  const initialValues = useMemo<PersonalReminderFormState>(
    () =>
      editingItem
        ? {
            category: editingItem.category,
            note: editingItem.note,
            dueDate: editingItem.dueDate,
            recurrence: editingItem.recurrence,
            amount: editingItem.amount,
            daysBefore: editingItem.daysBefore,
            enabled: editingItem.enabled
          }
        : {
            category: 'bill',
            note: '',
            dueDate: getTodayIso(),
            recurrence: 'yearly',
            amount: '',
            daysBefore: 3,
            enabled: true
          },
    [editingItem]
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
      <FormSelect
        label="دسته‌بندی"
        value={form.values.category}
        onChange={value =>
          form.setField('category', value as PersonalReminderFormState['category'])
        }
        options={PERSONAL_REMINDER_CATEGORIES.map(item => ({
          value: item.value,
          label: item.label
        }))}
      />

      <FormField label="یادداشت" required hint="مثلاً بیمه شخص ثالث پژو ۲۰۶">
        <input
          type="text"
          value={form.values.note}
          onChange={e => form.setField('note', e.target.value)}
          placeholder="توضیح مختصر"
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
