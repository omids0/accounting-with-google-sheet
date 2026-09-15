import { useEffect, useRef } from 'react'
import type { DefaultValues, FieldValues, UseFormReset } from 'react-hook-form'

export type UseModalFormResetOptions = {
  /** When false, skip auto-reset (e.g. closed modal). Default true. */
  active?: boolean
  /** When this changes and `active` is true, values reset to latest `initialValues`. */
  resetKey?: string | number | boolean | null
}

export function useModalFormReset<T extends FieldValues>(
  reset: UseFormReset<T>,
  initialValues: T,
  { active = true, resetKey }: UseModalFormResetOptions = {}
) {
  const valuesRef = useRef(initialValues)
  const resetRef = useRef(reset)

  valuesRef.current = initialValues
  resetRef.current = reset

  useEffect(() => {
    if (active) {
      resetRef.current(valuesRef.current as DefaultValues<T>)
    }
    // Intentionally omit `reset` — react-hook-form recreates it when defaultValues change
    // (e.g. category list reorder), which must not wipe in-progress form input.
  }, [active, resetKey])
}
