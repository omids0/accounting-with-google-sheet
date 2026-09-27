import { useMemo, type FormEvent } from 'react'
import { Controller, useForm } from 'react-hook-form'

import type {
  DangSplitCategoryWithRow,
  DangSplitPersonFormState,
  DangSplitPersonWithRow
} from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import { FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'

export default function DangSplitPersonFormModal({
  open,
  editingItem,
  categories,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean
  editingItem: DangSplitPersonWithRow | null
  categories: DangSplitCategoryWithRow[]
  saving: boolean
  onClose: () => void
  onSubmit: (values: DangSplitPersonFormState) => void | Promise<void>
}) {
  const initialValues = useMemo<DangSplitPersonFormState>(
    () =>
      editingItem
        ? {
            name: editingItem.name,
            categoryId: editingItem.categoryId,
            defaultWeight: editingItem.defaultWeight,
            note: editingItem.note
          }
        : { name: '', categoryId: '', defaultWeight: 1, note: '' },
    [editingItem]
  )

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'بدون دسته' },
      ...categories.map(category => ({ value: category.id, label: category.title }))
    ],
    [categories]
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DangSplitPersonFormState>({ defaultValues: initialValues, mode: 'onSubmit' })

  useModalFormReset(reset, initialValues, {
    active: open,
    resetKey: editingItem?.id ?? 'create'
  })

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    submitValidatedForm(handleSubmit, values => onSubmit(values), event)
  }

  return (
    <FormModal
      open={open}
      title={editingItem ? 'ویرایش فرد' : 'افزودن فرد'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'افزودن'}
    >
      <FormField label="نام" required controlWidth="full" error={formFieldError(errors, 'name')}>
        <input type="text" {...register('name', requiredField('نام'))} placeholder="مثلاً: علی" />
      </FormField>

      <FormRow>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <FormSelect
              label="دسته"
              hint="افراد یک خانواده یا تیم را در یک دسته بگذارید تا تخصیصشان یک‌جا انجام شود"
              value={field.value}
              onChange={field.onChange}
              options={categoryOptions}
              aria-label="دسته فرد"
            />
          )}
        />

        <FormField
          label="ضریب سهم"
          hint="پیش‌فرض ۱؛ اگر این فرد سهم دو نفر را می‌دهد، ۲ بگذارید"
          error={formFieldError(errors, 'defaultWeight')}
        >
          <input
            type="number"
            step="0.1"
            min="0.1"
            {...register('defaultWeight', { valueAsNumber: true })}
          />
        </FormField>
      </FormRow>

      <FormField label="یادداشت" controlWidth="full">
        <textarea {...register('note')} placeholder="یادداشت اختیاری" />
      </FormField>
    </FormModal>
  )
}
