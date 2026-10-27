import { useState } from 'react'

import { BankSmsSameButton } from './BankSmsDuplicate'
import BankSmsQueueItem from './BankSmsQueueItem'
import { formatSmsWhen, smsDuplicateStatus } from './smsLabels'
import type { BankSmsReview } from './useBankSmsReview'
import {
  initialSmsAccount,
  resolveSmsAccount,
  type BankSmsReviewItem
} from '../../services/bankSmsQueue'
import { formatPersianNumber, getCurrencySymbol } from '../../utils/formatMoney'
import FormModal from '../FormModal'
import MaskedAmount from '../MaskedAmount'
import DataTable, { type DataTableColumn } from '../table/DataTable'
import { smsBadgeClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'
import { dataTableLinkClass } from '../ui/tableStyles'

type Row = {
  item: BankSmsReviewItem
  receivedAt: number
  account: string
  /** Signed, app currency; 0 when unknown. */
  amount: number
  category: string
  status: string
}

/** The account of a row; an SMS that fits several accounts names them all instead of guessing one. */
function accountLabel(
  item: Extract<BankSmsReviewItem, { kind: 'single' }>,
  resolved: ReturnType<typeof resolveSmsAccount>,
  titleOf: (id: string) => string
): string {
  const { result } = item.entry

  if (result.kind === 'ambiguous') {
    return `${result.candidates.map(candidate => titleOf(candidate.accountId)).join(' یا ')} ؟`
  }

  return resolved ? titleOf(resolved.result.accountId) : '—'
}

function toRow(item: BankSmsReviewItem, review: BankSmsReview): Row {
  const titleOf = (id: string) => review.accounts.find(account => account.id === id)?.title ?? '—'

  if (item.kind === 'transfer') {
    return {
      item,
      receivedAt: item.debit.sms.receivedAt,
      account: `${titleOf(item.debit.result.accountId)} ← ${titleOf(item.credit.result.accountId)}`,
      amount: item.debit.amount,
      category: 'انتقال داخلی',
      status: item.duplicateLegs.debit || item.duplicateLegs.credit ? 'تکراری؟' : ''
    }
  }

  const resolved = resolveSmsAccount(item.entry, initialSmsAccount(item.entry))
  const choice = resolved ? review.choiceFor(resolved) : null
  const sign = resolved?.result.direction === 'debit' ? -1 : 1

  return {
    item,
    receivedAt: item.entry.sms.receivedAt,
    account: accountLabel(item, resolved, titleOf),
    amount: resolved ? sign * resolved.amount : 0,
    category: item.entry.result.kind === 'unknown' ? 'ناشناخته' : choice?.category ?? '—',
    status: item.probableDuplicate ? smsDuplicateStatus(item) : ''
  }
}

/** Desktop (≥ 1280px): the queue as a table; a row opens its full card in the side panel. */
export default function BankSmsQueueTable({ review }: { review: BankSmsReview }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const rows = review.items.map(item => toRow(item, review))
  const open = review.items.find(item => item.key === openKey) ?? null

  const columns: DataTableColumn<Row>[] = [
    {
      id: 'time',
      header: 'زمان',
      sortValue: row => row.receivedAt,
      cell: row => (
        <button
          type="button"
          className={dataTableLinkClass}
          onClick={() => setOpenKey(row.item.key)}
        >
          {formatSmsWhen(row.receivedAt)}
        </button>
      )
    },
    { id: 'account', header: 'حساب', sortValue: row => row.account, cell: row => row.account },
    {
      id: 'amount',
      header: 'مبلغ',
      numeric: true,
      sortValue: row => row.amount,
      cell: row =>
        row.amount ? (
          <MaskedAmount>
            <bdi dir="ltr">
              {row.amount < 0 ? '−' : '+'}
              {formatPersianNumber(Math.abs(row.amount))}
            </bdi>{' '}
            {getCurrencySymbol()}
          </MaskedAmount>
        ) : (
          '—'
        )
    },
    { id: 'category', header: 'دسته', sortValue: row => row.category, cell: row => row.category },
    {
      id: 'status',
      header: 'وضعیت',
      // inline-block: a long label wraps inside one pill instead of splitting it in two.
      cell: row =>
        row.status ? <span className={`${smsBadgeClass} inline-block`}>{row.status}</span> : null
    }
  ]

  return (
    <>
      <DataTable
        label="صف پیامک‌های بانکی"
        rows={rows}
        columns={columns}
        rowKey={row => row.item.key}
        actions={row => {
          const { item } = row
          const resolved =
            item.kind === 'single'
              ? resolveSmsAccount(item.entry, initialSmsAccount(item.entry))
              : null
          const offer = resolved ? review.offerFor(resolved) : null

          const payment = item.kind === 'single' ? item.duplicatePayment : null
          // Which account an SMS belongs to is the user's answer, never a guess saved on a click
          // (saving would also teach the guessed card digits for good): the card asks.
          const ambiguous = item.kind === 'single' && item.entry.result.kind === 'ambiguous'

          return (
            <>
              {item.kind === 'single' && payment && (
                <BankSmsSameButton
                  item={item}
                  busy={review.busyKey === item.key}
                  onClick={() => void review.closeAsRecorded(item)}
                />
              )}
              {item.kind === 'single' && resolved && (
                <Button
                  type="button"
                  size="sm"
                  variant={
                    ambiguous || payment ? 'secondary' : row.amount < 0 ? 'outflow' : 'inflow'
                  }
                  disabled={review.busyKey === item.key}
                  onClick={() =>
                    // The account (or the unit that paid) is picked on the card, in the side panel.
                    ambiguous || offer?.kind === 'pick'
                      ? setOpenKey(item.key)
                      : review.primary(resolved, item.probableDuplicate)
                  }
                >
                  {ambiguous
                    ? 'انتخاب حساب'
                    : offer
                    ? 'ثبت پرداخت'
                    : row.amount < 0
                    ? 'ثبت هزینه'
                    : 'ثبت درآمد'}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => setOpenKey(item.key)}
              >
                جزئیات
              </Button>
            </>
          )
        }}
      />
      <FormModal
        open={open !== null}
        title="پیامک بانکی"
        variant="panel"
        saveLabel="بستن"
        onClose={() => setOpenKey(null)}
        onSubmit={event => {
          event.preventDefault()
          setOpenKey(null)
        }}
      >
        {open && <BankSmsQueueItem item={open} review={review} />}
      </FormModal>
    </>
  )
}
