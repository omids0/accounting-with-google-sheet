import { useEffect, useMemo, useState } from 'react'

import BridgeTick from './BridgeTick'
import { SPLIT_MODES, type SplitMode } from './buildingOptions'
import ExpenseSplitPreviewSheet from './ExpenseSplitPreviewSheet'
import { useBuildingSetupData } from './useBuildingSetupData'
import { activeBuildingName, personalBridgeId } from '../../services/bridgeTarget'
import { splitExpense } from '../../services/buildingExpenses'
import { serializeSplit, parseSplit } from '../../services/buildingExpenseSplit'
import {
  getManagedList,
  labelOfItem,
  MANAGER_PAYER,
  visibleItems
} from '../../services/buildingLists'
import { chargeResidents } from '../../services/buildingResidents'
import { formatMoney } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { parseNumeric } from '../../utils/parseNumeric'
import {
  EXPENSE_KIND_FIELD_ID,
  FUND_PAYER_KEY,
  isNonFundPayer,
  PAYER_FIELD_ID,
  SPLIT_FIELD_ID
} from '../form/buildingFields'
import FormField from '../form/FormField'
import FormRow from '../form/FormRow'
import FormSelect from '../form/FormSelect'
import ToggleSwitch from '../form/ToggleSwitch'
import { journeyNoteClass } from '../ui/buildingStyles'
import Button from '../ui/Button'

type Values = Record<string, string | number>

interface BuildingExpenseFieldsProps {
  /** `who`: kind and payer (before the account); `split`: the split over the units. */
  part: 'who' | 'split'
  values: Values
  setValue: (id: string, value: string | number) => void
  disabled?: boolean
}

const toOptions = (items: ReturnType<typeof getManagedList>, current: string) =>
  visibleItems(items, current).map(item => ({ value: item.value, label: item.label }))

