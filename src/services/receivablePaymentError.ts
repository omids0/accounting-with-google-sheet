/** A receivable payment (or amount change) the ledger refuses; `message` is Persian and shown as is. */
export class ReceivablePaymentError extends Error {
  constructor(
    message: string,
    public readonly reason: 'amount' | 'over-remaining' | 'below-paid' | 'missing',
    /** For `over-remaining`: what was left when the payment was refused (0 = already settled). */
    public readonly remaining?: number
  ) {
    super(message)
    this.name = 'ReceivablePaymentError'
  }
}
