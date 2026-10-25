/** Optional wallet account of an income/expense record; its balance follows the record. */
export const WALLET_ACCOUNT_FIELD_ID = 'walletAccount'
export const WALLET_ACCOUNT_FIELD_LABEL = 'حساب'

/** Whether a record that names an account also moves its balance; '' (older rows) means yes. */
export const WALLET_APPLY_FIELD_ID = 'walletApply'
export const WALLET_APPLY_FIELD_LABEL = 'اثر بر موجودی'
export const WALLET_APPLY_YES = 'بله'
export const WALLET_APPLY_NO = 'خیر'

/** Optional counterparty (name) of an income/expense record; same list as checks and dang. */
export const COUNTERPARTY_FIELD_ID = 'counterparty'
export const COUNTERPARTY_FIELD_LABEL = 'طرف حساب'

/** Optional invoice line items of a record, stored as compact JSON (see `utils/lineItems`). */
export const LINE_ITEMS_FIELD_ID = 'lineItems'
export const LINE_ITEMS_FIELD_LABEL = 'اقلام'
