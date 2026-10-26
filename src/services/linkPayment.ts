import { fetchChecks, toggleCheckPaid } from './checks'
import { DangPaymentError } from './dangPaymentError'
import { addDangPayment } from './dangPayments'
import { fetchDangs } from './dangRow'
import { remainingInstallmentAmount } from './installmentsCalculations'
import { getInstallmentPaymentAmount, invalidateInstallmentsCache } from './installmentsConstants'
import { fetchInstallmentPlans, toggleInstallmentPayment } from './installmentsCrud'
import { addReceivablePayment, fetchReceivables } from './receivablesCrud'
import { getReceivableDisplayTitle } from './receivablesRow'
import type { SettleOptions } from './settleOptions'
import { WALLET_APPLY_NO } from '../components/form/fieldUtils'
import type { CheckDirection } from '../types'
import { dangRemaining } from '../utils/dangLedger'
import { formatMoney } from '../utils/formatMoney'
import { formatIsoDatePersian } from '../utils/jalaliDate'
import type { LinkTargetKind, LinkTargetKindId } from '../utils/linkTargetKinds'
import { toPersianDigits } from '../utils/normalizeDigits'
import { remainingOf } from '../utils/paymentLedger'
import { roundMoney } from '../utils/roundMoney'

/** The second level of an item (one instalment of a book): picked after the item itself. */
export interface LinkTargetChild {
  id: string
  title: string
  amount: number
}

/** An open debt, receivable, check or installment book a new record can be linked to. */
export interface LinkTargetItem {
  id: string
  title: string
  /** What the item can take: what is left of a debt, the fixed amount of a check, a book's remainder. */
  remaining: number
  /** The item's own category, to list the ones matching the record's subcategory first. */
  category: string
  /** Shown after the title (a check's due date, how many instalments are left). */
  detail?: string
  /** Present only for items that need a second pick (an installment book). */
  children?: LinkTargetChild[]
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
  attach: (
    spreadsheetId: string,
    itemId: string,
    record: LinkedRecord,
    /** The second pick, for items with children. */
    childId?: string
  ) => Promise<string>
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

/** A check has a fixed amount: only an open one of this direction whose amount is the record's. */
const checkHandler = (direction: CheckDirection): LinkHandler => ({
  async listOpen(spreadsheetId) {
    return (await fetchChecks(spreadsheetId))
      .filter(check => check.direction === direction && !check.paid)
      .map(check => ({
        id: check.id,
        title: [`چک ${toPersianDigits(check.checkNumber)}`, check.counterparty.trim()]
          .filter(Boolean)
          .join(' · '),
        remaining: check.amount,
        category: check.subCategory ?? '',
        detail: `سررسید ${formatIsoDatePersian(check.dueDate)}`
      }))
  },

  async attach(spreadsheetId, itemId, record) {
    // The check as the sheet holds it now: it may have been passed on another device.
    const fresh = (await fetchChecks(spreadsheetId)).find(item => item.id === itemId)

    if (!fresh) throw new LinkPaymentError('این چک پیدا نشد؛ شاید حذف شده باشد.')
    if (fresh.paid) throw new LinkPaymentError('این چک همین حالا پاس شده بود.')
    if (fresh.direction !== direction) throw new LinkPaymentError('نوع این چک عوض شده است.')
    if (roundMoney(fresh.amount) !== roundMoney(record.amount)) {
      throw new LinkPaymentError(`مبلغ چک (${formatMoney(fresh.amount)}) با مبلغ رکورد یکی نیست.`)
    }
    // The record is the payment: no second record, no second balance move.
    await toggleCheckPaid(spreadsheetId, fresh, true, linkOptions(record))

    return `چک ${toPersianDigits(fresh.checkNumber)}`
  }
})

/** An installment book, then which of its unpaid instalments; their amount may differ from the record's. */
const installmentHandler: LinkHandler = {
  async listOpen(spreadsheetId) {
    return (await fetchInstallmentPlans(spreadsheetId))
      .map(plan => {
        const unpaid = plan.payments.filter(payment => !payment.paid)

        return {
          id: plan.id,
          title: plan.title,
          remaining: remainingInstallmentAmount(plan),
          category: plan.subCategory ?? '',
          detail: `${toPersianDigits(String(unpaid.length))} قسط مانده`,
          children: unpaid
            .sort((a, b) => a.n - b.n)
            .map(payment => ({
              id: String(payment.n),
              title: `قسط ${toPersianDigits(String(payment.n))} از ${toPersianDigits(
                String(plan.count)
              )} · سررسید ${formatIsoDatePersian(payment.dueDate)}`,
              amount: getInstallmentPaymentAmount(payment, plan)
            }))
        }
      })
      .filter(item => item.children.length > 0)
  },

  async attach(spreadsheetId, itemId, record, childId = '') {
    if (!(record.amount > 0)) throw new LinkPaymentError('مبلغ رکورد باید بیشتر از صفر باشد.')

    // Read again, never the cached list: an instalment may have been paid since the picker opened.
    invalidateInstallmentsCache(spreadsheetId)

    const plan = (await fetchInstallmentPlans(spreadsheetId)).find(item => item.id === itemId)

    if (!plan) throw new LinkPaymentError('این دفترچه قسط پیدا نشد؛ شاید حذف شده باشد.')

    const index = plan.payments.findIndex(payment => String(payment.n) === childId)

    if (index < 0) throw new LinkPaymentError('این قسط پیدا نشد.')
    if (plan.payments[index].paid) throw new LinkPaymentError('این قسط همین حالا پرداخت شده بود.')
    await toggleInstallmentPayment(spreadsheetId, plan, index, true, linkOptions(record))

    return `${plan.title} (قسط ${toPersianDigits(String(plan.payments[index].n))})`
  }
}

const HANDLERS: Record<LinkTargetKindId, LinkHandler> = {
  dang: dangHandler,
  receivable: receivableHandler,
  checkPaid: checkHandler('paid'),
  checkReceived: checkHandler('received'),
  installment: installmentHandler
}

export const listOpenLinkTargets = (kind: LinkTargetKindId, spreadsheetId: string) =>
  HANDLERS[kind].listOpen(spreadsheetId)

/** Resolves with the linked item's title. Throws `LinkPaymentError`/`DangPaymentError` or a sheet error. */
export const attachRecordToTarget = (
  kind: LinkTargetKindId,
  spreadsheetId: string,
  itemId: string,
  record: LinkedRecord,
  childId?: string
) => HANDLERS[kind].attach(spreadsheetId, itemId, record, childId)

/**
 * What the user reads when the payment step failed after the record was saved. It never says to
 * save again (that would write the record twice); it says where to link the record by hand.
 */
export function linkFailureMessage(kind: LinkTargetKind, err: unknown): string {
  const reason =
    err instanceof LinkPaymentError || err instanceof DangPaymentError ? ` ${err.message}` : ''

  const hint = kind.manualHint ? ` ${kind.manualHint}` : ''

  return `رکورد ذخیره شد ولی ${kind.failureNoun} ثبت نشد.${reason} از صفحهٔ «${kind.page}» همین رکورد را به پرداخت وصل کن.${hint}`
}
