import type { VaultFormState } from './types'
import { quantityError } from '../../services/treasuryQuantity'

export type TradeFormErrors = Partial<Record<'quantity' | 'unitPrice' | 'transactionDate', string>>

/** What stops a buy or a sell from being saved, per field, so each can show its own line. */
export function tradeFormErrors(
  values: Pick<VaultFormState, 'quantity' | 'unitPrice' | 'transactionDate'>,
  decimals: number,
  messages: { price: string; date: string; emptyQuantity?: string }
): TradeFormErrors {
  const errors: TradeFormErrors = {}
  const qty = Number(values.quantity)
  const qtyError = quantityError(qty, decimals)

  if (qtyError) errors.quantity = qty > 0 ? qtyError : messages.emptyQuantity ?? qtyError
  if (!values.unitPrice || Number(values.unitPrice) <= 0) errors.unitPrice = messages.price
  if (!values.transactionDate) errors.transactionDate = messages.date

  return errors
}
