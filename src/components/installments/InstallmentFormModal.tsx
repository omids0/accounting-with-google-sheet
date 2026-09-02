import { formatIsoDatePersian } from '../../utils/jalaliDate'
import AmountInput from '../AmountInput'
import { FormField } from '../form'
import FormModal from '../FormModal'
import JalaliDatePicker from '../JalaliDatePicker'
import type { InstallmentFormState, PlanWithRow } from './types'

type InstallmentFormModalProps = {
  open: boolean
  editingPlan: PlanWithRow | null
  form: InstallmentFormState
  setForm: React.Dispatch<React.SetStateAction<InstallmentFormState>>
  computedEndDate: string
  saving: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export default function InstallmentFormModal({
  open,
  editingPlan,
  form,
  setForm,
  computedEndDate,
  saving,
  onClose,
  onSubmit
}: InstallmentFormModalProps) {
  return (
    <FormModal
      open={open}
      title={editingPlan ? 'ویرایش قسط' : 'ثبت قسط جدید'}
      onClose={onClose}
      onSubmit={onSubmit}
      saving={saving}
      saveLabel={editingPlan ? 'ذخیره تغییرات' : 'ذخیره قسط'}
    >
      <FormField label="عنوان قسط" required>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="مثلاً: وام بانکی"
        />
      </FormField>

      <FormField label="مبلغ قسط" required>
        <AmountInput value={form.amount} onChange={val => setForm(f => ({ ...f, amount: val }))} />
      </FormField>

      <FormField label="تعداد بازپرداخت" required>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={form.count === '' ? '' : form.count}
          onChange={e =>
            setForm(f => ({
              ...f,
              count: e.target.value === '' ? '' : Number(e.target.value)
            }))
          }
          dir="ltr"
        />
      </FormField>

      <FormField label="تاریخ شروع قسط" required>
        <JalaliDatePicker
          value={form.startDate}
          onChange={date => setForm(f => ({ ...f, startDate: date }))}
        />
      </FormField>

      <FormField
        label="موعد قسط در ماه"
        required
        hint="روز پرداخت هر قسط در ماه (مثلاً ۵ برای پنجم هر ماه)"
      >
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={form.dueDay === '' ? '' : form.dueDay}
          onChange={e =>
            setForm(f => ({
              ...f,
              dueDay: e.target.value === '' ? '' : Number(e.target.value)
            }))
          }
          dir="ltr"
          placeholder="۱ تا ۳۱"
        />
      </FormField>

      {computedEndDate ? (
        <div className="form-group">
          <span className="form-field-label-text">تاریخ پایان قسط</span>
          <div className="form-readonly-value">{formatIsoDatePersian(computedEndDate)}</div>
          <p className="form-hint">
            بر اساس تاریخ شروع، تعداد بازپرداخت و موعد ماهانه محاسبه می‌شود
          </p>
        </div>
      ) : null}

      <FormField
        label="پرداخت‌شده تا تاریخ"
        hint="اقساطی که موعد آن‌ها تا این تاریخ است به‌عنوان پرداخت‌شده ثبت می‌شوند"
      >
        <JalaliDatePicker
          value={form.paidUntil}
          onChange={date => setForm(f => ({ ...f, paidUntil: date }))}
          allowEmpty
          emptyLabel="هنوز پرداختی ثبت نشده"
        />
      </FormField>
      {form.paidUntil ? (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setForm(f => ({ ...f, paidUntil: '' }))}
        >
          پاک کردن
        </button>
      ) : null}

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
