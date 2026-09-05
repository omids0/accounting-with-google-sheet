import FormFieldEditor from './FormFieldEditor'
import type { CustomForm, FieldConfig } from '../../types'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'
import { formGroupClass } from '../ui/formControlStyles'
import { formControlClassName, formLabelClass } from '../ui/formStyles'
import { formListHeaderClass, formListItemClass, formTypeBadgeClass } from '../ui/settingsStyles'

type SettingsCustomFormsCardProps = {
  forms: CustomForm[]
  categoriesKey: number
  editingFormId: string | null
  loading: boolean
  onToggleEditForm: (formId: string) => void
  onSaveCategories: (formId: string, categoriesText: string) => void
  onSaveFormFields: (formId: string, fields: FieldConfig[]) => void
}

export default function SettingsCustomFormsCard({
  forms,
  categoriesKey,
  editingFormId,
  loading,
  onToggleEditForm,
  onSaveCategories,
  onSaveFormFields
}: SettingsCustomFormsCardProps) {
  return (
    <Card>
      <CardTitle>فرم‌های سفارشی</CardTitle>

      {forms.map(form => (
        <div key={form.id} className={formListItemClass}>
          <div className={formListHeaderClass}>
            <strong>{form.name}</strong>
            <span className={formTypeBadgeClass}>{form.sheetName}</span>
          </div>

          {form.type !== 'custom' && form.fields.find(f => f.id === 'category') && (
            <div className={formGroupClass} style={{ marginTop: '0.5rem' }}>
              <label className={formLabelClass}>دسته‌بندی‌های {form.name}</label>
              <input
                key={`${form.id}-${categoriesKey}`}
                className={formControlClassName()}
                defaultValue={form.fields.find(f => f.id === 'category')?.options?.join('، ') ?? ''}
                onBlur={e => onSaveCategories(form.id, e.target.value)}
                placeholder="دسته۱، دسته۲، ..."
                disabled={loading}
              />
              <p
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--color-text-muted)',
                  marginTop: '0.5rem'
                }}
              >
                در برگه «دسته‌بندی‌ها» گوگل شیت ذخیره می‌شود و روی همه دستگاه‌ها یکسان است.
              </p>
            </div>
          )}

          {form.type === 'custom' && (
            <Button
              variant="secondary"
              size="sm"
              style={{ marginTop: '0.5rem' }}
              onClick={() => onToggleEditForm(form.id)}
            >
              {editingFormId === form.id ? 'بستن' : 'ویرایش فیلدها'}
            </Button>
          )}

          {editingFormId === form.id && (
            <FormFieldEditor
              fields={form.fields}
              onSave={fields => onSaveFormFields(form.id, fields)}
            />
          )}
        </div>
      ))}
    </Card>
  )
}
