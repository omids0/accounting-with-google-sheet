import { useEffect, type RefObject } from 'react'
import type { UseFormClearErrors } from 'react-hook-form'

import { focusEntryAmount, templateFormValues, type AppliedTemplate } from './types'
import type { CustomForm } from '../../types'

/** A «پرتکرار» chip: fill the form, then the amount, selected so typing replaces it. */
export function useTemplateFill(
  template: AppliedTemplate | null | undefined,
  activeForm: CustomForm,
  formRef: RefObject<HTMLFormElement | null>,
  setValue: (id: string, value: string | number) => void,
  clearErrors: UseFormClearErrors<Record<string, string | number>>
) {
  useEffect(() => {
    if (!template) return

    const fieldIds = new Set(activeForm.fields.map(field => field.id))

    Object.entries(templateFormValues(template.value)).forEach(([id, value]) => {
      if (fieldIds.has(id)) setValue(id, value)
    })
    clearErrors()
    focusEntryAmount(formRef.current, true)
  }, [template, activeForm.fields, setValue, clearErrors, formRef])
}
