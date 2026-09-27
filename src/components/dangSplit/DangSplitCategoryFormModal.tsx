import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import type { DangSplitCategoryFormState, DangSplitCategoryWithRow } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import { FormField } from '../form'
import FormModal from '../FormModal'

export default function DangSplitCategoryFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean
  editingItem: DangSplitCategoryWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: DangSplitCategoryFormState) => void | Promise<void>
}) {
  const initialValues = useMemo<DangSplitCategoryFormState>(
    () => ({ title: editingItem?.title ?? '' }),
    [editingItem]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DangSplitCategoryFormState>({ defaultValues: initialValues, mode: 'onSubmit' })

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
      title={editingItem ? 'ویرایش دسته' : 'افزودن دسته افراد'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'افزودن'}
    >
      <FormField
        label="عنوان دسته"
        required
        controlWidth="full"
        error={formFieldError(errors, 'title')}
      >
        <input
          type="text"
          {...register('title', requiredField('عنوان دسته'))}
          placeholder="مثلاً: خانواده احمدی"
        />
      </FormField>
    </FormModal>
  )
}
