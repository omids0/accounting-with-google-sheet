import { useEffect, useState, type ReactNode } from 'react'

import WheelPicker from './form/WheelPicker'
import Button from './ui/Button'
import {
  recordsFilterActionsClass,
  recordsFilterLabelClass,
  recordsFilterSectionClassName,
  yearFilterPanelClass,
  yearFilterTriggerClass
} from './ui/recordsStyles'
import { formatJalaliYear } from '../utils/dateRange'
import { getJalaliParts } from '../utils/jalaliDate'

export function getDefaultChartYear(): number {
  return getJalaliParts(new Date()).year
}

type YearFilterParts = {
  trigger: ReactNode
  panel: ReactNode
}

export default function YearFilter({
  year,
  onChange,
  loading,
  children
}: {
  year: number
  onChange: (year: number) => void
  loading?: boolean
  children?: (parts: YearFilterParts) => ReactNode
}) {
  const currentYear = getDefaultChartYear()

  const [editing, setEditing] = useState(false)

  const [pendingYear, setPendingYear] = useState(String(year))

  const wheelYears = Array.from({ length: 21 }, (_, index) => currentYear - 10 + index)

  useEffect(() => {
    if (editing) {
      setPendingYear(String(year))
    }
  }, [editing, year])

  const handleToggle = () => {
    setEditing(open => {
      if (!open) {
        setPendingYear(String(year))
      }

      return !open
    })
  }

  const handleConfirm = () => {
    const nextYear = Number(pendingYear)

    if (!nextYear) return
    setEditing(false)
    onChange(nextYear)
  }

  const hasPendingChanges = Number(pendingYear) !== year

  const trigger = (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className={yearFilterTriggerClass(editing)}
      onClick={handleToggle}
    >
      {formatJalaliYear(year)}
    </Button>
  )

  const panel = editing ? (
    <div className={yearFilterPanelClass}>
      <div className={recordsFilterSectionClassName(true)}>
        <span className={recordsFilterLabelClass}>انتخاب سال</span>
        <WheelPicker
          aria-label="انتخاب سال"
          value={pendingYear}
          onChange={setPendingYear}
          items={wheelYears.map(nextYear => ({
            value: String(nextYear),
            label: formatJalaliYear(nextYear)
          }))}
        />
      </div>
      <div className={recordsFilterActionsClass}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={handleConfirm}
          disabled={loading || !hasPendingChanges}
        >
          تایید سال
        </Button>
      </div>
    </div>
  ) : null

  if (children) {
    return <>{children({ trigger, panel })}</>
  }

  return (
    <>
      {trigger}
      {panel}
    </>
  )
}
