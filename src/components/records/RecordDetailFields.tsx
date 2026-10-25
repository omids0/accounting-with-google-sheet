import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { getFormField, type StoredRecord } from './recordsUtils'
import { useSharing } from '../../hooks/useSharing'
import { highlightPath } from '../../routes/paths'
import { getSettings } from '../../services/settings'
import { fetchWalletAccounts } from '../../services/wallet'
import type { CustomForm } from '../../types'
import { formatPersianNumber } from '../../utils/formatMoney'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { JALALI_WEEKDAYS, saturdayFirstColumn } from '../../utils/jalaliMonthGrid'
import { parseNumeric } from '../../utils/parseNumeric'
import { BUILDING_FIELD_IDS } from '../form/buildingFields'
import {
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  SUBCATEGORY_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  WALLET_APPLY_NO
} from '../form/fieldUtils'
import { SHARED_FIELD_IDS, SHARED_LINK_FIELD_ID } from '../form/sharedFields'
import {
  recordDetailHintClass,
  recordDetailLabelClass,
  recordDetailListClass,
  recordDetailRowClass,
  recordDetailValueClass
} from '../ui/recordDetailStyles'
import WriterAvatar from '../WriterAvatar'

/** Fields the sheet shows itself (header, dedicated rows, sections); the rest list generically. */
const COVERED_FIELD_IDS = new Set([
  'title',
  'amount',
  'date',
  'category',
  SUBCATEGORY_FIELD_ID,
  WALLET_ACCOUNT_FIELD_ID,
  WALLET_APPLY_FIELD_ID,
  COUNTERPARTY_FIELD_ID,
  LINE_ITEMS_FIELD_ID,
  'attachments',
  'note',
  // A building expense's kind, payer and split are shown by `BuildingExpenseDetail`.
  ...BUILDING_FIELD_IDS,
  // A shared record's payer, split, creator and link are drawn by the shared account's sheets.
  ...SHARED_FIELD_IDS,
  SHARED_LINK_FIELD_ID
])

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={recordDetailRowClass}>
      <dt className={recordDetailLabelClass}>{label}</dt>
      <dd className={`${recordDetailValueClass} m-0`}>{children}</dd>
    </div>
  )
}

function dateWithWeekday(iso: string): string {
  const day = iso.slice(0, 10)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return formatIsoDatePersian(iso)

  return `${JALALI_WEEKDAYS[saturdayFirstColumn(day)].name}، ${formatIsoDatePersian(day)}`
}

/** The key/value rows of a record: date, category, account, counterparty, note, writer, custom fields. */
export default function RecordDetailFields({
  record,
  form
}: {
  record: StoredRecord
  form: CustomForm
}) {
  const { shared } = useSharing()
  const [accountTitles, setAccountTitles] = useState<Map<string, string>>(new Map())
  const { values } = record
  const accountId = (values[WALLET_ACCOUNT_FIELD_ID] ?? '').trim()

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!accountId || !spreadsheetId) return

    let live = true

    void fetchWalletAccounts(spreadsheetId)
      .then(items => live && setAccountTitles(new Map(items.map(item => [item.id, item.title]))))
      .catch(() => undefined)

    return () => {
      live = false
    }
  }, [accountId])

  const dateField = getFormField(form, 'date')
  const date = dateField ? values[dateField.id] ?? '' : ''
  const category = values.category ?? ''
  const subCategory = values[SUBCATEGORY_FIELD_ID] ?? ''
  const counterparty = (values[COUNTERPARTY_FIELD_ID] ?? '').trim()
  const note = (values.note ?? '').trim()
  const applied = (values[WALLET_APPLY_FIELD_ID] ?? '') !== WALLET_APPLY_NO

  const custom = form.fields.filter(
    field => !COVERED_FIELD_IDS.has(field.id) && field.id !== dateField?.id && values[field.id]
  )

  return (
    <dl className={recordDetailListClass}>
      {date ? <Row label="تاریخ">{dateWithWeekday(date)}</Row> : null}
      {category ? (
        <Row label="دسته">{subCategory ? `${category} › ${subCategory}` : category}</Row>
      ) : null}
      {accountId ? (
        <Row label="حساب">
          {accountTitles.get(accountId) ?? '…'}
          <span className={recordDetailHintClass}>{`اثر بر موجودی: ${
            applied ? 'بله' : 'خیر'
          }`}</span>
        </Row>
      ) : null}
      {counterparty ? (
        <Row label="طرف حساب">
          <Link to={highlightPath('/counterparties', counterparty)}>{counterparty}</Link>
        </Row>
      ) : null}
      {note ? <Row label="توضیحات">{note}</Row> : null}
      {custom.map(field => (
        <Row key={field.id} label={field.label}>
          {field.type === 'date'
            ? formatIsoDatePersian(values[field.id])
            : field.type === 'number'
            ? formatPersianNumber(parseNumeric(values[field.id]))
            : values[field.id]}
        </Row>
      ))}
      <Row label="ثبت‌کننده">
        {shared && record.writer ? <WriterAvatar email={record.writer} withName="plain" /> : null}
        {shared && record.writer && record.createdAt ? ' · ' : null}
        {record.createdAt || (!record.writer ? '—' : null)}
      </Row>
    </dl>
  )
}
