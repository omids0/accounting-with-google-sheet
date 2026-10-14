import { type FormEvent, useState } from 'react'

import type { CorrectionOptions } from '../../../services/bankSmsReconcile'
import { readCategoryList } from '../../../services/categoryManage'
import {
  SMS_RECONCILE_CATEGORY,
  lockedCategoriesFor,
  withLockedFormCategories
} from '../../../utils/protectedCategories'
import CategorySelect from '../../form/CategorySelect'
import FormField from '../../form/FormField'
import FormModal from '../../FormModal'
import MoneyText from '../../MoneyText'

type ReconcileCorrectionModalProps = {
  open: boolean
  /** App minus bank: positive = more in the app, so the record is an expense. */
  difference: number
  saving: boolean
  onClose: () => void
  onSubmit: (options: CorrectionOptions) => void
}

/** «تنظیم دستی موجودی»: pick the category (e.g. «کارمزد») and a note for the correction. */
export default function ReconcileCorrectionModal({
  open,
  difference,
  saving,
  onClose,
  onSubmit
}: ReconcileCorrectionModalProps) {
  const type = difference > 0 ? 'expense' : 'income'
  const [categories, setCategories] = useState(() =>
    withLockedFormCategories(type, readCategoryList(type))
  )
  const [category, setCategory] = useState(SMS_RECONCILE_CATEGORY)
  const [note, setNote] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({ category, note })
  }

  return (
    <FormModal
      open={open}
      title="تنظیم دستی موجودی"
      saveLabel={type === 'expense' ? 'ثبت هزینه' : 'ثبت درآمد'}
      saving={saving}
      onClose={onClose}
      onSubmit={handleSubmit}
    >
      <p className="m-0 text-[0.82rem] leading-[1.7] text-muted">
        یک {type === 'expense' ? 'هزینه' : 'درآمد'} به مبلغ{' '}
        <MoneyText amount={Math.abs(difference)} /> ثبت می‌شود تا موجودی اپ با بانک یکی شود. اگر
        اختلاف مثلاً کارمزد است، دستهٔ «کارمزد» را انتخاب کن.
      </p>
      <FormField label="دسته‌بندی">
        <CategorySelect
          value={category}
          onChange={setCategory}
          categories={categories}
          onCategoriesChange={setCategories}
          categoryScope={type}
          lockedCategories={lockedCategoriesFor(type)}
          disabled={saving}
        />
      </FormField>
      <FormField label="یادداشت">
        <textarea
          rows={2}
          value={note}
          onChange={event => setNote(event.target.value)}
          placeholder="مثلاً کارمزد جابجایی"
          disabled={saving}
        />
      </FormField>
    </FormModal>
  )
}
