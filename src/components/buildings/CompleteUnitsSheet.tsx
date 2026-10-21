import { useEffect, useMemo, useState, type ReactNode } from 'react'

import CompleteUnitFields from './CompleteUnitFields'
import {
  completionSummary,
  initialUnitForm,
  isUnitComplete,
  unitFormNumbers,
  type UnitForm
} from './completeUnitForm'
import type { BuildingSetupData } from './useBuildingSetupData'
import { baseChargeFor } from '../../services/buildingCharges'
import { completeUnit } from '../../services/buildingSetupActions'
import { getSettings } from '../../services/settings'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import FormModal from '../FormModal'
import ProgressBar from '../ProgressBar'
import {
  journeyBarLinkClass,
  journeyNoteClass,
  journeyProgressTextClass
} from '../ui/buildingStyles'

interface CompleteUnitsSheetProps {
  open: boolean
  data: BuildingSetupData
  header?: ReactNode
  onClose: () => void
  /** The last unit was saved and the summary confirmed. */
  onDone: () => void
}

const fa = (value: number) => toPersianDigits(String(value))

/**
 * Journey step 4: one unit at a time with a progress bar (owner, phone, card, occupancy and the
 * tenant, area, people, parking, storage, special charge). Saving writes the counterparty, the
 * unit and the stay rows. Ends with the occupancy summary. Also opened later from the guide card
 * while any unit still has a placeholder owner.
 */
export default function CompleteUnitsSheet({
  open,
  data,
  header,
  onClose,
  onDone
}: CompleteUnitsSheetProps) {
  const { units, stays, persons, profile } = data
  const [index, setIndex] = useState(0)
  const [form, setForm] = useState<UnitForm | null>(null)
  const [summary, setSummary] = useState(false)
  const [saving, setSaving] = useState(false)

  const unit = units[index]

  const complete = useMemo(
    () => units.filter(item => isUnitComplete(item, stays, persons)).length,
    [units, stays, persons]
  )

  // Opens on the first unit still waiting for its owner.
  useEffect(() => {
    if (!open || !data.loaded) return
    const first = units.findIndex(item => !isUnitComplete(item, stays, persons))

    setIndex(first === -1 ? 0 : first)
    setSummary(false)
    // Only when the sheet opens or the data first arrives, not after every save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, data.loaded])

  // The form starts from the stored unit each time another unit comes up.
  useEffect(() => {
    if (open && unit) setForm(initialUnitForm(unit, stays, persons))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id])

  const baseCharge = useMemo(() => {
    if (!profile || !form) return 0

    const draft = { area: Number(form.area) || 0, people: Number(form.people) || 0 }

    return baseChargeFor(profile, draft, units)
  }, [profile, form, units])

  const advance = async () => {
    await data.reload()
    if (index + 1 >= units.length) setSummary(true)
    else setIndex(index + 1)
  }

  const save = async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!unit || !form || !spreadsheetId) return

    setSaving(true)
    try {
      await completeUnit(spreadsheetId, {
        unit,
        stays,
        persons,
        owner: form.owner,
        occupancy: form.occupancy,
        tenant: form.tenant,
        ...unitFormNumbers(form)
      })
      await advance()
    } catch (err) {
      showError(toUserMessage(err, 'ذخیرهٔ واحد ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  const empty = data.loaded && units.length === 0

  return (
    <FormModal
      open={open}
      title="مالک و ساکنان"
      header={header}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        if (summary || empty) onDone()
        else void save()
      }}
      saving={saving}
      saveLabel={summary || empty ? 'بعدی' : 'ذخیره و بعدی'}
      cancelLabel={summary || index === 0 ? 'بستن' : 'قبلی'}
      onCancel={summary || index === 0 ? onClose : () => setIndex(index - 1)}
    >
      {empty ? <p className={journeyNoteClass}>هنوز واحدی ثبت نشده است.</p> : null}

      {summary ? (
        <p className={journeyNoteClass} role="status">
          {completionSummary(units)}
        </p>
      ) : null}

      {!summary && unit && form ? (
        <>
          <div className={journeyProgressTextClass}>
            <b>
              واحد {fa(index + 1)} از {fa(units.length)}
            </b>
            <span>{fa(complete)} تکمیل شد</span>
          </div>
          <ProgressBar
            value={(complete / Math.max(1, units.length)) * 100}
            showLabel={false}
            aria-label="پیشرفت تکمیل واحدها"
          />
          <p className={journeyNoteClass}>
            واحد {toPersianDigits(unit.number)}
            {unit.floor ? ` · طبقه ${fa(unit.floor)}` : ''}
          </p>
          <CompleteUnitFields form={form} baseCharge={baseCharge} onChange={setForm} />
          <button
            type="button"
            className={journeyBarLinkClass}
            onClick={() => void advance()}
            disabled={saving}
          >
            رد کردن این واحد
          </button>
        </>
      ) : null}
    </FormModal>
  )
}
