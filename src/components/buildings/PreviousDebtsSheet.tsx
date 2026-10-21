import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { optionLabel, RESIDENT_ROLES } from './buildingOptions'
import type { BuildingSetupData } from './useBuildingSetupData'
import { currentResident } from '../../services/buildingResidents'
import { OPENING_REFERENCE_PREFIX, savePreviousDebts } from '../../services/buildingSetupActions'
import { getCounterpartyFullName } from '../../services/counterparties'
import { getSettings } from '../../services/settings'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import AmountField from '../AmountField'
import FormModal from '../FormModal'
import MoneyText from '../MoneyText'
import {
  journeyListClass,
  journeyNoteClass,
  journeyRowClass,
  journeyRowMetaClass,
  journeyRowTitleClass,
  journeyTotalClass
} from '../ui/buildingStyles'

interface PreviousDebtsSheetProps {
  open: boolean
  data: BuildingSetupData
  header?: ReactNode
  onClose: () => void
  /** The amounts were saved (journey «ثبت و بعدی»). */
  onSaved: () => void
}

/**
 * Journey step 5 (optional): the debt each unit already has, one dial-pad amount per unit. Each
 * becomes a «بدهی قبلی» receivable addressed to the unit's current debtor, so it shows up in the
 * first statement.
 */
export default function PreviousDebtsSheet({
  open,
  data,
  header,
  onClose,
  onSaved
}: PreviousDebtsSheetProps) {
  const { units, stays, persons, receivables } = data
  const [amounts, setAmounts] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)

  // Starts from the debts already recorded, so reopening the sheet shows and edits them.
  useEffect(() => {
    if (!open) return
    setAmounts(
      Object.fromEntries(
        receivables
          .filter(item => item.reference?.startsWith(OPENING_REFERENCE_PREFIX))
          .map(item => [item.reference!.slice(OPENING_REFERENCE_PREFIX.length), item.amount])
      )
    )
    // Only when the sheet opens: later reloads must not overwrite what is being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const rows = useMemo(() => {
    const byId = new Map(persons.map(person => [person.id, person]))

    return units.map(unit => {
      const stay = currentResident(unit.id, stays)
      const person = stay && byId.get(stay.personId)

      return {
        unit,
        who: person ? getCounterpartyFullName(person) : '—',
        role: stay ? optionLabel(RESIDENT_ROLES, stay.role) : 'خالی'
      }
    })
  }, [units, stays, persons])

  const filled = rows.filter(row => (amounts[row.unit.id] ?? 0) > 0)

  const total = filled.reduce((sum, row) => sum + (amounts[row.unit.id] ?? 0), 0)

  const submit = async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    setSaving(true)
    try {
      await savePreviousDebts(
        spreadsheetId,
        rows.map(row => ({ unit: row.unit, amount: amounts[row.unit.id] ?? 0 })),
        { stays, persons, receivables }
      )
      await data.reload()
      onSaved()
    } catch (err) {
      showError(toUserMessage(err, 'ثبت بدهی قبلی ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      open={open}
      title="بدهی قبلی واحدها"
      header={header}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
      saving={saving}
      saveLabel="ثبت و بعدی"
      cancelLabel="بستن"
    >
      <p className={journeyNoteClass}>
        اگر واحدی از قبل بدهکار است، مبلغش را بزن تا در اولین صورت‌حساب بیاید. بقیه خالی بماند.
      </p>
      <div className={journeyListClass}>
        {rows.map(({ unit, who, role }) => (
          <div key={unit.id} className={journeyRowClass}>
            <span className="min-w-0">
              <span className={journeyRowTitleClass}>
                واحد {toPersianDigits(unit.number)} · {who}
              </span>
              <br />
              <span className={journeyRowMetaClass}>{role}</span>
            </span>
            <span className="w-36 shrink-0">
              <AmountField
                label={`بدهی قبلی واحد ${toPersianDigits(unit.number)}`}
                value={amounts[unit.id] ?? ''}
                placeholder="—"
                hideWords
                onChange={value => setAmounts({ ...amounts, [unit.id]: Number(value) || 0 })}
              />
            </span>
          </div>
        ))}
      </div>
      <div className={journeyTotalClass}>
        <span>جمع بدهی قبلی · {toPersianDigits(String(filled.length))} واحد</span>
        <MoneyText amount={total} />
      </div>
    </FormModal>
  )
}
