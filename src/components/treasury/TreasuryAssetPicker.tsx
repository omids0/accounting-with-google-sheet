import { NEW_ASSET_OPTION, type VaultFormState } from './types'
import {
  DEFAULT_CLASS_DECIMALS,
  MAX_QUANTITY_DECIMALS,
  VAULT_ASSET_CLASSES,
  VAULT_ASSET_HINTS
} from '../../services/treasuryCatalog'
import type { LegacyVaultAssetId, VaultAsset, VaultAssetClass } from '../../types'
import AmountInput from '../AmountInput'
import { FormField, FormRow, FormSelect } from '../form'
import TransactionTypeSegment from '../TransactionTypeSegment'
import { formFieldClass, formLabelClass } from '../ui/formStyles'
import { treasuryHintClass } from '../ui/treasuryReceivableStyles'

const CLASS_OPTIONS = VAULT_ASSET_CLASSES.map(({ id, label }) => ({ id, label }))

/** Unit a new asset of each class starts with. */
const DEFAULT_CLASS_UNIT: Record<VaultAssetClass, string> = {
  gold: 'گرم',
  currency: '',
  stock: 'سهم',
  crypto: '',
  other: ''
}

export function emptyNewAsset(assetClass: VaultAssetClass): VaultFormState['newAsset'] {
  return {
    name: '',
    symbol: '',
    unit: DEFAULT_CLASS_UNIT[assetClass],
    decimals: DEFAULT_CLASS_DECIMALS[assetClass],
    price: 0
  }
}

/** First active asset of the class, or the «دارایی جدید…» option when it has none. */
export function defaultAssetForClass(catalog: VaultAsset[], assetClass: VaultAssetClass): string {
  return (
    catalog.find(asset => asset.active && asset.assetClass === assetClass)?.id ?? NEW_ASSET_OPTION
  )
}

type Patch = Partial<Pick<VaultFormState, 'assetClass' | 'assetType' | 'newAsset'>>

/** «کلاس» segmented, then the class's assets with an inline «دارایی جدید…». */
export default function TreasuryAssetPicker({
  catalog,
  value,
  allowNew,
  onChange
}: {
  catalog: VaultAsset[]
  value: Pick<VaultFormState, 'assetClass' | 'assetType' | 'newAsset'>
  /** Off when editing a purchase: it keeps an existing asset. */
  allowNew: boolean
  onChange: (patch: Patch) => void
}) {
  const { assetClass, assetType, newAsset } = value
  const options = catalog
    .filter(asset => asset.assetClass === assetClass && (asset.active || asset.id === assetType))
    .map(asset => ({ value: asset.id, label: asset.name }))

  if (allowNew) options.push({ value: NEW_ASSET_OPTION, label: 'دارایی جدید…' })

  const hint = VAULT_ASSET_HINTS[assetType as LegacyVaultAssetId]
  const setNew = (patch: Partial<VaultFormState['newAsset']>) =>
    onChange({ newAsset: { ...newAsset, ...patch } })

  return (
    <>
      <div className={formFieldClass}>
        <span className={formLabelClass}>کلاس</span>
        <TransactionTypeSegment
          ariaLabel="کلاس دارایی"
          options={CLASS_OPTIONS}
          value={assetClass}
          onChange={next => {
            const nextClass = next as VaultAssetClass

            onChange({
              assetClass: nextClass,
              assetType: allowNew ? defaultAssetForClass(catalog, nextClass) : assetType,
              newAsset: emptyNewAsset(nextClass)
            })
          }}
        />
      </div>

      <FormSelect
        label="دارایی"
        required
        value={assetType}
        onChange={next => onChange({ assetType: next })}
        options={options}
        hint={hint ? <p className={treasuryHintClass}>{hint}</p> : undefined}
      />

      {assetType === NEW_ASSET_OPTION && (
        <>
          <FormRow>
            <FormField label="نام" required>
              <input
                type="text"
                value={newAsset.name}
                onChange={event => setNew({ name: event.target.value })}
                placeholder="مثلاً فولاد"
              />
            </FormField>
            <FormField label="نماد">
              <input
                type="text"
                value={newAsset.symbol}
                onChange={event => setNew({ symbol: event.target.value })}
                placeholder="مثلاً USDT"
              />
            </FormField>
          </FormRow>
          <FormRow>
            <FormField label="واحد">
              <input
                type="text"
                value={newAsset.unit}
                onChange={event => setNew({ unit: event.target.value })}
                placeholder="مثلاً سهم"
              />
            </FormField>
            <FormField label="اعشار" hint={`رقم اعشار مقدار، ۰ تا ${MAX_QUANTITY_DECIMALS}`}>
              <input
                type="number"
                min={0}
                max={MAX_QUANTITY_DECIMALS}
                step={1}
                value={newAsset.decimals}
                onChange={event => setNew({ decimals: Number(event.target.value) })}
              />
            </FormField>
          </FormRow>
          <FormField label="قیمت فعلی هر واحد" required>
            <AmountInput
              value={newAsset.price || ''}
              onChange={price => setNew({ price: Number(price) || 0 })}
            />
          </FormField>
        </>
      )}
    </>
  )
}
