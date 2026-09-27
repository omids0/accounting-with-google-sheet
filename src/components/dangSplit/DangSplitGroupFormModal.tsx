import { useMemo, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'

import type { DangSplitGroupFormState, DangSplitGroupWithRow } from './types'
import { useModalFormReset } from '../../hooks/useModalFormReset'
import { formFieldError, requiredField, submitValidatedForm } from '../../utils/formValidation'
import { FormField } from '../form'
import FormModal from '../FormModal'

export default function DangSplitGroupFormModal({
  open,
  editingItem,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean
  editingItem: DangSplitGroupWithRow | null
  saving: boolean
  onClose: () => void
  onSubmit: (values: DangSplitGroupFormState) => void | Promise<void>
}) {
  const initialValues = useMemo<DangSplitGroupFormState>(
    () =>
      editingItem
        ? { title: editingItem.title, description: editingItem.description }
        : { title: '', description: '' },
    [editingItem]
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<DangSplitGroupFormState>({ defaultValues: initialValues, mode: 'onSubmit' })

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
      title={editingItem ? 'ویرایش گروه دنگ' : 'گروه دنگ جدید'}
      onClose={onClose}
      onSubmit={onFormSubmit}
      saving={saving}
      saveLabel={editingItem ? 'ذخیره تغییرات' : 'ذخیره گروه'}
    >
      <FormField
        label="عنوان گروه"
        required
        controlWidth="full"
        error={formFieldError(errors, 'title')}
      >
        <input
          type="text"
          {...register('title', requiredField('عنوان گروه'))}
          placeholder="مثلاً: سفر شمال"
        />
      </FormField>

      <FormField label="توضیحات" controlWidth="full">
        <textarea {...register('description')} placeholder="توضیحات اختیاری" />
      </FormField>
    </FormModal>
  )
}
