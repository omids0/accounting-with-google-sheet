import { recordLockNote, splitLabel } from './sharedViewModel'
import type { SharedRecords } from './useSharedRecords'
import { settlementOf } from '../../services/sharedSettlement'
import AmountField from '../AmountField'
import AppIcon from '../AppIcon'
import { FormField } from '../form'
import {
  parseSplit,
  SHARED_CREATOR_FIELD_ID,
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID
} from '../form/sharedFields'
import type { StoredRecord } from '../records/recordsUtils'
import { alertClassName } from '../ui/Alert'
import {
  recordDetailLabelClass,
  recordDetailListClass,
  recordDetailRowClass,
  recordDetailValueClass
} from '../ui/recordDetailStyles'
import { sharedAlertClass, sharedNoteRowClass } from '../ui/sharedStyles'

interface SharedRecordPanelProps {
  record: StoredRecord
  shared: Pick<SharedRecords, 'me' | 'names' | 'nameOf' | 'access'>
  /** The amount edit, when the signed-in user may change this record; else the lock note. */
  edit: { amount: number | ''; onAmount: (amount: number | '') => void } | null
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={recordDetailRowClass}>
      <dt className={recordDetailLabelClass}>{label}</dt>
      <dd className={`${recordDetailValueClass} m-0`}>{value}</dd>
    </div>
  )
}

/**
 * The record sheet's shared block (the generic fields hide the raw shared columns): who paid,
 * the split («نصف‌نصف» / «فقط برای X») and who recorded it, then the amount edit or why there is
 * none. A settlement reads «از X به Y»; an income says it never moves the balance.
 */
export default function SharedRecordPanel({ record, shared, edit }: SharedRecordPanelProps) {
  const { values } = record
  const settlement = record.formType === 'expense' ? settlementOf(values) : null
  const income = record.formType === 'income'
  const creator = String(values[SHARED_CREATOR_FIELD_ID] ?? '')
  const payer = String(values[SHARED_PAYER_FIELD_ID] ?? '')
  const split = parseSplit(String(values[SHARED_SPLIT_FIELD_ID] ?? ''))

  return (
    <>
      <dl className={recordDetailListClass}>
        {settlement ? (
          <Row
            label="تسویه"
            value={`${shared.nameOf(settlement.from)} به ${shared.nameOf(settlement.to)}`}
          />
        ) : income ? null : (
          <>
            <Row label="پرداخت‌کننده" value={payer ? shared.nameOf(payer) : '—'} />
            <Row label="تقسیم" value={splitLabel(split, shared.me, shared.names)} />
          </>
        )}
        {/* «ثبت‌کننده» above is the last editor; the creator only when someone else edited it. */}
        {creator && creator.trim().toLowerCase() !== (record.writer ?? '').trim().toLowerCase() ? (
          <Row label="ایجادکننده" value={shared.nameOf(creator)} />
        ) : null}
      </dl>

      {income ? (
        <p className={alertClassName('info', sharedAlertClass)}>
          درآمد فقط در گزارش‌ها می‌آید و روی تراز اثری ندارد.
        </p>
      ) : null}

      {edit ? (
        <FormField label="ویرایش مبلغ" controlWidth="full">
          <AmountField label="مبلغ" value={edit.amount} onChange={edit.onAmount} />
        </FormField>
      ) : (
        <div className={alertClassName('info', sharedAlertClass)} role="note">
          <span className={sharedNoteRowClass}>
            <AppIcon name="lock" size={18} />
            <span>
              {recordLockNote({
                canRecord: settlement ? shared.access.canSettle : shared.access.canRecord,
                creatorName: creator ? shared.nameOf(creator) : ''
              })}
            </span>
          </span>
        </div>
      )}
    </>
  )
}
