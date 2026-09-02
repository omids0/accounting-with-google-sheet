import { useMemo, useState } from 'react'

import { FormField, FormSelect } from './form'
import JalaliDatePicker from './JalaliDatePicker'
import {
  CALENDAR_SHORT_LABELS,
  CALENDAR_SYSTEM_OPTIONS,
  getCalendarConversionDisplay,
  type CalendarSystem
} from '../utils/dateConverter'
import { getTodayIso } from '../utils/jalaliDate'

const INPUT_CALENDAR_OPTIONS = CALENDAR_SYSTEM_OPTIONS.map(option => ({
  value: option.value,
  label: option.label
}))

const ALL_CALENDARS: CalendarSystem[] = ['shamsi', 'miladi', 'hijri']

export default function DateCalculatorPage() {
  const [inputCalendar, setInputCalendar] = useState<CalendarSystem>('shamsi')

  const [isoDate, setIsoDate] = useState(getTodayIso)

  const resultCalendars = useMemo(
    () => ALL_CALENDARS.filter(calendar => calendar !== inputCalendar),
    [inputCalendar]
  )

  return (
    <div className="date-calculator-page">
      <div className="card date-calculator-form-card">
        <h3 className="card-title">محاسبه تاریخ</h3>

        <FormSelect
          label="نوع تاریخ ورودی"
          value={inputCalendar}
          onChange={value => setInputCalendar(value as CalendarSystem)}
          options={INPUT_CALENDAR_OPTIONS}
          aria-label="نوع تاریخ ورودی"
        />

        <FormField label="تاریخ">
          <JalaliDatePicker
            key={inputCalendar}
            calendar={inputCalendar}
            value={isoDate}
            onChange={setIsoDate}
          />
        </FormField>
      </div>

      <div className="card date-calculator-conversions-card">
        <div className="date-calculator-conversions-head">معادل در سایر تقویم‌ها</div>
        <ul className="date-calculator-conversion-list">
          {resultCalendars.map(calendar => {
            const display = getCalendarConversionDisplay(isoDate, calendar)

            return (
              <li key={calendar} className="date-calculator-conversion-item">
                <span className="date-calculator-conversion-label">
                  {CALENDAR_SHORT_LABELS[calendar]}
                </span>
                <div className="date-calculator-conversion-value">
                  <span className="date-calculator-conversion-numeric" dir="ltr">
                    {display.numeric}
                  </span>
                  <span className="date-calculator-conversion-words">{display.words}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
