import type { ConfirmableSms } from '../../services/bankSmsApply'
import type { CustomForm } from '../../types'

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
}
