import { useEffect, useRef, useState } from 'react'

import PickerSheet from './form/PickerSheet'
import DateTimeWheelFields from './JalaliDateTimeWheelFields'
import Button from './ui/Button'
import {
  jalaliDatePickerPreviewClass,
  jalaliDatePickerTodayBtnClass,
  jalaliDatePickerTriggerClass,
  jalaliDatePickerWrapClass,
  jalaliDateTimePickerFieldLabelClass,
  pickerQuickActionsClass,
  pickerSheetFooterClass
} from './ui/datePickerStyles'
import { cn } from '../utils/cn'
import type { CalendarSystem } from '../utils/dateConverter'
import {
  clampDateTimeToMin,
  formatDateTimePersian,
  getNowDateTimeIso,
  normalizeDateTimeIso
} from '../utils/datetime'
import { formActionsClassName } from './ui/formStyles'
import { formModalActionsClass } from './ui/modalStyles'

interface JalaliDateTimePickerProps {
  value: string
  onChange: (iso: string) => void
  calendar?: CalendarSystem
  minDateTime?: string
  label?: string
  openRequestToken?: number
}

export default function JalaliDateTimePicker({
  value,
  onChange,
  calendar = 'shamsi',
  minDateTime,
  label,
  openRequestToken = 0
}: JalaliDateTimePickerProps) {
  const iso = value || getNowDateTimeIso()
  const [editing, setEditing] = useState(false)
  const [pendingValue, setPendingValue] = useState(iso)
  const lastOpenRequestTokenRef = useRef(0)

  useEffect(() => {
    if (editing) {
      setPendingValue(iso)
    }
  }, [editing, iso, calendar])

  useEffect(() => {
    if (!minDateTime || !editing) return
    setPendingValue(current => clampDateTimeToMin(current, minDateTime))
  }, [minDateTime, editing])

  useEffect(() => {
    if (!openRequestToken || openRequestToken === lastOpenRequestTokenRef.current) return
    lastOpenRequestTokenRef.current = openRequestToken

    const nextValue = minDateTime ? clampDateTimeToMin(iso, minDateTime) : iso

    setPendingValue(nextValue)
    setEditing(true)
  }, [openRequestToken, iso, minDateTime])

  const handleOpen = () => {
    setPendingValue(minDateTime ? clampDateTimeToMin(iso, minDateTime) : iso)
    setEditing(true)
  }

  const handleClose = () => {
    setEditing(false)
  }

  const handleConfirm = () => {
    const next = minDateTime ? clampDateTimeToMin(pendingValue, minDateTime) : pendingValue
    const currentValue = value ? normalizeDateTimeIso(value) : ''
    const nextValue = normalizeDateTimeIso(next)

    if (nextValue !== currentValue) {
      onChange(next)
    }
    setEditing(false)
  }

  const triggerLabel = value ? formatDateTimePersian(value) : 'انتخاب تاریخ و ساعت'

  const previewLabel = formatDateTimePersian(pendingValue)

  const handleToday = () => {
    const now = getNowDateTimeIso()
    setPendingValue(minDateTime ? clampDateTimeToMin(now, minDateTime) : now)
  }

  return (
    <div className={jalaliDatePickerWrapClass}>
      {label && <span className={jalaliDateTimePickerFieldLabelClass}>{label}</span>}
      <button
        type="button"
        className={jalaliDatePickerTriggerClass({
          active: editing,
          empty: !value
        })}
        onClick={handleOpen}
        aria-expanded={editing}
        aria-haspopup="dialog"
      >
        {triggerLabel}
      </button>

      <PickerSheet
        open={editing}
        title="انتخاب تاریخ و ساعت"
        onClose={handleClose}
        subtitle={
          <p className={jalaliDatePickerPreviewClass} aria-live="polite">
            {previewLabel}
          </p>
        }
        footer={
          <div
            className={cn(formModalActionsClass, formActionsClassName(), pickerSheetFooterClass)}
          >
            <Button type="button" variant="secondary" onClick={handleClose}>
              انصراف
            </Button>
            <Button type="button" variant="primary" onClick={handleConfirm}>
              تایید
            </Button>
          </div>
        }
      >
        <div className={pickerQuickActionsClass}>
          <button type="button" className={jalaliDatePickerTodayBtnClass} onClick={handleToday}>
            همین الان
          </button>
        </div>
        <DateTimeWheelFields
          calendar={calendar}
          value={pendingValue}
          onChange={setPendingValue}
          minDateTime={minDateTime}
          layout="sheet"
        />
      </PickerSheet>
    </div>
  )
}
