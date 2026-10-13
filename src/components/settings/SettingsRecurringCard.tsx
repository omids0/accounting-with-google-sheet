import { useCallback, useEffect, useState } from 'react'

import RecurringFormModal from './RecurringFormModal'
import { useDataRefresh } from '../../hooks/useDataRefresh'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { RECURRING_CHOICES } from '../../services/recurring'
import {
  deleteRecurringItem,
  exportRecurringCsv,
  fetchRecurringItems,
  importRecurringCsv,
  saveRecurringItem,
  stripRow
} from '../../services/recurringSheet'
import { getSettings } from '../../services/settings'
import type { RecurringItem } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { handleSheetError } from '../../utils/sheetError'
import { showSuccess } from '../../utils/toast'
import CardDeleteButton from '../CardDeleteButton'
import CardEditButton from '../CardEditButton'
import ConfirmActionModal from '../ConfirmActionModal'
import ConfirmDeleteModal from '../ConfirmDeleteModal'
import { ToggleSwitch } from '../form'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formHintClass } from '../ui/formStyles'
import { settingsVaultAssetMetaClass, settingsVaultAssetRowClass } from '../ui/settingsStyles'

const TYPE_LABEL = { income: 'درآمد', expense: 'هزینه' } as const

function modeTitle(item: RecurringItem): string {
  return RECURRING_CHOICES.find(choice => choice.id === item.mode)?.title ?? ''
}

/** «تکرارها»: every monthly item with فعال, edit and delete, plus CSV of the tab. */
export default function SettingsRecurringCard() {
  const revision = useDataRefresh()
  const [items, setItems] = useState<RecurringItem[]>([])
  const [editing, setEditing] = useState<RecurringItem | null>(null)
  const [deleting, setDeleting] = useState<RecurringItem | null>(null)
  const [saving, setSaving] = useState(false)
  const { handleExport, handleImport, importExportConfirmModal } = useSheetImportExport({
    exportFn: exportRecurringCsv,
    importFn: importRecurringCsv
  })

  useEffect(() => {
    const spreadsheetId = getSettings()?.spreadsheetId

    if (!spreadsheetId) return

    let live = true

    void fetchRecurringItems(spreadsheetId).then(rows => live && setItems(rows.map(stripRow)))

    return () => {
      live = false
    }
  }, [revision])

  const run = useCallback(
    async (action: (spreadsheetId: string) => Promise<void>, done?: string) => {
      const spreadsheetId = getSettings()?.spreadsheetId

      if (!spreadsheetId || !requireAuth()) return false

      setSaving(true)
      try {
        await action(spreadsheetId)
        if (done) showSuccess(done)

        return true
      } catch (err) {
        handleSheetError(err, { fallbackMessage: 'تغییر تکرار ذخیره نشد' })

        return false
      } finally {
        setSaving(false)
      }
    },
    []
  )

  return (
    <Card>
      <p className={formHintClass}>
        تراکنش‌هایی که هر ماه تکرار می‌شوند. از پیام «ذخیره شد» یا فرم ویرایش رکورد با «تکرار
        ماهانه» اضافه می‌شوند؛ حالت یادآوری اول ماه در داشبورد می‌آید و حالت خودکار با باز شدن اپ
        ثبت می‌شود.
      </p>

      {items.map(item => (
        <div key={item.id} className={settingsVaultAssetRowClass(item.active)}>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.85rem] font-semibold">
              {item.title || item.category}
            </div>
            <div className={settingsVaultAssetMetaClass}>
              <span>
                {`${TYPE_LABEL[item.type]} · `}
                <MoneyText amount={item.amount} />
              </span>
              <span>{`روز ${item.dayOfMonth.toLocaleString('fa-IR')} · ${modeTitle(item)}`}</span>
            </div>
          </div>
          <ToggleSwitch
            checked={item.active}
            disabled={saving}
            label={`فعال: ${item.title || item.category}`}
            onChange={active => void run(id => saveRecurringItem(id, { ...item, active }))}
          />
          <CardEditButton onClick={() => setEditing(item)} ariaLabel={`ویرایش ${item.title}`} />
          <CardDeleteButton onClick={() => setDeleting(item)} />
        </div>
      ))}
      {!items.length ? <p className={formHintClass}>هنوز تکراری تعریف نشده.</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          خروجی CSV
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleImport}>
          ورود از CSV
        </Button>
      </div>

      <RecurringFormModal
        item={editing}
        saving={saving}
        onClose={() => setEditing(null)}
        onSave={next =>
          void run(id => saveRecurringItem(id, next), 'تکرار ذخیره شد').then(
            ok => ok && setEditing(null)
          )
        }
      />
      <ConfirmDeleteModal
        open={!!deleting}
        message={`تکرار «${
          deleting?.title || deleting?.category || ''
        }» حذف شود؟ رکوردهای ثبت‌شده می‌مانند.`}
        deleting={saving}
        onClose={() => setDeleting(null)}
        onConfirm={() =>
          deleting &&
          void run(id => deleteRecurringItem(id, deleting.id), 'تکرار حذف شد').then(() =>
            setDeleting(null)
          )
        }
      />
      <ConfirmActionModal {...importExportConfirmModal} />
    </Card>
  )
}
