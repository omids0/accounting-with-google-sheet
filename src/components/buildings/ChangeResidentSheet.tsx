import { useEffect, useMemo, useState } from 'react'

import { DEBT_MODES, RESIDENT_ROLES, type DebtMode, type ResidentRole } from './buildingOptions'
import type { BuildingSetupData } from './useBuildingSetupData'
import { unitOpenReceivables } from '../../services/buildingCharges'
import { changeResident } from '../../services/buildingResidentActions'
import { currentOwner } from '../../services/buildingResidents'
import { getCounterpartyFullName } from '../../services/counterparties'
import { remainingAmount } from '../../services/receivablesRow'
import { getSettings } from '../../services/settings'
import { getTodayIso } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import type { CounterpartyWithRow } from '../counterparties/types'
import { CounterpartySelect, FormField, FormSelect } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import MoneyText from '../MoneyText'
import { journeyNoteClass } from '../ui/buildingStyles'

interface ChangeResidentSheetProps {
  open: boolean
  data: BuildingSetupData
  /** The unit whose resident changes; null asks which unit («+ ساکن» on the residents page). */
  unitId: string | null
  defaultRole?: ResidentRole
  onClose: () => void
  /** Called after the change was written and the page's data read again. */
  onDone: () => void
}

/**
 * «تغییر ساکن»: the new person (any counterparty of this building, or a new one on the spot), the
 * role, the date they move in, and — when the unit has open receivables — what happens to them.
 */
export default function ChangeResidentSheet({
  open,
  data,
  unitId,
  defaultRole = 'tenant',
  onClose,
  onDone
}: ChangeResidentSheetProps) {
  const [pickedUnit, setPickedUnit] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<ResidentRole>(defaultRole)
  const [from, setFrom] = useState(getTodayIso().slice(0, 10))
  const [debt, setDebt] = useState<DebtMode>('keep')
  const [people, setPeople] = useState<CounterpartyWithRow[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setPickedUnit(unitId ?? data.units[0]?.id ?? '')
    setName('')
    setRole(defaultRole)
    setFrom(getTodayIso().slice(0, 10))
    setDebt('keep')
    // A placeholder («مالک واحد ۳») is not somebody to move in.
    setPeople(data.persons.filter(person => !person.placeholder))
    // Reset when the sheet opens, not on every reload of the page's data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const unit = data.units.find(item => item.id === (unitId ?? pickedUnit))

  const openDebts = useMemo(
    () => (unit ? unitOpenReceivables(unit.id, data.receivables) : []),
    [unit, data.receivables]
  )

  const owed = openDebts.reduce((sum, item) => sum + remainingAmount(item), 0)

  const submit = async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    const person = people.find(item => getCounterpartyFullName(item) === name)

    if (!unit || !person || !spreadsheetId) return showError('ساکن جدید را انتخاب کن')

    const holder = data.stays.find(
      s => s.unitId === unit.id && s.role === role && s.active && !s.to
    )

    if (holder?.personId === person.id) return showError('این فرد همین حالا در واحد ثبت است')

    setSaving(true)
    try {
      await changeResident(spreadsheetId, unit.id, { id: person.id, name }, role, from, debt, {
        ...data
      })
      await data.reload()
      showSuccess('ساکن واحد تغییر کرد')
      onDone()
    } catch (err) {
      showError(toUserMessage(err, 'تغییر ساکن ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  const owner = unit && currentOwner(unit.id, data.stays)

  return (
    <FormModal
      open={open}
      title="تغییر ساکن"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        return submit()
      }}
      saving={saving}
      saveDisabled={!name || !unit}
      saveLabel="ثبت"
    >
      {unitId === null ? (
        <FormSelect
          label="واحد"
          value={pickedUnit}
          onChange={setPickedUnit}
          options={data.units.map(item => ({
            value: item.id,
            label: `واحد ${toPersianDigits(item.number)}`
          }))}
        />
      ) : (
        <p className={journeyNoteClass}>واحد {toPersianDigits(unit?.number ?? '')}</p>
      )}
      <FormField label="ساکن جدید" required>
        <CounterpartySelect
          value={name}
          onChange={setName}
          counterparties={people}
          onCounterpartiesChange={next => {
            setPeople(next.filter(person => !person.placeholder))
            void data.reload()
          }}
          aria-label="ساکن جدید"
          quickAddCard={role === 'owner'}
        />
      </FormField>
      <FormSelect
        label="نقش"
        value={role}
        onChange={value => setRole(value as ResidentRole)}
        options={RESIDENT_ROLES}
      />
      <FormField label="تاریخ ورود">
        <JalaliDatePicker value={from} onChange={setFrom} />
      </FormField>
      {owed > 0 ? (
        <>
          <p className={journeyNoteClass}>
            این واحد <MoneyText amount={owed} /> بدهی باز دارد؛ با آن چه کنیم؟
          </p>
          <FormSelect
            label="تکلیف بدهی"
            value={debt}
            onChange={value => setDebt(value as DebtMode)}
            options={DEBT_MODES}
            hint={owner ? undefined : 'برای «به مالک» اول مالک واحد را ثبت کن.'}
          />
        </>
      ) : null}
    </FormModal>
  )
}
