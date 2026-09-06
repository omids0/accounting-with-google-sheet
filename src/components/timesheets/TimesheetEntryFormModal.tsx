import { useMemo, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import { useModalFormReset } from '../../hooks/useModalFormReset'
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

  const { handleSubmit, reset, setValue, watch, getValues } = useForm<TimesheetEntryFormValues>({
    defaultValues: initialValues
  })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const [endPickerOpenToken, setEndPickerOpenToken] = useState(0)

  const startAt = watch('startAt')
  const endAt = watch('endAt')

  const durationMinutes = useMemo(() => calcDurationMinutes(startAt, endAt), [startAt, endAt])

  const handleStartChange = (nextStartAt: string) => {
    const prev = getValues()

    setValue('startAt', nextStartAt)
    setValue('endAt', syncEndDateTimeFromStart(nextStartAt, prev.endAt, prev.startAt))
    setEndPickerOpenToken(token => token + 1)
  }

  const handleEndChange = (nextEndAt: string) => {
    setValue('endAt', clampDateTimeToMin(nextEndAt, getValues('startAt')))
  }

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    void handleSubmit(values => onSubmit(values, durationMinutes))(event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش رکورد' : 'رکورد جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره' : 'ثبت'}
    >
      <TimesheetEntryForm
        form={watch()}
        durationMinutes={durationMinutes}
        endPickerOpenToken={endPickerOpenToken}
        onFormChange={patch => {
          ;(Object.entries(patch) as [keyof TimesheetEntryFormValues, string][]).forEach(
            ([key, value]) => setValue(key, value)
          )
        }}
        onStartChange={handleStartChange}
        onEndChange={handleEndChange}
      />
    </FormModal>
  )
}
