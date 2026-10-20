import { confirmSmsEntryWithId, type ConfirmableSms } from './bankSmsApply'
import { smsRecordDate } from './bankSmsDate'
import { UNIT_SMS_PAYMENT_NOTE } from './buildingCharges'
import { payUnit, type PaymentResult } from './buildingPayment'
import { WALLET_APPLY_NO } from '../components/form/fieldUtils'
import { toPersianDigits } from '../utils/normalizeDigits'
import { BUILDING_CHARGE_CATEGORY } from '../utils/protectedCategories'

export interface SmsUnitPaymentInput {
  unit: { id: string; number: string }
  debtor: { id: string; name: string } | null
  /** Title of the fund account the SMS names. */
  accountTitle: string
}

/**
 * Round 11, Step 6: «ثبت پرداخت واحد N» on a deposit SMS. The SMS is confirmed the usual way, so
 * the income record, the SMS «مانده» balance rule and the queue all behave as for any deposit;
 * then `payUnit` (Step 4) spreads that record over the unit's open charges, oldest first, and
 * keeps an overpayment as the unit's credit. The record is the payment: it is linked, never
 * written twice. If `payUnit` fails the deposit is already recorded as income, and the unit page
 * offers to link it («همان است، وصل کن»).
 */
export async function payUnitFromSms(
  spreadsheetId: string,
  entry: ConfirmableSms,
  input: SmsUnitPaymentInput
): Promise<PaymentResult> {
  const { unit, debtor } = input
  const name = debtor?.name ?? ''

  const recordId = await confirmSmsEntryWithId(
    spreadsheetId,
    entry,
    {
      title: `شارژ واحد ${toPersianDigits(unit.number)}${name ? ` · ${name}` : ''}`,
      category: BUILDING_CHARGE_CATEGORY,
      subCategory: ''
    },
    { remember: false }
  )

  return payUnit(spreadsheetId, {
    unit,
    debtor,
    amount: entry.amount,
    keepCredit: true,
    note: UNIT_SMS_PAYMENT_NOTE,
    accountTitle: input.accountTitle,
    options: {
      date: smsRecordDate(entry.sms.body, entry.sms.receivedAt),
      walletAccount: entry.result.accountId,
      // The record exists already (and the SMS moved the balance): nothing is applied again.
      walletApply: WALLET_APPLY_NO,
      linkRecordId: recordId
    }
  })
}
