import AmountInput from '../AmountInput'
import { CategorySelect, FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { DangFormState, DangWithRow } from './types'

export type DangFormModalProps = {
  open: boolean
  editingItem: DangWithRow | null
  form: DangFormState
  saving: boolean
  categories: string[]
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  onFormChange: (updater: (prev: DangFormState) => DangFormState) => void
  onCategoriesChange: (categories: string[]) => void
  onReauth?: () => void
}

export default function DangFormModal({
  open,
  editingItem,
  form,
  saving,
  categories,
  onClose,
  onSubmit,
  onFormChange,
  onCategoriesChange,
  onReauth
}: DangFormModalProps) {
  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش بدهی' : 'ثبت بدهی جدید'}
      onClose={onClose}
      onSubmit={onSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره بدهی'}
    >
      <FormField label="عنوان" required>
        <input
          type="text"
          value={form.title}
          onChange={e => onFormChange(f => ({ ...f, title: e.target.value }))}
          placeholder="مثلاً: خرید از فروشگاه"
        />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={form.category}
          onChange={category => onFormChange(f => ({ ...f, category }))}
          categories={categories}
          categoryScope="dang"
          onCategoriesChange={next => {
            onCategoriesChange(next)
            if (!next.includes(form.category)) {
              onFormChange(f => ({ ...f, category: next[0] ?? '' }))
            }
          }}
          onReauth={onReauth}
          aria-label="دسته‌بندی بدهی"
        />
      </FormField>

      <FormField label="طرف حساب" required>
        <input
          type="text"
          value={form.counterparty}
          onChange={e => onFormChange(f => ({ ...f, counterparty: e.target.value }))}
          placeholder="نام شخص یا گروه"
        />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput
          value={form.amount}
          onChange={val => onFormChange(f => ({ ...f, amount: val }))}
        />
      </FormField>

      <FormField label="تاریخ" required>
        <JalaliDatePicker
          value={form.date}
          onChange={date => onFormChange(f => ({ ...f, date }))}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={form.note}
          onChange={e => onFormChange(f => ({ ...f, note: e.target.value }))}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
