import { useEffect, useState } from 'react'

import { CHARGE_TO_OPTIONS } from './buildingOptions'
import type { ChargeTo, ManagedItem } from '../../services/buildingLists'
import { FormField, FormSelect } from '../form'
import FormModal from '../FormModal'

interface ManagedItemSheetProps {
  open: boolean
  /** The value being renamed; null for a new one. */
  item: ManagedItem | null
  /** Kinds carry «سهم هر واحد به نام»; payers are just a name. */
  withChargeTo: boolean
  /** What is being edited, in the title: «نوع هزینه» / «پرداخت‌کننده». */
  noun: string
  saving: boolean
  onSave: (label: string, chargeTo: ChargeTo) => Promise<boolean>
  onClose: () => void
}

/** «+ نوع هزینهٔ جدید» and «تغییر نام»: a name and, for kinds, who the unit share is addressed to. */
export default function ManagedItemSheet({
  open,
  item,
  withChargeTo,
  noun,
  saving,
  onSave,
  onClose
}: ManagedItemSheetProps) {
  const [label, setLabel] = useState('')
  const [chargeTo, setChargeTo] = useState<ChargeTo>('resident')

  useEffect(() => {
    if (!open) return
    setLabel(item?.label ?? '')
    setChargeTo(item?.chargeTo ?? 'resident')
  }, [open, item])

  return (
    <FormModal
      open={open}
      title={item ? `ویرایش ${noun}` : `${noun} جدید`}
      onClose={onClose}
      saving={saving}
      saveDisabled={!label.trim()}
      saveLabel={item ? 'ذخیره' : 'افزودن'}
      onSubmit={event => {
        event.preventDefault()
        return onSave(label, chargeTo).then(done => done && onClose())
      }}
    >
      <FormField label="نام" required>
        <input
          value={label}
          onChange={event => setLabel(event.target.value)}
          placeholder={withChargeTo ? 'مثلاً: تعمیرات فوری' : 'مثلاً: عضو هیئت مدیره'}
          autoComplete="off"
        />
      </FormField>
      {withChargeTo ? (
        <FormSelect
          label="سهم هر واحد به نام"
          value={chargeTo}
          onChange={value => setChargeTo(value as ChargeTo)}
          options={CHARGE_TO_OPTIONS}
          hint="هزینه‌ای از این نوع که بین واحدها تقسیم شود، به نام مالک یا ساکن واحد می‌آید."
        />
      ) : null}
    </FormModal>
  )
}
