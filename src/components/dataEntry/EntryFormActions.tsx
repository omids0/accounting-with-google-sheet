import type { CustomForm } from '../../types'
import { cn } from '../../utils/cn'
import Button from '../ui/Button'
import { formActionsClassName } from '../ui/formStyles'
import { dataEntryFormActionsClass } from '../ui/recordsStyles'

/**
 * ذخیره / ذخیره و بعدی / انصراف. «ذخیره و بعدی» (desktop only) is a second submit
 * button marked `data-save-next`: the form saves, clears and stays open.
 */
export default function EntryFormActions({
  formType,
  loading,
  saveDisabled,
  onCancel,
  showSaveNext
}: {
  formType: CustomForm['type']
  loading: boolean
  saveDisabled: boolean
  onCancel?: () => void
  /** Off when the form must close after saving (bank SMS drafts). */
  showSaveNext: boolean
}) {
  return (
    <div
      className={cn(
        formActionsClassName(),
        dataEntryFormActionsClass,
        'xl:flex-nowrap xl:[&>button]:w-auto xl:[&>button]:min-w-32'
      )}
    >
      <Button
        type="submit"
        variant={formType === 'expense' ? 'outflow' : formType === 'income' ? 'inflow' : 'primary'}
        disabled={saveDisabled}
        loading={loading}
      >
        ذخیره
      </Button>
      {showSaveNext && (
        <Button
          type="submit"
          variant="secondary"
          className="hidden xl:inline-flex"
          disabled={saveDisabled}
          data-save-next
        >
          ذخیره و بعدی
        </Button>
      )}
      <Button type="button" variant="secondary" disabled={loading} onClick={() => onCancel?.()}>
        انصراف
      </Button>
    </div>
  )
}
