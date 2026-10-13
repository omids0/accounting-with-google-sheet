import type { ConfirmableSms } from '../../services/bankSmsApply'
import type { EntryTemplate } from '../../services/entryTemplates'
import type { CustomForm } from '../../types'
import { SUBCATEGORY_FIELD_ID, WALLET_ACCOUNT_FIELD_ID } from '../form/fieldUtils'

/** A «پرتکرار» chip the user tapped; `nonce` lets the same chip apply twice. */
export interface AppliedTemplate {
  value: EntryTemplate
  nonce: number
}

export type DataEntryFormProps = {
  activeForm: CustomForm
  loading: boolean
  onLoadingChange: (loading: boolean) => void
  onCancel?: () => void
  onCategoriesRefresh: () => void
  /** Values to open with (e.g. amount/date/account read from a bank SMS). */
  prefill?: Record<string, string | number>
  /** The bank SMS this record comes from; it leaves the queue once saved. */
  bankSms?: ConfirmableSms
  /** Called after a successful save instead of resetting for the next entry. */
  onSaved?: () => void
  /** Fills category, subcategory, account, title and amount from a chip. */
  template?: AppliedTemplate | null
}

/** Form values a chip fills: everything but the date and note. */
export function templateFormValues(template: EntryTemplate): Record<string, string | number> {
  return {
    category: template.category,
    [SUBCATEGORY_FIELD_ID]: template.subCategory,
    [WALLET_ACCOUNT_FIELD_ID]: template.accountId,
    title: template.title,
    amount: template.amount > 0 ? template.amount : ''
  }
}

/**
 * After «ذخیره و بعدی» or a chip: the amount is the first numeric input of the form.
 * `select` highlights it so typing replaces the filled amount.
 */
export function focusEntryAmount(form: HTMLFormElement | null, select = false) {
  requestAnimationFrame(() => {
    const input = form?.querySelector<HTMLInputElement>('input[inputmode="numeric"]')

    input?.focus()
    if (select) input?.select()
  })
}