function WhoFields({ values, setValue, disabled }: Omit<BuildingExpenseFieldsProps, 'part'>) {
  const kinds = getManagedList('EXPENSE_KINDS')

  const payers = getManagedList('EXPENSE_PAYERS')

  const kindValue = String(values[EXPENSE_KIND_FIELD_ID] ?? '')

  const payerValue = String(values[PAYER_FIELD_ID] ?? '')

  // A new form starts with the first kind and the fund as payer.
  useEffect(() => {
    if (!kindValue) {
      const first = visibleItems(getManagedList('EXPENSE_KINDS'))[0]

      if (first) setValue(EXPENSE_KIND_FIELD_ID, first.value)
    }
    if (!payerValue) setValue(PAYER_FIELD_ID, FUND_PAYER_KEY)
    // `setValue` is stable per form; the lists are read fresh on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindValue, payerValue])

  const kind = kinds.find(item => item.value === kindValue)

  return (
    <>
      <FormRow>
        <FormSelect
          label="نوع هزینه"
          value={kindValue}
          onChange={next => setValue(EXPENSE_KIND_FIELD_ID, next)}
          options={toOptions(kinds, kindValue)}
          disabled={disabled}
          hint={
            kind ? `سهم واحدها به ${kind.chargeTo === 'owner' ? 'مالک' : 'ساکن'} می‌رسد` : undefined
          }
        />
        <FormSelect
          label="پرداخت از"
          value={payerValue || FUND_PAYER_KEY}
          onChange={next => setValue(PAYER_FIELD_ID, next)}
          options={toOptions(payers, payerValue)}
          disabled={disabled}
        />
      </FormRow>
      {isNonFundPayer(payerValue) ? (
        <p className={journeyNoteClass}>
          پول از صندوق خارج نمی‌شود؛ یک بدهی به «{labelOfItem(payers, payerValue)}» ساخته می‌شود.
        </p>
      ) : null}
      {payerValue === MANAGER_PAYER && personalBridgeId() ? (
        <BridgeTick pref="pocket" text={`طلب از «${activeBuildingName()}»`} disabled={disabled} />
      ) : null}
    </>
  )
}

function SplitFields({ values, setValue, disabled }: Omit<BuildingExpenseFieldsProps, 'part'>) {
  const data = useBuildingSetupData()

  const current = parseSplit(values[SPLIT_FIELD_ID])

  const [previewing, setPreviewing] = useState(false)

  const [manual, setManual] = useState<Record<string, number>>(
    current?.mode === 'manual' ? current.shares : {}
  )

  const kinds = getManagedList('EXPENSE_KINDS')

  const kind = kinds.find(item => item.value === String(values[EXPENSE_KIND_FIELD_ID] ?? ''))

  const units = useMemo(() => data.units.filter(unit => unit.active), [data.units])

  const residents = useMemo(
    () => chargeResidents(data.stays, data.persons),
    [data.stays, data.persons]
  )

  const amount = parseNumeric(values.amount)

  const on = current !== null

  const mode: SplitMode = current?.mode ?? 'equal'

  // A form that starts over (after a save) must not keep the manual shares of the last entry.
  useEffect(() => {
    if (!on) setManual({})
  }, [on])

  const shares = useMemo(
    () => (units.length ? splitExpense(amount, units, mode, manual) : {}),
    [amount, units, mode, manual]
  )

  const json = useMemo(
    () => serializeSplit(on && units.length ? { mode, shares, charge: true } : null),
    [on, units.length, mode, shares]
  )

  // The column always holds the split the form shows: amount, mode and manual figures feed it.
  useEffect(() => {
    if (on && units.length && json !== String(values[SPLIT_FIELD_ID] ?? '')) {
      setValue(SPLIT_FIELD_ID, json)
    }
    // Only the computed JSON drives the write; `values` is read for the comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [json, on, units.length])

  const toggle = (next: boolean) =>
    setValue(SPLIT_FIELD_ID, next ? serializeSplit({ mode, shares, charge: true }) : '')

  const changeMode = (next: string) => {
    // Manual starts from what the other modes just showed.
    if (next === 'manual') setManual(shares)
    setValue(SPLIT_FIELD_ID, serializeSplit({ mode: next as SplitMode, shares, charge: true }))
  }

  const total = Object.values(shares).reduce((sum, share) => sum + share, 0)

  const rule = kind?.chargeTo === 'owner' ? 'مالک' : 'ساکن'

  return (
    <>
      <FormField label="تقسیم بین واحدها" controlWidth="full">
        <div className="flex items-center justify-between gap-3">
          <span className={journeyNoteClass}>هر واحد سهم خودش را به‌عنوان بدهی می‌گیرد</span>
          <ToggleSwitch
            checked={on}
            onChange={toggle}
            label="تقسیم بین واحدها"
            disabled={disabled || !data.loaded}
          />
        </div>
      </FormField>
      {on ? (
        <>
          <FormSelect
            label="روش تقسیم"
            value={mode}
            onChange={changeMode}
            options={SPLIT_MODES.map(item => ({ value: item.value, label: item.label }))}
            disabled={disabled}
          />
          <p className={journeyNoteClass}>
            {`سهم هر واحد به نام ${rule} ثبت می‌شود · ${toPersianDigits(
              String(units.length)
            )} واحد · جمع ${formatMoney(total)}`}
          </p>
          <div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 text-sm"
              onClick={() => setPreviewing(true)}
            >
              دیدن سهم هر واحد ›
            </Button>
          </div>
        </>
      ) : null}
      <ExpenseSplitPreviewSheet
        open={previewing}
        onClose={() => setPreviewing(false)}
        units={units}
        residents={residents}
        kind={kind}
        amount={amount}
        shares={shares}
        manual={mode === 'manual'}
        onShareChange={(unitId, share) => setManual(prev => ({ ...prev, [unitId]: share }))}
      />
    </>
  )
}

/**
 * The three building fields of an expense (round 11, Step 5), drawn by the entry and edit forms in
 * a building workspace. They feed the columns «نوع هزینه», «پرداخت‌کننده» and «تقسیم»; what the
 * shares and the debt do after saving lives in `buildingExpenseActions`.
 */
export default function BuildingExpenseFields({ part, ...rest }: BuildingExpenseFieldsProps) {
  return part === 'who' ? <WhoFields {...rest} /> : <SplitFields {...rest} />
}
