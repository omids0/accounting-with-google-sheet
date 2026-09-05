import { useEffect, useState } from 'react'

import CalendarWheelFields from './CalendarWheelFields'
import PickerSheet from './form/PickerSheet'
import Button from './ui/Button'
import {
  jalaliDatePickerPreviewClass,
  jalaliDatePickerTodayBtnClass,
  jalaliDatePickerTriggerClass,
  jalaliDatePickerWrapClass,
  jalaliDatePickerWrapInlineClass,
  pickerQuickActionsClass,
  pickerSheetFooterClass
} from './ui/datePickerStyles'
import { cn } from '../utils/cn'
import { formatCalendarDateCompact, type CalendarSystem } from '../utils/dateConverter'
import { formatIsoDatePersian, getTodayIso } from '../utils/jalaliDate'
import { formActionsClassName } from './ui/formStyles'
import { formModalActionsClass } from './ui/modalStyles'

interface JalaliDatePickerProps {
  value: string
  onChange: (iso: string) => void
  calendar?: CalendarSystem
  inline?: boolean
  allowEmpty?: boolean
  emptyLabel?: string
  id?: string
}

function formatPickerLabel(iso: string, calendar: CalendarSystem): string {
  if (calendar === 'shamsi') {
    return formatIsoDatePersian(iso)
  }

  return formatCalendarDateCompact(iso, calendar)
}

export default function JalaliDatePicker({
  value,
  onChange,
  calendar = 'shamsi',
  inline = false,
  allowEmpty = false,
  emptyLabel = 'انتخاب تاریخ',
  id
}: JalaliDatePickerProps) {
  const hasValue = Boolean(value)

  const iso = value || getTodayIso()

  const [editing, setEditing] = useState(false)

  const [pendingIso, setPendingIso] = useState(iso)

  useEffect(() => {
    if (editing) {
      setPendingIso(iso)
    }
  }, [editing, iso, calendar])

  const handleOpen = () => {
    setPendingIso(iso)
    setEditing(true)
  }

  const handleClose = () => {
    setEditing(false)
  }

  const handleConfirm = () => {
    onChange(pendingIso)
    setEditing(false)
  }

  if (inline) {
    return (
      <div className={cn(jalaliDatePickerWrapClass, jalaliDatePickerWrapInlineClass)}>
        <CalendarWheelFields
          calendar={calendar}
          iso={hasValue ? iso : getTodayIso()}
          onIsoChange={onChange}
        />
      </div>
    )
  }

  const hasPendingChanges = allowEmpty && !hasValue ? true : pendingIso !== iso

  const triggerLabel = allowEmpty && !hasValue ? emptyLabel : formatPickerLabel(iso, calendar)

  const previewLabel = formatPickerLabel(pendingIso, calendar)

  const todayIso = getTodayIso()

  return (
    <div className={jalaliDatePickerWrapClass}>
      <button
        id={id}
        type="button"
        className={jalaliDatePickerTriggerClass({
          active: editing,
          empty: allowEmpty && !hasValue
        })}
        onClick={handleOpen}
        aria-expanded={editing}
        aria-haspopup="dialog"
      >
        {triggerLabel}
      </button>

      <PickerSheet
        open={editing}
        title="انتخاب تاریخ"
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
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirm}
              disabled={!hasPendingChanges}
            >
              تایید تاریخ
            </Button>
          </div>
        }
      >
        <div className={pickerQuickActionsClass}>
          <button
            type="button"
            className={jalaliDatePickerTodayBtnClass}
            onClick={() => setPendingIso(todayIso)}
          >
            امروز
          </button>
        </div>
        <CalendarWheelFields calendar={calendar} iso={pendingIso} onIsoChange={setPendingIso} />
      </PickerSheet>
    </div>
  )
}
