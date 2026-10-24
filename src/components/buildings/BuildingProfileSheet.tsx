import { useEffect, useState } from 'react'

import {
  CHARGE_METHODS,
  DAYS_1_28,
  VACANCY_RULES,
  type ChargeMethod,
  type VacancyRule
} from './buildingOptions'
import { profileError, saveBuildingProfile } from '../../services/buildingProfileActions'
import type { BuildingProfile } from '../../services/buildingTemplate'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { showError, showSuccess } from '../../utils/toast'
import { toUserMessage } from '../../utils/userMessage'
import AmountField from '../AmountField'
import { FormField, FormRow, FormSelect } from '../form'
import FormModal from '../FormModal'
import { journeyNoteClass } from '../ui/buildingStyles'

export type ProfilePart = 'details' | 'charge'

interface BuildingProfileSheetProps {
  /** Which row of the settings opened it; null = closed. */
  part: ProfilePart | null
  spreadsheetId: string
  profile: BuildingProfile
  onClose: () => void
}

/**
 * «مشخصات» (name, address, floors) and «شارژ» (default charge, method, issue and due day, vacancy
 * rule) of the building settings: both edit the one profile row of «ساختمان».
 */
export default function BuildingProfileSheet({
  part,
  spreadsheetId,
  profile,
  onClose
}: BuildingProfileSheetProps) {
  const [draft, setDraft] = useState(profile)
  const [floors, setFloors] = useState(String(profile.floors))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (part) {
      setDraft(profile)
      setFloors(String(profile.floors))
    }
  }, [part, profile])

  const set = (patch: Partial<BuildingProfile>) => setDraft(current => ({ ...current, ...patch }))

  const save = async () => {
    const next = { ...draft, floors: Math.trunc(Number(floors)) || 0 }

    const error = profileError(next)

    if (error) {
      showError(error)

      return
    }

    setSaving(true)
    try {
      await saveBuildingProfile(spreadsheetId, next)
      showSuccess('ذخیره شد')
      onClose()
    } catch (err) {
      showError(toUserMessage(err, 'ذخیره نشد'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal
      open={part !== null}
      title={part === 'charge' ? 'شارژ' : 'مشخصات ساختمان'}
      onClose={onClose}
      saving={saving}
      saveLabel="ذخیره"
      onSubmit={event => {
        event.preventDefault()
        return save()
      }}
    >
      {part === 'details' ? (
        <>
          <FormField label="نام ساختمان" required>
            <input
              value={draft.name}
              onChange={event => set({ name: event.target.value })}
              autoComplete="off"
            />
          </FormField>
          <FormField label="نشانی">
            <input
              value={draft.address}
              onChange={event => set({ address: event.target.value })}
              autoComplete="off"
            />
          </FormField>
          <FormField label="تعداد طبقه" required>
            <input
              value={floors}
              onChange={event => setFloors(normalizeDigits(event.target.value))}
              inputMode="numeric"
              autoComplete="off"
            />
          </FormField>
          <p className={journeyNoteClass}>
            نام ساختمان فقط داخل اپ عوض می‌شود؛ نام فایل در گوگل‌درایو همان می‌ماند.
          </p>
        </>
      ) : (
        <>
          <FormField label="شارژ ماهانه برای هر واحد">
            <AmountField
              label="شارژ ماهانه"
              value={draft.defaultCharge}
              onChange={value => set({ defaultCharge: Number(value) || 0 })}
            />
          </FormField>
          <FormSelect
            label="روش محاسبه شارژ"
            value={draft.chargeMethod}
            onChange={value => set({ chargeMethod: value as ChargeMethod })}
            options={CHARGE_METHODS}
            hint={CHARGE_METHODS.find(item => item.value === draft.chargeMethod)?.hint}
          />
          <FormRow>
            <FormSelect
              label="روز صدور شارژ (هر ماه)"
              value={String(draft.issueDay)}
              onChange={value => set({ issueDay: Number(value) })}
              options={DAYS_1_28}
            />
            <FormSelect
              label="سررسید پرداخت (روز، هر ماه)"
              value={String(draft.dueDay)}
              onChange={value => set({ dueDay: Number(value) })}
              options={DAYS_1_28}
            />
          </FormRow>
          <FormSelect
            label="واحد خالی"
            value={draft.vacancyRule}
            onChange={value => set({ vacancyRule: value as VacancyRule })}
            options={VACANCY_RULES}
          />
          <p className={journeyNoteClass}>
            با تغییر روش، شارژ واحدها در صدور بعدی با قاعدهٔ جدید حساب می‌شود؛ شارژهای صادرشده تغییر
            نمی‌کنند.
          </p>
        </>
      )}
    </FormModal>
  )
}
