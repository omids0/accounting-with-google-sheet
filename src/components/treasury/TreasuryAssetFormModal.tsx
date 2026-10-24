import { useEffect, useState } from 'react'

import { getSettings } from '../../services/settings'
import {
  getAssetClassLabel,
  MAX_QUANTITY_DECIMALS,
  normalizeDecimals
} from '../../services/treasuryCatalog'
import { saveVaultAsset } from '../../services/treasuryCatalogSheet'
import type { VaultAsset } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { getTodayIso } from '../../utils/jalaliDate'
import { handleSheetError } from '../../utils/sheetError'
import { showError, showSuccess } from '../../utils/toast'
import AmountInput from '../AmountInput'
import { CheckboxField, FormField, FormRow } from '../form'
import FormModal from '../FormModal'

/** Edit one catalog asset: name, symbol, unit, decimals, manual price, active. */
export default function TreasuryAssetFormModal({
  asset,
  onClose,
  onSaved
}: {
  /** Open while set. */
  asset: VaultAsset | null
  onClose: () => void
  onSaved: () => void
}) {
  const [draft, setDraft] = useState<VaultAsset | null>(asset)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (asset) setDraft(asset)
  }, [asset])

  const set = (patch: Partial<VaultAsset>) =>
    setDraft(current => (current ? { ...current, ...patch } : current))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const spreadsheetId = getSettings()?.spreadsheetId

    if (!asset || !draft || !spreadsheetId || !requireAuth()) return
    if (!draft.name.trim()) {
      showError('نام دارایی را وارد کنید')

      return
    }

    const priceChanged = draft.manualPrice !== asset.manualPrice

    setSaving(true)
    try {
      await saveVaultAsset(spreadsheetId, {
        ...draft,
        name: draft.name.trim(),
        symbol: draft.symbol.trim(),
        unit: draft.unit.trim(),
        decimals: normalizeDecimals(draft.decimals, asset.decimals),
        manualPriceAt: priceChanged ? getTodayIso() : draft.manualPriceAt
      })
      showSuccess('دارایی ذخیره شد')
      onSaved()
      onClose()
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره دارایی' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      open={asset != null}
      title={draft ? `${draft.name} · ${getAssetClassLabel(draft.assetClass)}` : 'دارایی'}
      onClose={() => !saving && onClose()}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel="ذخیره"
    >
      {draft && (
        <>
          <FormRow>
            <FormField label="نام" required>
              <input
                type="text"
                value={draft.name}
                onChange={event => set({ name: event.target.value })}
              />
            </FormField>
            <FormField label="نماد">
              <input
                type="text"
                value={draft.symbol}
                onChange={event => set({ symbol: event.target.value })}
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="واحد">
              <input
                type="text"
                value={draft.unit}
                onChange={event => set({ unit: event.target.value })}
              />
            </FormField>
            <FormField label="اعشار" hint={`رقم اعشار مقدار، ۰ تا ${MAX_QUANTITY_DECIMALS}`}>
              <input
                type="number"
                min={0}
                max={MAX_QUANTITY_DECIMALS}
                step={1}
                value={draft.decimals}
                onChange={event => set({ decimals: Number(event.target.value) })}
              />
            </FormField>
          </FormRow>
          {draft.priceSource === 'manual' ? (
            <FormField label="قیمت فعلی هر واحد" required>
              <AmountInput
                value={draft.manualPrice || ''}
                onChange={price => set({ manualPrice: Number(price) || 0 })}
              />
            </FormField>
          ) : null}
          <CheckboxField
            checked={draft.active}
            onChange={active => set({ active })}
            label="فعال"
            hint="دارایی غیرفعال در فرم خرید نمی‌آید؛ موجودی‌اش همچنان دیده می‌شود."
          />
        </>
      )}
    </FormModal>
  )
}
