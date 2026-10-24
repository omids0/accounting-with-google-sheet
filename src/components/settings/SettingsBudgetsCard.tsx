import { useCategoryBudgets } from '../../hooks/useCategoryBudgets'
import { useSheetImportExport } from '../../hooks/useSheetImportExport'
import { exportBudgetsCsv, importBudgetsCsv } from '../../services/budgetsSheet'
import BudgetSheet from '../budgets/BudgetSheet'
import CardEditButton from '../CardEditButton'
import ConfirmActionModal from '../ConfirmActionModal'
import MoneyText from '../MoneyText'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formHintClass } from '../ui/formStyles'
import { settingsVaultAssetMetaClass, settingsVaultAssetRowClass } from '../ui/settingsStyles'

/** «بودجه‌ها»: every monthly budget with edit, plus CSV of the «بودجه» tab. */
export default function SettingsBudgetsCard() {
  const { budgets, editing, openBudget, closeBudget } = useCategoryBudgets()
  const { handleExport, handleImport, importExportConfirmModal } = useSheetImportExport({
    exportFn: exportBudgetsCsv,
    importFn: importBudgetsCsv
  })

  return (
    <Card>
      <p className={formHintClass}>
        بودجه ماهانه هر دسته هزینه. از «تحلیل این ماه» یا صفحه نمودارها هم با زدن روی دسته تعیین
        می‌شود؛ رسیدن به ۸۰٪ و گذشتن از بودجه در جمع‌بندی شبانه می‌آید.
      </p>

      {[...budgets].map(([category, amount]) => (
        <div key={category} className={settingsVaultAssetRowClass(true)}>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[0.85rem] font-semibold">{category}</div>
            <div className={settingsVaultAssetMetaClass}>
              ماهانه <MoneyText amount={amount} />
            </div>
          </div>
          <CardEditButton onClick={() => openBudget(category)} label="بودجه" itemLabel={category} />
        </div>
      ))}
      {!budgets.size ? <p className={formHintClass}>هنوز بودجه‌ای تعیین نشده.</p> : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={handleExport}>
          خروجی CSV
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={handleImport}>
          ورود از CSV
        </Button>
      </div>

      <BudgetSheet category={editing} onClose={closeBudget} />
      <ConfirmActionModal {...importExportConfirmModal} />
    </Card>
  )
}
