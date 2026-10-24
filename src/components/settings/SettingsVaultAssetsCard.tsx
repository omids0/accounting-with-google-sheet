import { useCallback, useEffect, useState } from 'react'

import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import {
  getVaultCatalog,
  isManualPriceStale,
  VAULT_ASSET_CLASSES
} from '../../services/treasuryCatalog'
import {
  exportVaultCatalogCsv,
  importVaultCatalogCsv,
  loadVaultCatalog,
  saveVaultAsset
} from '../../services/treasuryCatalogSheet'
import type { VaultAsset } from '../../types'
import { handleSheetError } from '../../utils/sheetError'
import CardEditButton from '../CardEditButton'
import ConfirmActionModal from '../ConfirmActionModal'
import { ToggleSwitch } from '../form'
import TreasuryAssetFormModal from '../treasury/TreasuryAssetFormModal'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formHintClass } from '../ui/formStyles'
import {
  settingsVaultAssetMetaClass,
  settingsVaultAssetRowClass,
  settingsVaultClassTitleClass
} from '../ui/settingsStyles'
import { treasuryStaleHintClass } from '../ui/treasuryReceivableStyles'

function assetMeta(asset: VaultAsset): string {
  const price = asset.priceSource === 'tgju' ? 'قیمت از tgju' : 'قیمت دستی'
  const decimals = `${asset.decimals.toLocaleString('fa-IR')} رقم اعشار`

  return [asset.symbol, asset.unit, decimals, price].filter(Boolean).join(' · ')
}

/** «دارایی‌های صندوقچه»: rename, decimals and manual price, deactivate; CSV of the catalog. */
export default function SettingsVaultAssetsCard({ spreadsheetId }: { spreadsheetId: string }) {
  const [catalog, setCatalog] = useState(getVaultCatalog)
  const [editing, setEditing] = useState<VaultAsset | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setCatalog(await loadVaultCatalog(spreadsheetId))
  }, [spreadsheetId])

  useEffect(() => {
    void reload()
  }, [reload])

  const { handleExport, handleImport, importExportConfirmModal } = useSheetImportExport({
    exportFn: exportVaultCatalogCsv,
    importFn: importVaultCatalogCsv,
    onComplete: reload
  })

  const toggleActive = async (asset: VaultAsset, active: boolean) => {
    setBusyId(asset.id)
    try {
      await saveVaultAsset(spreadsheetId, { ...asset, active })
      setCatalog(getVaultCatalog())
    } catch (err) {
      handleSheetError(err, { fallbackMessage: 'خطا در ذخیره دارایی' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Card>
      <p className={formHintClass}>
        نام، نماد، اعشار مقدار و قیمت دستی هر دارایی را اینجا عوض کنید. دارایی غیرفعال در فرم خرید
        نمی‌آید ولی موجودی‌اش در صندوقچه می‌ماند. دارایی تازه را از فرم «ثبت خرید» بسازید.
      </p>

      {VAULT_ASSET_CLASSES.map(({ id, label }) => {
        const assets = catalog.filter(asset => asset.assetClass === id)

        if (!assets.length) return null

        return (
          <section key={id} aria-label={label}>
            <h3 className={settingsVaultClassTitleClass}>{label}</h3>
            {assets.map(asset => (
              <div key={asset.id} className={settingsVaultAssetRowClass(asset.active)}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[0.85rem] font-semibold">{asset.name}</div>
                  <div className={settingsVaultAssetMetaClass}>
                    {assetMeta(asset)}
                    {isManualPriceStale(asset) && (
                      <span className={treasuryStaleHintClass}>قیمت را به‌روز کن</span>
                    )}
                  </div>
                </div>
                <CardEditButton onClick={() => setEditing(asset)} itemLabel={asset.name} />
                <ToggleSwitch
                  checked={asset.active}
                  disabled={busyId === asset.id}
                  onChange={active => void toggleActive(asset, active)}
                  label={`${asset.name} فعال`}
                />
              </div>
            ))}
          </section>
        )
      })}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          خروجی CSV
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleImport}>
          ورود از CSV
        </Button>
      </div>

      <TreasuryAssetFormModal
        asset={editing}
        onClose={() => setEditing(null)}
        onSaved={() => setCatalog(getVaultCatalog())}
      />
      <ConfirmActionModal {...importExportConfirmModal} />
    </Card>
  )
}
