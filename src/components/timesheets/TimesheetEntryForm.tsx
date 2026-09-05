import { formatDurationFa } from '../../utils/datetime'
import FormField from '../form/FormField'
import JalaliDateTimePicker from '../JalaliDateTimePicker'
import { formNoteTextareaClass } from '../ui/formControlStyles'
import { formControlClassName } from '../ui/formStyles'
import { formFieldNoteClass } from '../ui/recordsStyles'

interface TimesheetEntryFormProps {
  form: {
    title: string
    startAt: string
    endAt: string
    description: string
  }
  durationMinutes: number
  endPickerOpenToken: number
  onFormChange: (patch: Partial<TimesheetEntryFormProps['form']>) => void
  onStartChange: (startAt: string) => void
  onEndChange: (endAt: string) => void
}

export default function TimesheetEntryForm({
  form,
  durationMinutes,
  endPickerOpenToken,
  onFormChange,
  onStartChange,
  onEndChange
}: TimesheetEntryFormProps) {
  return (
    <>
      <FormField label="عنوان" required>
        <input
          type="text"
          className={formControlClassName()}
          value={form.title}
          onChange={e => onFormChange({ title: e.target.value })}
          placeholder="مثلاً: جلسه با مشتری"
          autoFocus
        />
      </FormField>

      <FormField label="از ساعت" required>
        <JalaliDateTimePicker value={form.startAt} onChange={onStartChange} />
      </FormField>

      <FormField label="تا ساعت" required>
        <JalaliDateTimePicker
          value={form.endAt}
          onChange={onEndChange}
          minDateTime={form.startAt}
          openRequestToken={endPickerOpenToken}
        />
      </FormField>

      <FormField label="بازه زمان">
        <input
          type="text"
          className={formControlClassName()}
          value={formatDurationFa(durationMinutes)}
          disabled
          readOnly
        />
      </FormField>

      <FormField label="توضیحات" className={formFieldNoteClass}>
        <textarea
          className={formControlClassName(formNoteTextareaClass)}
          rows={4}
          value={form.description}
          onChange={e => onFormChange({ description: e.target.value })}
          placeholder="توضیحات اضافه..."
        />
      </FormField>
    </>
  )
}
