import { useEffect, useMemo, useState } from 'react'

import type { SmsCategoryChoice } from '../../services/bankSmsSuggest'
import { readCategoryList, readSubcategoryList } from '../../services/categoryManage'
import PickerSheet from '../form/PickerSheet'
import ToggleChipGroup from '../ToggleChipGroup'
import { smsHintClass } from '../ui/bankSmsStyles'
import Button from '../ui/Button'

type BankSmsCategorySheetProps = {
  open: boolean
  type: 'income' | 'expense'
  current: SmsCategoryChoice | null
  onClose: () => void
  onPick: (choice: SmsCategoryChoice) => void
}

/** «دسته: خوراک ▾»: pick the category (and subcategory) this SMS is saved with. */
export default function BankSmsCategorySheet({
  open,
  type,
  current,
  onClose,
  onPick
}: BankSmsCategorySheetProps) {
  const [category, setCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')

  useEffect(() => {
    if (!open) return
    setCategory(current?.category ?? '')
    setSubCategory(current?.subCategory ?? '')
  }, [open, current?.category, current?.subCategory])

  const categories = useMemo(() => (open ? readCategoryList(type) : []), [open, type])
  const subcategories = useMemo(
    () => (category ? readSubcategoryList(type, category) : []),
    [type, category]
  )

  return (
    <PickerSheet
      open={open}
      title={type === 'expense' ? 'دسته هزینه' : 'دسته درآمد'}
      onClose={onClose}
      footer={
        <div className="flex gap-2 border-t border-border p-3">
          <Button
            type="button"
            disabled={!category}
            onClick={() => {
              onPick({ category, subCategory })
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
