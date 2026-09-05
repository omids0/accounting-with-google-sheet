import { useEffect, useRef, useState } from 'react'

import DateTimeWheelFields from './JalaliDateTimeWheelFields'
import Button from './ui/Button'
import {
  jalaliDatePickerActionsClass,
  jalaliDatePickerPanelClass,
  jalaliDatePickerTriggerClass,
  jalaliDatePickerWrapClass,
  jalaliDateTimePickerFieldLabelClass
} from './ui/datePickerStyles'
import { cn } from '../utils/cn'
import type { CalendarSystem } from '../utils/dateConverter'
import {
  clampDateTimeToMin,
  formatDateTimePersian,
  getNowDateTimeIso,
  normalizeDateTimeIso
} from '../utils/datetime'

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

  const handleToggle = () => {
    setEditing(open => {
      if (!open) {
        setPendingValue(minDateTime ? clampDateTimeToMin(iso, minDateTime) : iso)
      }

      return !open
    })
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

  return (
    <div className={jalaliDatePickerWrapClass}>
      {label && <span className={jalaliDateTimePickerFieldLabelClass}>{label}</span>}
      <button
        type="button"
        className={jalaliDatePickerTriggerClass({
          active: editing,
          empty: !value
        })}
        onClick={handleToggle}
        aria-expanded={editing}
      >
        {triggerLabel}
      </button>

      {editing && (
        <div className={cn(jalaliDatePickerPanelClass, 'jalali-datetime-picker-panel')}>
          <DateTimeWheelFields
            calendar={calendar}
            value={pendingValue}
            onChange={setPendingValue}
            minDateTime={minDateTime}
          />
          <div className={cn('records-filter-actions', jalaliDatePickerActionsClass)}>
            <Button type="button" variant="primary" size="sm" onClick={handleConfirm}>
              تایید
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
