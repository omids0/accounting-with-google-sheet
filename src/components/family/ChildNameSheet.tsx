import { useEffect, useState } from 'react'

import { renameChild, type ChildRecord } from '../../services/childrenRegistry'
import { FormField } from '../form'
import FormModal from '../FormModal'
import { journeyNoteClass } from '../ui/buildingStyles'
import { formErrorClass } from '../ui/formStyles'

interface ChildNameSheetProps {
  /** The child being named; null = closed. */
  child: ChildRecord | null
  /** First connection: the name is asked for right after «اتصال حساب فرزند». */
  isNew?: boolean
  onClose: () => void
  onSaved: () => void
}

/** «تغییر نام» of a child (also the first question after connecting one): the name the list shows. */
export default function ChildNameSheet({
  child,
  isNew = false,
  onClose,
  onSaved
}: ChildNameSheetProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setName(child?.name ?? '')
    setError(null)
  }, [child])

  return (
    <FormModal
      open={child !== null}
      title={isNew ? 'نام فرزند' : 'تغییر نام'}
      onClose={onClose}
      onSubmit={event => {
        event.preventDefault()

        if (!child) return
        if (!name.trim()) {
          setError('نام را وارد کنید')

          return
        }
        renameChild(child.id, name)
        onSaved()
        onClose()
      }}
      saveLabel="ذخیره"
      cancelLabel={isNew ? 'بعداً' : 'انصراف'}
    >
      {isNew ? (
        <p className={journeyNoteClass}>
          حساب وصل شد. یک نام بگذارید تا در فهرست بشناسیدش؛ بعداً هم می‌شود عوضش کرد.
        </p>
      ) : null}
      <FormField label="نام فرزند">
        <input
          value={name}
          onChange={event => setName(event.target.value)}
          maxLength={40}
          autoComplete="off"
        />
      </FormField>
      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
    </FormModal>
  )
}
