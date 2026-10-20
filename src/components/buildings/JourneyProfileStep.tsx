import { normalizeDigits } from '../../utils/normalizeDigits'
import { FormField, FormRow } from '../form'
import type { ProfileDraft } from './journeyDraft'
import { journeyNoteClass } from '../ui/buildingStyles'
import Button from '../ui/Button'
import { formErrorClass } from '../ui/formStyles'

interface JourneyProfileStepProps {
  draft: ProfileDraft
  error: string | null
  onChange: (next: ProfileDraft) => void
  onNext: () => void
  onCancel: () => void
}

/** Journey step 1: name, address, floors, unit count and a note. The creator is always «مدیر». */
export default function JourneyProfileStep({
  draft,
  error,
  onChange,
  onNext,
  onCancel
}: JourneyProfileStepProps) {
  const set = (patch: Partial<ProfileDraft>) => onChange({ ...draft, ...patch })

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        onNext()
      }}
    >
      <FormField label="نام ساختمان" required>
        <input
          value={draft.name}
          onChange={event => set({ name: event.target.value })}
          placeholder="مثلاً: ساختمان نرگس"
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
      <FormRow>
        <FormField label="تعداد طبقه" required>
          <input
            value={draft.floors}
            onChange={event => set({ floors: normalizeDigits(event.target.value) })}
            inputMode="numeric"
            autoComplete="off"
          />
        </FormField>
        <FormField label="تعداد واحد" required>
          <input
            value={draft.units}
            onChange={event => set({ units: normalizeDigits(event.target.value) })}
            inputMode="numeric"
            autoComplete="off"
          />
        </FormField>
      </FormRow>
      <FormField label="یادداشت (اختیاری)">
        <textarea
          rows={2}
          value={draft.note}
          onChange={event => set({ note: event.target.value })}
        />
      </FormField>
      <p className={journeyNoteClass}>
        سازنده همیشه «مدیر» است؛ نقش پرسیده نمی‌شود. با «بعدی» هنوز چیزی ساخته نمی‌شود؛ شیت در پایان
        قدم ۲ ساخته می‌شود.
      </p>
      {error ? (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-4 flex flex-col gap-2">
        <Button type="submit">بعدی</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          انصراف
        </Button>
      </div>
    </form>
  )
}
