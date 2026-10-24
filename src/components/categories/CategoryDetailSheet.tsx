import { type FormEvent, useEffect, useState } from 'react'

import CategoryRewriteProgress from './CategoryRewriteProgress'
import CategorySubcategoryEditor from './CategorySubcategoryEditor'
import type { CategoryItem } from './useCategoriesPage'
import type { RewriteProgress } from '../../services/categoryRewrite'
import { formatPersianNumber } from '../../utils/formatMoney'
import { FormField } from '../form'
import FormModal from '../FormModal'
import Button from '../ui/Button'
import {
  categorySheetActionsClass,
  categorySheetLabelClass,
  categorySheetRowClass,
  categorySheetValueClass
} from '../ui/categoryPageStyles'

interface CategoryDetailSheetProps {
  item: CategoryItem | null
  /** The budget row: expense categories only. */
  showBudget: boolean
  busy: boolean
  progress: RewriteProgress | null
  onClose: () => void
  onRename: (from: string, to: string) => Promise<boolean>
  onOpenBudget: (name: string) => void
  onSaveSubcategories: (category: string, list: string[]) => Promise<boolean>
  onRenameSubcategory: (category: string, from: string, to: string) => Promise<boolean>
  onMerge: (name: string) => void
  onDelete: (name: string) => void
}

/**
 * Tap on a category: name, monthly budget, subcategories, «ادغام در دسته دیگر…» and
 * «حذف». A bottom sheet on phones, the side panel next to the table on desktop.
 */
export default function CategoryDetailSheet({
  item,
  showBudget,
  busy,
  progress,
  onClose,
  onRename,
  onOpenBudget,
  onSaveSubcategories,
  onRenameSubcategory,
  onMerge,
  onDelete
}: CategoryDetailSheetProps) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (item) setName(item.name)
  }, [item?.name]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!item) return
    if (item.fixed || name.trim() === item.name) {
      onClose()

      return
    }
    if (await onRename(item.name, name)) onClose()
  }

  return (
    <FormModal
      open={item != null}
      title={item?.name ?? ''}
      onClose={() => !busy && onClose()}
      onSubmit={handleSubmit}
      saving={busy}
      saveLabel={item?.fixed ? 'بستن' : 'ذخیره'}
      variant="panel"
    >
      {item ? (
        <>
          <FormField
            label="نام"
            hint={
              item.system
                ? 'دسته سیستمی است؛ نامش ثابت می‌ماند. زیردسته‌ها و بودجه‌اش قابل ویرایش است.'
                : item.usage.total
                ? `تغییر نام، ${formatPersianNumber(item.usage.total)} رکورد را هم به‌روز می‌کند.`
                : undefined
            }
          >
            <input
              type="text"
              value={name}
              onChange={event => setName(event.target.value)}
              disabled={item.fixed || busy}
              aria-label="نام دسته"
            />
          </FormField>

          {showBudget ? (
            <div className={categorySheetRowClass}>
              <span className={categorySheetLabelClass}>بودجه ماهانه</span>
              <span className={categorySheetValueClass}>
                {item.budget ? formatPersianNumber(item.budget) : 'تعیین نشده'}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => onOpenBudget(item.name)}
              >
                {item.budget ? 'ویرایش' : 'تعیین بودجه'}
              </Button>
            </div>
          ) : null}

          {item.subcategories ? (
            <FormField label="زیردسته‌ها" controlWidth="full">
              <CategorySubcategoryEditor
                category={item.name}
                subcategories={item.subcategories}
                busy={busy}
                onSave={list => onSaveSubcategories(item.name, list)}
                onRename={(from, to) => onRenameSubcategory(item.name, from, to)}
              />
            </FormField>
          ) : null}

          <CategoryRewriteProgress progress={progress} />

          {!item.fixed ? (
            <div className={categorySheetActionsClass}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => onMerge(item.name)}
              >
                ادغام در دسته دیگر…
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={busy}
                onClick={() => onDelete(item.name)}
              >
                حذف
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </FormModal>
  )
}
