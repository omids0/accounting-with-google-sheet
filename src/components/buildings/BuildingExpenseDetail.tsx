import { useEffect, useState } from 'react'

import { parseSplit, sharesOfRecordStatus, type ShareStatus } from './expenseShareRows'
import { getManagedList, labelOfItem } from '../../services/buildingLists'
import { fetchUnits } from '../../services/buildingUnits'
import { fetchReceivables } from '../../services/receivablesCrud'
import { getSettings } from '../../services/settings'
import { toPersianDigits } from '../../utils/normalizeDigits'
import {
  EXPENSE_KIND_FIELD_ID,
  FUND_PAYER_KEY,
  PAYER_FIELD_ID,
  SPLIT_FIELD_ID
} from '../form/buildingFields'
import MoneyText from '../MoneyText'
import {
  recordDetailLabelClass,
  recordDetailListClass,
  recordDetailRowClass,
  recordDetailSectionClass,
  recordDetailSectionTitleClass,
  recordDetailValueClass
} from '../ui/recordDetailStyles'
import {
  dataTableCellClass,
  dataTableClass,
  dataTableHeadCellClass,
  dataTableNumericClass,
  dataTableWrapClass
} from '../ui/tableStyles'

const STATUS_TEXT: Record<ShareStatus, string> = {
  paid: 'پرداخت شد',
  partial: 'ناقص',
  open: 'پرداخت‌نشده'
}

/**
 * What the record detail sheet adds for a building expense: its kind and payer and, when it was
 * split, a table of the unit shares with their state (open, partly paid, paid).
 */
export default function BuildingExpenseDetail({
  record
}: {
  record: { id: string; values: Record<string, string> }
}) {
  const { values } = record
  const [rows, setRows] = useState<ReturnType<typeof sharesOfRecordStatus>>([])

  const split = parseSplit(values[SPLIT_FIELD_ID])

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!split?.charge || !spreadsheetId) return

    let live = true

    void Promise.all([fetchReceivables(spreadsheetId), fetchUnits(spreadsheetId)])
      .then(([receivables, units]) => {
        if (live) setRows(sharesOfRecordStatus(record.id, receivables, units))
      })
      .catch(() => undefined)

    return () => {
      live = false
    }
    // The split JSON is the dependency that matters; it is rebuilt from `values` each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.id, values[SPLIT_FIELD_ID]])

  const kind = String(values[EXPENSE_KIND_FIELD_ID] ?? '')

  const payer = String(values[PAYER_FIELD_ID] ?? '') || FUND_PAYER_KEY

  return (
    <>
      <dl className={recordDetailListClass}>
        {kind ? (
          <div className={recordDetailRowClass}>
            <dt className={recordDetailLabelClass}>نوع</dt>
            <dd className={`${recordDetailValueClass} m-0`}>
              {labelOfItem(getManagedList('EXPENSE_KINDS'), kind)}
            </dd>
          </div>
        ) : null}
        <div className={recordDetailRowClass}>
          <dt className={recordDetailLabelClass}>پرداخت‌کننده</dt>
          <dd className={`${recordDetailValueClass} m-0`}>
            {labelOfItem(getManagedList('EXPENSE_PAYERS'), payer)}
          </dd>
        </div>
      </dl>

      {rows.length ? (
        <div className={recordDetailSectionClass}>
          <h3 className={recordDetailSectionTitleClass}>
            {`سهم واحدها · ${toPersianDigits(String(rows.length))}`}
          </h3>
          <div className={dataTableWrapClass(true)}>
            <table className={dataTableClass}>
              <thead>
                <tr>
                  <th className={dataTableHeadCellClass}>واحد</th>
                  <th className={dataTableHeadCellClass}>بدهکار</th>
                  <th className={dataTableHeadCellClass}>سهم</th>
                  <th className={dataTableHeadCellClass}>وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.reference}>
                    <td className={dataTableCellClass}>{toPersianDigits(row.unitNumber)}</td>
                    <td className={dataTableCellClass}>{row.debtor}</td>
                    <td className={`${dataTableCellClass} ${dataTableNumericClass}`}>
                      <MoneyText amount={row.amount} />
                    </td>
                    <td className={dataTableCellClass}>{STATUS_TEXT[row.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </>
  )
}
