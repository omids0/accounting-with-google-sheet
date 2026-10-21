import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { countOf } from './journeyDraft'
import {
  defaultRanges,
  planQuickUnits,
  rangeEndOptions,
  setRangeEnd,
  type FloorRange
} from '../../services/buildingQuickUnits'
import { createUnitsWithOwners } from '../../services/buildingSetupActions'
import { getSettings } from '../../services/settings'
import { normalizeDigits, toPersianDigits } from '../../utils/normalizeDigits'
import { parseNumeric } from '../../utils/parseNumeric'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import { FormField, FormRow, Select } from '../form'
import FormModal from '../FormModal'
import { journeyNoteClass, journeyRowClass, journeyRowMetaClass } from '../ui/buildingStyles'
import { formControlClassName, formErrorClass } from '../ui/formStyles'

interface QuickUnitsBuilderSheetProps {
  open: boolean
  /** From step 1 of the journey; the manager can change them. */
  defaultUnits?: number
  defaultFloors?: number
  header?: ReactNode
  onClose: () => void
  /** Called once the units are written; `count` is how many. */
  onCreated: (count: number) => void
}

const fa = (value: number) => toPersianDigits(String(value))

/**
 * Journey step 3, in three stages: how many units, floors and what reference area; which units
 * are on which floor (moving a floor's end redistributes the later floors, the last one always
 * ends at the total); one area per unit, prefilled with the reference. Creates every unit with
 * a placeholder owner in one go.
 */
export default function QuickUnitsBuilderSheet({
  open,
  defaultUnits = 0,
  defaultFloors = 0,
  header,
  onClose,
  onCreated
}: QuickUnitsBuilderSheetProps) {
  const [stage, setStage] = useState<1 | 2 | 3>(1)
  const [total, setTotal] = useState('')
  const [floors, setFloors] = useState('')
  const [reference, setReference] = useState('100')
  const [ranges, setRanges] = useState<FloorRange[]>([])
  const [areas, setAreas] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setStage(1)
    setTotal(defaultUnits ? String(defaultUnits) : '')
    setFloors(defaultFloors ? String(defaultFloors) : '')
    setAreas({})
    setError(null)
  }, [open, defaultUnits, defaultFloors])

  const referenceArea = parseNumeric(normalizeDigits(reference))

  const drafts = useMemo(
    () =>
      planQuickUnits(
        ranges,
        referenceArea,
        Object.fromEntries(
          Object.entries(areas).map(([number, value]) => [
            number,
            parseNumeric(normalizeDigits(value))
          ])
        )
      ),
    [ranges, referenceArea, areas]
  )

  const submit = async () => {
    if (stage === 1) {
      if (countOf(total) < 1 || countOf(floors) < 1) {
        setError('تعداد واحد و طبقه را وارد کنید')

        return
      }
      setError(null)
      setRanges(defaultRanges(countOf(total), countOf(floors)))
      setStage(2)

      return
    }
    if (stage === 2) {
      setStage(3)

      return
    }

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    setSaving(true)
    try {
      const created = await createUnitsWithOwners(spreadsheetId, drafts)

      onCreated(created.length)
    } catch (err) {
      showError(toUserMessage(err, 'ساخت واحدها ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  const count = countOf(total)

  return (
    <FormModal
      open={open}
      title="ساخت سریع واحدها"
      header={header}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
      saving={saving}
      saveLabel={stage === 3 ? `ساخت ${fa(drafts.length)} واحد و بعدی` : 'بعدی'}
      cancelLabel={stage === 1 ? 'انصراف' : 'قبلی'}
      onCancel={stage === 1 ? onClose : () => setStage(stage === 3 ? 2 : 1)}
    >
      {stage === 1 ? (
        <>
          <p className={journeyNoteClass}>بخش ۱ از ۳ · تعداد</p>
          <FormRow>
            <FormField label="تعداد واحد" required>
              <input
                value={total}
                onChange={event => setTotal(normalizeDigits(event.target.value))}
                inputMode="numeric"
              />
            </FormField>
            <FormField label="تعداد طبقه" required>
              <input
                value={floors}
                onChange={event => setFloors(normalizeDigits(event.target.value))}
                inputMode="numeric"
              />
            </FormField>
          </FormRow>
          <FormField
            label="متراژ هر واحد"
            hint="متراژ معمول واحدها؛ در بخش ۳ برای هر واحد جدا قابل تغییر است."
          >
            <input
              value={reference}
              onChange={event => setReference(normalizeDigits(event.target.value))}
              inputMode="numeric"
            />
          </FormField>
        </>
      ) : null}

      {stage === 2 ? (
        <>
          <p className={journeyNoteClass}>
            بخش ۲ از ۳ · واحدهای هر طبقه. تغییر «تا واحد» یک طبقه، باقی را روی طبقه‌های بعد پخش
            می‌کند؛ آخرین طبقه همیشه به {fa(count)} ختم می‌شود.
          </p>
          {ranges.map((range, index) => {
            const last = index === ranges.length - 1
            const options = rangeEndOptions(ranges, index, count)

            return (
              <div key={range.floor} className={journeyRowClass}>
                <span className="whitespace-nowrap">
                  طبقه {fa(range.floor)}
                  <br />
                  <span className={journeyRowMetaClass}>
                    {range.to < range.from ? 'بدون واحد' : `از واحد ${fa(range.from)}`}
                  </span>
                </span>
                <span className="w-32 shrink-0">
                  <Select
                    compact
                    aria-label={`طبقه ${fa(range.floor)}: تا واحد`}
                    value={String(range.to)}
                    disabled={last}
                    options={(range.to < range.from
                      ? [{ value: String(range.to), label: '—' }]
                      : []
                    ).concat(
                      options.map(number => ({
                        value: String(number),
                        label: last && number === count ? `${fa(number)} (آخر)` : fa(number)
                      }))
                    )}
                    onChange={value => setRanges(setRangeEnd(ranges, index, Number(value), count))}
                  />
                </span>
              </div>
            )
          })}
        </>
      ) : null}

      {stage === 3 ? (
        <>
          <p className={journeyNoteClass}>
            بخش ۳ از ۳ · متراژ هر واحد (معمول: {fa(referenceArea)}). مالک‌ها فعلاً موقت‌اند؛ قدم ۴
            تکمیلشان می‌کند.
          </p>
          {drafts.map(draft => (
            <div key={draft.number} className={journeyRowClass}>
              <span>
                واحد {fa(Number(draft.number))}
                <br />
                <span className={journeyRowMetaClass}>طبقه {fa(draft.floor)}</span>
              </span>
              <input
                aria-label={`متراژ واحد ${fa(Number(draft.number))}`}
                className={formControlClassName('w-24 text-center')}
                value={areas[draft.number] ?? String(draft.area)}
                onChange={event =>
                  setAreas({ ...areas, [draft.number]: normalizeDigits(event.target.value) })
                }
                inputMode="decimal"
              />
            </div>
          ))}
        </>
      ) : null}

      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
    </FormModal>
  )
}
