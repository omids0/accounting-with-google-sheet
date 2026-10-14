import { useEffect, useMemo, useState } from 'react'

import type { SmsCategoryChoice } from '../../services/bankSmsSuggest'
import { readCategoryList, readSubcategoryList } from '../../services/categoryManage'
import FormField from '../form/FormField'
import PickerSheet from '../form/PickerSheet'
import ToggleChipGroup from '../ToggleChipGroup'
import { smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'

type BankSmsCategorySheetProps = {
  open: boolean
  type: 'income' | 'expense'
  current: (SmsCategoryChoice & { title?: string }) | null
  /** Shown in the «عنوان» field while it is empty: what is saved when left blank. */
  defaultTitle: string
  onClose: () => void
  onPick: (choice: SmsCategoryChoice & { title: string }) => void
}

/** «دسته: خوراک ▾»: pick the category, subcategory and title this SMS is saved with. */
export default function BankSmsCategorySheet({
  open,
  type,
  current,
  defaultTitle,
  onClose,
  onPick
}: BankSmsCategorySheetProps) {
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [title, setTitle] = useState('')

  useEffect(() => {
    if (!open) return
    setCategory(current?.category ?? '')
    setSubCategory(current?.subCategory ?? '')
    setTitle(current?.title ?? '')
  }, [open, current?.category, current?.subCategory, current?.title])

  const categories = useMemo(() => (open ? readCategoryList(type) : []), [open, type])
  const subcategories = useMemo(
    () => (category ? readSubcategoryList(type, category) : []),
    [type, category]
  )

  return (
    <PickerSheet
      open={open}
      title={type === 'expense' ? 'دسته و عنوان هزینه' : 'دسته و عنوان درآمد'}
      onClose={onClose}
      footer={
        <div className="flex gap-2 border-t border-border p-3">
          <Button
            type="button"
            disabled={!category}
            onClick={() => {
              onPick({ category, subCategory, title: title.trim() })
              onClose()
            }}
          >
            انتخاب
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            انصراف
          </Button>
        </div>
      }
    >
      <FormField label="عنوان" hint="خالی بگذاری، همان عنوان پیش‌فرض ثبت می‌شود.">
        <input
          type="text"
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder={defaultTitle}
        />
      </FormField>
      <ToggleChipGroup
        ariaLabel="دسته"
        options={categories.map(name => ({ id: name, label: name }))}
        selected={{ [category]: true }}
        onToggle={id => {
          setCategory(id)
          setSubCategory('')
        }}
      />
      {subcategories.length > 0 && (
        <>
          <p className={smsHintClass}>زیردسته (اختیاری)</p>
          <ToggleChipGroup
            ariaLabel="زیردسته"
            options={subcategories.map(name => ({ id: name, label: name }))}
            selected={{ [subCategory]: true }}
            onToggle={id => setSubCategory(current => (current === id ? '' : id))}
          />
        </>
      )}
    </PickerSheet>
  )
}
