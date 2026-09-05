import AmountInput from '../AmountInput'
import { CategorySelect, FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { ReceivableFormState, ReceivableWithRow } from './types'

type ReceivableFormModalProps = {
  open: boolean
  editingItem: ReceivableWithRow | null
  form: ReceivableFormState
  setForm: React.Dispatch<React.SetStateAction<ReceivableFormState>>
  categories: string[]
  setCategories: React.Dispatch<React.SetStateAction<string[]>>
  saving: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export default function ReceivableFormModal({
  open,
  editingItem,
  form,
  setForm,
  categories,
  setCategories,
  saving,
  onClose,
  onSubmit
}: ReceivableFormModalProps) {
  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش طلب' : 'ثبت طلب جدید'}
      onClose={onClose}
      onSubmit={onSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره طلب'}
    >
      <FormField label="نام شخص یا ارگان" required>
        <input
          type="text"
          value={form.debtor}
          onChange={e => setForm(f => ({ ...f, debtor: e.target.value }))}
          placeholder="مثلاً: علی محمدی"
        />
      </FormField>

      <FormField label="دسته‌بندی" required>
        <CategorySelect
          value={form.category}
          onChange={category => setForm(f => ({ ...f, category }))}
          categories={categories}
          categoryScope="receivable"
          onCategoriesChange={next => {
            setCategories(next)
            if (!next.includes(form.category)) {
              setForm(f => ({ ...f, category: next[0] ?? '' }))
            }
          }}
          aria-label="دسته‌بندی طلب"
        />
      </FormField>

      <FormField label="مبلغ" required>
        <AmountInput value={form.amount} onChange={val => setForm(f => ({ ...f, amount: val }))} />
      </FormField>

      <FormField label="تاریخ قرض گرفتن" required>
        <JalaliDatePicker
          value={form.borrowDate}
          onChange={iso => setForm(f => ({ ...f, borrowDate: iso }))}
        />
      </FormField>

      <FormField label="توضیحات">
        <textarea
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          placeholder="توضیحات اختیاری"
        />
      </FormField>
    </FormModal>
  )
}
