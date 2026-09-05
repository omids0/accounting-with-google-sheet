import { useState } from 'react'

import type { FieldConfig, FieldType } from '../../types'
import { FormField, FormSelect } from '../form'
import { FIELD_TYPES } from './types'
import Button from '../ui/Button'

type FormFieldEditorProps = {
  fields: FieldConfig[]
  onSave: (fields: FieldConfig[]) => void
}

export default function FormFieldEditor({ fields: initialFields, onSave }: FormFieldEditorProps) {
  const [fields, setFields] = useState(initialFields)

  const updateField = (index: number, updates: Partial<FieldConfig>) => {
    const updated = [...fields]

    updated[index] = { ...updated[index], ...updates }
    setFields(updated)
  }

  const addField = () => {
    setFields([
      ...fields,
      { id: `field_${Date.now()}`, label: 'فیلد جدید', type: 'text', required: false }
    ])
  }

  return (
    <div style={{ marginTop: '0.75rem' }}>
      {fields.map((field, index) => (
        <div key={field.id} className="field-row">
          <FormField label="برچسب">
            <input
              value={field.label}
              onChange={e => updateField(index, { label: e.target.value })}
            />
          </FormField>
          <FormSelect
            label="نوع"
            value={field.type}
            onChange={next => updateField(index, { type: next as FieldType })}
            options={FIELD_TYPES.map(t => ({ value: t.value, label: t.label }))}
          />
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={addField} style={{ marginBottom: '0.5rem' }}>
        + فیلد
      </Button>
      <Button variant="primary" size="sm" onClick={() => onSave(fields)}>
        ذخیره فیلدها
      </Button>
    </div>
  )
}
