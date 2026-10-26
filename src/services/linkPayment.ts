import { DangPaymentError } from './dangPaymentError'
import { addDangPayment } from './dangPayments'
import { fetchDangs } from './dangRow'
import { addReceivablePayment, fetchReceivables } from './receivablesCrud'
import { getReceivableDisplayTitle } from './receivablesRow'
import type { SettleOptions } from './settleOptions'
import { WALLET_APPLY_NO } from '../components/form/fieldUtils'
import { dangRemaining } from '../utils/dangLedger'
import { formatMoney } from '../utils/formatMoney'
import type { LinkTargetKind, LinkTargetKindId } from '../utils/linkTargetKinds'
import { remainingOf } from '../utils/paymentLedger'

/** An open debt or receivable a new record can be linked to. */
export interface LinkTargetItem {
  id: string
  title: string
  remaining: number
  /** The item's own category, to list the ones matching the record's subcategory first. */
  category: string
}

/** The record that is the payment: its amount and date become the payment's. */
export interface LinkedRecord {
  recordId: string
  amount: number
  date: string
}

/** A link the ledger refuses or cannot find; `message` is Persian and shown as is. */
export class LinkPaymentError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'LinkPaymentError'
  }
}

interface LinkHandler {
  /** Open items (remaining > 0) from the local mirror; no extra network when it is loaded. */
  listOpen: (spreadsheetId: string) => Promise<LinkTargetItem[]>
  /** Adds the record as a payment of the item. The record exists; nothing else is created. */
  attach: (spreadsheetId: string, itemId: string, record: LinkedRecord) => Promise<string>
}

/** The existing record is the payment: no second record, no balance effect. */
const linkOptions = (record: LinkedRecord): SettleOptions => ({
  date: record.date,
  walletAccount: '',
  walletApply: WALLET_APPLY_NO,
  linkRecordId: record.recordId
})

function assertRoom(noun: string, remaining: number, amount: number) {
  if (!(amount > 0)) throw new LinkPaymentError('مبلغ رکورد باید بیشتر از صفر باشد.')
  if (amount > remaining) {
    throw new LinkPaymentError(
      `مبلغ رکورد نمی‌تواند بیشتر از مانده ${noun} (${formatMoney(remaining)}) باشد.`
    )
  }
}

const dangHandler: LinkHandler = {
  async listOpen(spreadsheetId) {
    return (await fetchDangs(spreadsheetId))
      .map(dang => ({
        id: dang.id,
        title: dang.title,
        remaining: dangRemaining(dang),
        category: dang.category
      }))
      .filter(item => item.remaining > 0)
  },

  async attach(spreadsheetId, itemId, record) {
    // The debt as the sheet holds it now, never the picker's copy: a payment may have landed since.
    const fresh = (await fetchDangs(spreadsheetId)).find(item => item.id === itemId)

    if (!fresh) throw new LinkPaymentError('این بدهی پیدا نشد؛ شاید حذف شده باشد.')
    assertRoom('بدهی', dangRemaining(fresh), record.amount)
    await addDangPayment(spreadsheetId, fresh, { amount: record.amount }, linkOptions(record))

    return fresh.title
  }
}

const receivableHandler: LinkHandler = {
  async listOpen(spreadsheetId) {
    return (await fetchReceivables(spreadsheetId))
      .map(item => ({
        id: item.id,
        title: getReceivableDisplayTitle(item),
        remaining: remainingOf(item.amount, item.payments),
        category: item.category
      }))
      .filter(item => item.remaining > 0)
  },

  async attach(spreadsheetId, itemId, record) {
    // addReceivablePayment writes the copy it is given, so it gets the row as it is right now.
    const fresh = (await fetchReceivables(spreadsheetId)).find(item => item.id === itemId)

    if (!fresh) throw new LinkPaymentError('این طلب پیدا نشد؛ شاید حذف شده باشد.')
    assertRoom('طلب', remainingOf(fresh.amount, fresh.payments), record.amount)
    await addReceivablePayment(spreadsheetId, fresh, { amount: record.amount }, linkOptions(record))

    return getReceivableDisplayTitle(fresh)
  }
}

const HANDLERS: Record<LinkTargetKindId, LinkHandler> = {
  dang: dangHandler,
  receivable: receivableHandler
}

export const listOpenLinkTargets = (kind: LinkTargetKindId, spreadsheetId: string) =>
  HANDLERS[kind].listOpen(spreadsheetId)

/** Resolves with the linked item's title. Throws `LinkPaymentError`/`DangPaymentError` or a sheet error. */
export const attachRecordToTarget = (
  kind: LinkTargetKindId,
  spreadsheetId: string,
  itemId: string,
  record: LinkedRecord
) => HANDLERS[kind].attach(spreadsheetId, itemId, record)

/**
 * What the user reads when the payment step failed after the record was saved. It never says to
 * save again (that would write the record twice); it says where to link the record by hand.
 */
export function linkFailureMessage(kind: LinkTargetKind, err: unknown): string {
  const reason =
    err instanceof LinkPaymentError || err instanceof DangPaymentError ? ` ${err.message}` : ''

  return `رکورد ذخیره شد ولی ${kind.failureNoun} ثبت نشد.${reason} از صفحهٔ «${kind.page}» همین رکورد را به پرداخت وصل کن.`
}
