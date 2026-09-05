import { useMemo, useState } from 'react'

import { FormField, FormSelect } from './form'
import JalaliDatePicker from './JalaliDatePicker'
import {
  dateCalculatorConversionItemClass,
  dateCalculatorConversionLabelClass,
  dateCalculatorConversionListClass,
  dateCalculatorConversionNumericClass,
  dateCalculatorConversionValueClass,
  dateCalculatorConversionWordsClass,
  dateCalculatorConversionsCardClass,
  dateCalculatorConversionsHeadClass,
  dateCalculatorFormCardClass,
  dateCalculatorPageClass
} from './ui/calculatorStyles'
import Card, { CardTitle } from './ui/Card'
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
    <div className={dateCalculatorPageClass}>
      <Card className={dateCalculatorFormCardClass}>
        <CardTitle className="mb-[0.6rem] text-[0.95rem]">محاسبه تاریخ</CardTitle>

        <FormSelect
          label="نوع تاریخ ورودی"
          value={inputCalendar}
          onChange={value => setInputCalendar(value as CalendarSystem)}
          options={INPUT_CALENDAR_OPTIONS}
          aria-label="نوع تاریخ ورودی"
        />

        <FormField label="تاریخ" className="mb-0">
          <JalaliDatePicker
            key={inputCalendar}
            calendar={inputCalendar}
            value={isoDate}
            onChange={setIsoDate}
          />
        </FormField>
      </Card>

      <Card className={dateCalculatorConversionsCardClass}>
        <div className={dateCalculatorConversionsHeadClass}>معادل در سایر تقویم‌ها</div>
        <ul className={dateCalculatorConversionListClass}>
          {resultCalendars.map(calendar => {
            const display = getCalendarConversionDisplay(isoDate, calendar)

            return (
              <li key={calendar} className={dateCalculatorConversionItemClass}>
                <span className={dateCalculatorConversionLabelClass}>
                  {CALENDAR_SHORT_LABELS[calendar]}
                </span>
                <div className={dateCalculatorConversionValueClass}>
                  <span className={dateCalculatorConversionNumericClass} dir="ltr">
                    {display.numeric}
                  </span>
                  <span className={dateCalculatorConversionWordsClass}>{display.words}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
