import type { BaseSyntheticEvent } from 'react'
import type {
  FieldError,
  FieldErrors,
  FieldValues,
  Path,
  UseFormHandleSubmit
} from 'react-hook-form'

import { showError } from './toast'

export function requiredField(label: string) {
  return {
    validate: (value: unknown) => {
      if (value === null || value === undefined) {
        return `${label} الزامی است`
      }

      if (typeof value === 'string' && !value.trim()) {
        return `${label} الزامی است`
      }

      return true
    }
  }
}

export function requiredPositiveAmount(message = 'مبلغ را وارد کنید') {
  return {
    validate: (value: string | number | '') => {
      if (value === '' || value === undefined || Number(value) <= 0) {
        return message
      }

      return true
    }
  }
}

export function requiredNonNegativeAmount(message = 'مبلغ را وارد کنید') {
  return {
    validate: (value: string | number | '') => {
      if (value === '' || value === undefined || Number(value) < 0) {
        return message
      }

      return true
    }
  }
}

export function requiredPositiveInteger(label: string, min = 1, max?: number) {
  return {
    validate: (value: string | number | '') => {
      const parsed = Number(value)

      if (value === '' || !Number.isFinite(parsed) || parsed < min) {
        return `${label} را وارد کنید`
      }

      if (max !== undefined && parsed > max) {
        return `${label} باید بین ${min} تا ${max} باشد`
      }

      return true
    }
  }
}

export function requiredDate(label: string) {
  return {
    validate: (value: unknown) => {
      if (typeof value !== 'string' || !value.trim()) {
        return `${label} الزامی است`
      }

      return true
    }
  }
}

export function formFieldError<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  name: Path<TFieldValues>
): string | undefined {
  const error = errors[name] as FieldError | undefined

  if (!error?.message) {
    return undefined
  }

  return String(error.message)
}

export function firstFormErrorMessage<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>
): string | undefined {
  for (const value of Object.values(errors)) {
    if (!value || typeof value !== 'object') continue

    const fieldError = value as FieldError

    if (fieldError.message) {
      return String(fieldError.message)
    }
  }

  return undefined
}

export function showFormValidationToast<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>
) {
  showError(firstFormErrorMessage(errors) ?? 'لطفاً فیلدهای الزامی را تکمیل کنید')
}

export function submitValidatedForm<TFieldValues extends FieldValues>(
  handleSubmit: UseFormHandleSubmit<TFieldValues>,
  onValid: (data: TFieldValues) => void | Promise<void>,
  event?: BaseSyntheticEvent
) {
  void handleSubmit(onValid, errors => showFormValidationToast(errors))(event)
}
