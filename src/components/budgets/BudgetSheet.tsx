import { useEffect, useState } from 'react'

import { logItemActivity } from '../../services/activityLog'
import {
  fetchBudgets,
  deleteBudget,
  loadBudgetSuggestion,
  saveBudget
} from '../../services/budgetsSheet'
import { getSettings } from '../../services/settings'
import { requireAuth } from '../../utils/authGuard'
import { confirmDelete } from '../../utils/confirmDelete'
import { formatPersianNumber } from '../../utils/formatMoney'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import Button from '../ui/Button'
import { formHintClass } from '../ui/formStyles'

/**
 * «بودجه ماهانه «خوراک»»: one amount, the 3-month average (prefilled when there is no
 * budget yet), save and delete. Opened from «تحلیل این ماه», «نمودارها», Settings and
 * the category page.
 */
export default function BudgetSheet({
  category,
  onClose
}: {
  /** Open while set. */
  category: string | null
  onClose: () => void
}) {
  const [amount, setAmount] = useState<number | ''>('')
  const [current, setCurrent] = useState(0)
  const [suggestion, setSuggestion] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const settings = getSettings()

    if (!category || !settings?.spreadsheetId) return

    let live = true

    setAmount('')
    setCurrent(0)
    setSuggestion(0)
    void Promise.all([
      fetchBudgets(settings.spreadsheetId),
      loadBudgetSuggestion(settings, category).catch(() => 0)
    ]).then(([budgets, average]) => {
      if (!live) return

      const existing = budgets.find(item => item.category === category)?.amount ?? 0

      setCurrent(existing)
      setSuggestion(average)
      setAmount(existing || average || '')
    })

    return () => {
      live = false
    }
  }, [category])

  /** `logged`: the new limit for the feed; 0 when the budget is removed. */
  const run = async (
    action: (spreadsheetId: string) => Promise<void>,
    done: string,
    logged: number
  ) => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId || !requireAuth()) return

    setSaving(true)
    try {
      await action(spreadsheetId)
      if (category) {
        logItemActivity(spreadsheetId, 'budget', 'budgets', category, category, { amount: logged })
      }
      showSuccess(done)
      onClose()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره بودجه' })
    } finally {
      setSaving(false)
    }
  }

  const removeBudget = async (name: string) => {
    const confirmed = await confirmDelete({
      label: `بودجهٔ «${name}»`,
      message: 'سقف ماهانهٔ این دسته برداشته می‌شود و هشدار بودجه‌اش دیگر نمی‌آید.'
    })

    if (confirmed) await run(id => deleteBudget(id, name), 'بودجه حذف شد', 0)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!category) return
    if (!(Number(amount) > 0)) {
      showError('مبلغ بودجه را وارد کنید')

      return
    }
    void run(id => saveBudget(id, category, Number(amount)), 'بودجه ذخیره شد', Number(amount))
  }

  const hint = [
    suggestion > 0 ? `میانگین ۳ ماه اخیرت: ${formatPersianNumber(suggestion)}.` : '',
    'هشدار در ۸۰٪ داخل جمع‌بندی شبانه.'
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <FormModal
      open={category != null}
      title={`بودجه ماهانه «${category ?? ''}»`}
      onClose={() => !saving && onClose()}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel="ذخیره"
    >
      <FormField label="مبلغ ماهانه" required>
        <AmountInput value={amount} onChange={setAmount} />
      </FormField>
      <p className={formHintClass}>{hint}</p>
      {current > 0 && category ? (
        <Button
          type="button"
          variant="danger"
          size="sm"
          className="self-start"
          disabled={saving}
          onClick={() => void removeBudget(category)}
        >
          حذف بودجه
        </Button>
      ) : null}
    </FormModal>
  )
}
