import { useEffect, useState } from 'react'

import { unitRoleText } from './residentRows'
import type { BuildingSetupData } from './useBuildingSetupData'
import { baseChargeFor } from '../../services/buildingCharges'
import { saveUnit, validateUnitForm, type UnitFormValues } from '../../services/buildingUnitActions'
import type { UnitWithRow } from '../../services/buildingUnits'
import { getCounterpartyFullName } from '../../services/counterparties'
import { getSettings } from '../../services/settings'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { parseNumeric } from '../../utils/parseNumeric'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import AmountField from '../AmountField'
import { FormField, FormRow } from '../form'
import FormModal from '../FormModal'
import { journeyListClass, journeyNoteClass, journeyRowClass } from '../ui/buildingStyles'
import Button from '../ui/Button'

interface UnitFormModalProps {
  open: boolean
  /** The unit being edited; null = a new unit. */
  unit: UnitWithRow | null
  data: BuildingSetupData
  onClose: () => void
  /** «+ افزودن نفر» (an existing unit only); the page opens its change-resident sheet. */
  onAddPerson: (unit: UnitWithRow) => void
  onSaved: () => void
}

type Draft = Record<'number' | 'floor' | 'area' | 'people' | 'parking' | 'storage' | 'note', string>

/** The next free door number for a new unit: one after the highest numeric one. */
const nextNumber = (units: UnitWithRow[]) =>
  String(Math.max(0, ...units.map(item => Math.trunc(parseNumeric(item.number)))) + 1)

const draftOf = (unit: UnitWithRow | null, units: UnitWithRow[]): Draft => {
  const text = (value: number | undefined) => (value ? String(value) : '')

  return {
    number: unit?.number ?? nextNumber(units),
    floor: text(unit?.floor),
    area: text(unit?.area),
    people: text(unit?.people),
    parking: text(unit?.parking),
    storage: text(unit?.storage),
    note: unit?.note ?? ''
  }
}

const count = (raw: string) => Math.max(0, parseNumeric(normalizeDigits(raw)))

/** The unit form (screen 18) as a sheet, or a side panel on desktop. */
export default function UnitFormModal({
  open,
  unit,
  data,
  onClose,
  onAddPerson,
  onSaved
}: UnitFormModalProps) {
  const [draft, setDraft] = useState(() => draftOf(unit, data.units))
  /** The unit's own charge; null = it keeps following the building's method. */
  const [charge, setCharge] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(draftOf(unit, data.units))
    setCharge(unit?.monthlyCharge || null)
    // Reset when the form opens for a unit, not after each reload of the page's data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, unit?.id])

  const set = (patch: Partial<Draft>) => setDraft(current => ({ ...current, ...patch }))

  const base = data.profile
    ? baseChargeFor(
        data.profile,
        { area: count(draft.area), people: count(draft.people) },
        data.units
      )
    : 0

  const people = unit
    ? data.stays
        .filter(s => s.unitId === unit.id && s.active && !s.to)
        .map(stay => ({ stay, person: data.persons.find(p => p.id === stay.personId) }))
    : []

  const submit = async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    const values: UnitFormValues = {
      number: draft.number,
      floor: Math.trunc(count(draft.floor)),
      area: count(draft.area),
      people: Math.trunc(count(draft.people)),
      parking: Math.trunc(count(draft.parking)),
      storage: Math.trunc(count(draft.storage)),
      monthlyCharge: charge ?? 0,
      note: draft.note.trim()
    }

    const problem = validateUnitForm(values, data.units, unit?.id)

    if (problem) return showError(problem)
    if (!spreadsheetId) return

    setSaving(true)
    try {
      await saveUnit(spreadsheetId, values, unit)
      await data.reload()
      showSuccess(unit ? 'واحد ذخیره شد' : 'واحد اضافه شد')
      onSaved()
    } catch (err) {
      showError(toUserMessage(err, 'ذخیرهٔ واحد ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  const numberInput = (label: string, key: keyof Draft) => (
    <FormField label={label}>
      <input
        value={draft[key]}
        inputMode="numeric"
        onChange={event => set({ [key]: normalizeDigits(event.target.value) })}
      />
    </FormField>
  )

  return (
    <FormModal
      open={open}
      variant="panel"
      title={unit ? `واحد ${draft.number || unit.number}` : 'واحد جدید'}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
      saving={saving}
      saveLabel="ذخیره"
    >
      <FormRow className="grid grid-cols-3 gap-x-2 md:grid-cols-3">
        {numberInput('شماره', 'number')}
        {numberInput('طبقه', 'floor')}
        {numberInput('متراژ', 'area')}
      </FormRow>
      <FormRow className="grid grid-cols-3 gap-x-2 md:grid-cols-3">
        {numberInput('نفرات', 'people')}
        {numberInput('پارکینگ', 'parking')}
        {numberInput('انباری', 'storage')}
      </FormRow>
      <FormField
        label="شارژ ماهانه"
        hint={
          charge === null
            ? 'پیش‌فرض ساختمان؛ اگر مبلغ را عوض کنی فقط برای این واحد ثابت می‌شود.'
            : 'مبلغ مخصوص این واحد؛ برای برگشت به پیش‌فرض، همان مبلغ پیش‌فرض را بزن.'
        }
      >
        <AmountField
          label="شارژ ماهانه"
          value={charge ?? base}
          hideWords
          onChange={value => setCharge(Number(value) === base ? null : Number(value) || 0)}
        />
      </FormField>

      <FormField label="افراد این واحد">
        {unit ? (
          <div className={journeyListClass}>
            {people.map(({ stay, person }) => (
              <div key={stay.id} className={journeyRowClass}>
                <span>{person ? getCounterpartyFullName(person) : '—'}</span>
                <span className={journeyNoteClass}>{unitRoleText(stay, unit, data.stays)}</span>
              </div>
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={() => onAddPerson(unit)}>
              + افزودن نفر
            </Button>
          </div>
        ) : (
          <p className={journeyNoteClass}>
            مالک موقت ثبت می‌شود؛ بعد از ذخیره می‌توانی نام مالک و ساکن را وارد کنی.
          </p>
        )}
      </FormField>

      <FormField label="یادداشت">
        <textarea value={draft.note} onChange={event => set({ note: event.target.value })} />
      </FormField>
    </FormModal>
  )
}
