import { useMemo, useState, type FormEvent } from 'react'

import { useForm } from '../../hooks/useForm'
import {
  addMinutesToDateTime,
  calcDurationMinutes,
  clampDateTimeToMin,
  getNowDateTimeIso,
  syncEndDateTimeFromStart
} from '../../utils/datetime'
import FormModal from '../FormModal'
import TimesheetEntryForm from './TimesheetEntryForm'
import type { TimesheetEntryWithRow } from './useTimesheetDetailPage'

export type TimesheetEntryFormValues = {
  title: string
  startAt: string
  endAt: string
  description: string
}

type TimesheetEntryFormModalProps = {
  open: boolean
  editingItem: TimesheetEntryWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: TimesheetEntryFormValues, durationMinutes: number) => void | Promise<void>
}

export default function TimesheetEntryFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: TimesheetEntryFormModalProps) {
  const initialValues = useMemo<TimesheetEntryFormValues>(() => {
    if (editingItem) {
      return {
        title: editingItem.title,
        startAt: editingItem.startAt,
        endAt: editingItem.endAt,
        description: editingItem.description
      }
    }

    const now = getNowDateTimeIso()

    return {
      title: '',
      startAt: now,
      endAt: addMinutesToDateTime(now, 60),
      description: ''
    }
  }, [editingItem])

  const form = useForm(initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const [endPickerOpenToken, setEndPickerOpenToken] = useState(0)

  const durationMinutes = useMemo(
    () => calcDurationMinutes(form.values.startAt, form.values.endAt),
    [form.values.startAt, form.values.endAt]
  )

  const handleStartChange = (startAt: string) => {
    form.update(prev => ({
      ...prev,
      startAt,
      endAt: syncEndDateTimeFromStart(startAt, prev.endAt, prev.startAt)
    }))
    setEndPickerOpenToken(token => token + 1)
  }

  const handleEndChange = (endAt: string) => {
    form.update(prev => ({
      ...prev,
      endAt: clampDateTimeToMin(endAt, prev.startAt)
    }))
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    void onSubmit(form.values, durationMinutes)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش رکورد' : 'رکورد جدید'}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره' : 'ثبت'}
    >
      <TimesheetEntryForm
        form={form.values}
        durationMinutes={durationMinutes}
        endPickerOpenToken={endPickerOpenToken}
        onFormChange={patch => form.setFields(patch)}
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
      />
    </FormModal>
  )
}
