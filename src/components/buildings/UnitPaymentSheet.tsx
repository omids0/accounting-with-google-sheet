import { useEffect, useMemo, useState } from 'react'

import PaymentReceiptCard from './PaymentReceiptCard'
import type { BuildingSetupData } from './useBuildingSetupData'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import {
  chargeDebtor,
  creditsOf,
  unitBalance,
  unitCharge,
  unitOpenReceivables
} from '../../services/buildingCharges'
import {
  allocatePayment,
  allocationText,
  payUnit,
  type PaymentResult
} from '../../services/buildingPayment'
import { chargeResidents } from '../../services/buildingResidents'
import { getSettings } from '../../services/settings'
import { readLastSettleAccount } from '../../services/settleOptions'
import { formatMoney } from '../../utils/formatMoney'
import { toPersianDigits } from '../../utils/normalizeDigits'
import { showError } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import AmountField from '../AmountField'
import { FormField } from '../form'
import ToggleSwitch from '../form/ToggleSwitch'
import FormModal from '../FormModal'
import SettleFields from '../settle/SettleFields'
import { useSettleFields } from '../settle/useSettleFields'
import { alertClassName } from '../ui/Alert'
import { journeyNoteClass } from '../ui/buildingStyles'
import Button from '../ui/Button'

export interface UnitPaymentSheetProps {
  open: boolean
  /** The unit that paid; null while no unit is picked. */
  unitId: string | null
  /** What the building page already loaded (units, stays, people, receivables, accounts). */
  data: BuildingSetupData
  onClose: () => void
  /** Called once the payment is saved and its receipt closed, so the page can read again. */
  onSaved: () => void
}

function UnitPaymentForm({
  unitId,
  data,
  onClose,
  onSaved
}: Omit<UnitPaymentSheetProps, 'open' | 'unitId'> & { unitId: string }) {
  const { can } = useBuildingAccess()
  const { units, stays, persons, receivables, accounts, profile } = data

  const unit = units.find(item => item.id === unitId)!

  const balance = useMemo(
    () => unitBalance(unitId, receivables, creditsOf(receivables)),
    [unitId, receivables]
  )

  const debtor = useMemo(
    () => chargeDebtor(unit, chargeResidents(stays, persons)),
    [unit, stays, persons]
  )

  const monthly = profile
    ? unitCharge(
        profile,
        unit,
        units.filter(item => item.active)
      )
    : 0

  const [amount, setAmount] = useState<number | ''>(balance.open || monthly || '')
  const [keepCredit, setKeepCredit] = useState(true)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<PaymentResult | null>(null)

  const linkedIds = useMemo(
    () =>
      receivables
        .flatMap(item => item.payments.map(payment => payment.transactionRecordId ?? ''))
        .filter(Boolean),
    [receivables]
  )

  const paying = Number(amount) || 0

  const settle = useSettleFields({ type: 'income', amount: paying, linkedIds })

  // The first time a building is paid into there is no remembered account: start from the first.
  useEffect(() => {
    const id = getSettings()?.spreadsheetId

    if (id && !readLastSettleAccount(id, 'income') && accounts[0]) settle.setAccount(accounts[0].id)
    // Once, when the sheet opens; the remembered account is applied by the settle fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const allocation = useMemo(
    () => allocatePayment(unitOpenReceivables(unitId, receivables), paying),
    [unitId, receivables, paying]
  )

  const submit = async () => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return
    if (!can('record')) {
      showError('دسترسی ندارید')

      return
    }

    const options = settle.commit()

    setSaving(true)
    try {
      setResult(
        await payUnit(spreadsheetId, {
          unit,
          debtor,
          amount: paying,
          keepCredit,
          options,
          accountTitle: accounts.find(item => item.id === options.walletAccount)?.title ?? ''
        })
      )
      await data.reload()
    } catch (err) {
      showError(toUserMessage(err, 'ثبت پرداخت ناموفق بود'))
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <FormModal
        open
        title="رسید پرداخت"
        onClose={onSaved}
        onSubmit={event => {
          event.preventDefault()
          onSaved()
        }}
        saveLabel="تمام"
        cancelLabel="بستن"
      >
        <PaymentReceiptCard building={profile?.name ?? ''} result={result} />
      </FormModal>
    )
  }

  return (
    <FormModal
      open
      variant="panel"
      title="ثبت پرداخت شارژ"
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()
        void submit()
      }}
      saving={saving}
      saveDisabled={!(paying > 0) || !can('record')}
      saveLabel={settle.linked ? 'وصل کن' : 'ثبت پرداخت'}
      saveButtonVariant="inflow"
    >
      <p className={journeyNoteClass}>
        <b>
          واحد {toPersianDigits(unit.number)}
          {debtor ? ` · ${debtor.name}` : ''}
        </b>
        <br />
        بدهی باز: {formatMoney(balance.open)}
        {balance.credit ? ` · اعتبار ${formatMoney(balance.credit)}` : ''}
      </p>
      <FormField label="مبلغ" controlWidth="full">
        <AmountField label="مبلغ پرداخت" value={amount} onChange={setAmount} />
      </FormField>
      <div className="flex flex-wrap gap-2">
        {balance.open > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setAmount(balance.open)}
          >
            کل بدهی {formatMoney(balance.open)}
          </Button>
        ) : null}
        {monthly > 0 ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setAmount(monthly)}>
            یک ماه {formatMoney(monthly)}
          </Button>
        ) : null}
      </div>
      <SettleFields state={settle} type="income" />
      {allocation.parts.length ? (
        <p className={journeyNoteClass}>{allocationText(allocation.parts)}</p>
      ) : null}
      {allocation.overflow > 0 ? (
        <div className={alertClassName('info', 'shrink-0')} role="status">
          <b>{formatMoney(allocation.overflow)} بیشتر از بدهی است</b>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span>ذخیره به‌عنوان اعتبار واحد (در صدور بعدی کسر می‌شود)</span>
            <ToggleSwitch
              checked={keepCredit}
              onChange={setKeepCredit}
              label="ذخیره به‌عنوان اعتبار واحد"
            />
          </div>
          {keepCredit ? null : (
            <span className="mt-1 block text-[0.78rem]">
              فقط {formatMoney(paying - allocation.overflow)} ثبت می‌شود؛ یا مبلغ را کم کن.
            </span>
          )}
        </div>
      ) : null}
      <p className={journeyNoteClass}>
        تخصیص از قدیمی‌ترین بدهی شروع می‌شود؛ پرداخت ناقص مجاز است.
      </p>
    </FormModal>
  )
}

/**
 * Round 11, Step 4 (screen 20): a payment for a unit. The amount is on the dial pad (the open
 * balance to start with), the date and fund account come from the settle fields (the account is
 * remembered; a bank-SMS deposit of the same amount is offered to link instead of recording it
 * twice), and the allocation line says what it settles, oldest debt first. More than the debt
 * is kept as the unit's credit (or dropped with the switch off). After saving: the receipt.
 */
export default function UnitPaymentSheet({ open, unitId, ...rest }: UnitPaymentSheetProps) {
  return open && unitId !== null && rest.data.units.some(unit => unit.id === unitId) ? (
    <UnitPaymentForm unitId={unitId} {...rest} />
  ) : null
}
