import { useEffect, useState, type FormEvent } from 'react'

import DangSplitCategorySelect from './DangSplitCategorySelect'
import type { DangSplitCategoryWithRow, DangSplitPersonWithRow } from './types'
import { FormField } from '../form'
import FormModal from '../FormModal'

/** انتخاب دسته برای فردی که هنوز در هیچ دسته‌ای نیست */
export default function DangSplitAssignCategoryModal({
  open,
  person,
  groupId,
  categories,
  saving,
  onClose,
  onSubmit,
  onCategoriesSaved
}: {
  open: boolean
  person: DangSplitPersonWithRow | null
  groupId: string
  categories: DangSplitCategoryWithRow[]
  saving: boolean
  onClose: () => void
  onSubmit: (categoryId: string) => void
  onCategoriesSaved: () => Promise<void> | void
}) {
  const [categoryId, setCategoryId] = useState('')

  useEffect(() => {
    if (open) setCategoryId(person?.categoryId ?? '')
  }, [open, person])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit(categoryId)
  }

  if (!person) return null

  return (
    <FormModal
      open={open}
      title={`افزودن «${person.name}» به دسته`}
      onClose={onClose}
      onSubmit={handleSubmit}
      saving={saving}
      saveLabel="ذخیره دسته"
    >
      <FormField
        label="دسته"
        controlWidth="full"
        hint="اگر دسته‌ای نساخته‌ای، از همین‌جا با «مدیریت دسته‌ها» بساز"
      >
        <DangSplitCategorySelect
          groupId={groupId}
          categories={categories}
          value={categoryId}
          onChange={setCategoryId}
          onCategoriesSaved={onCategoriesSaved}
        />
      </FormField>
    </FormModal>
  )
}
