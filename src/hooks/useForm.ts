import { useCallback, useEffect, useRef, useState } from 'react'

export type UseFormOptions = {
  /** When this changes and `active` is true, values reset to latest `initialValues`. */
  resetKey?: string | number | boolean | null
  /** When false, skip auto-reset (e.g. closed modal). Default true. */
  active?: boolean
}

export type UseFormReturn<T extends Record<string, unknown>> = {
  values: T
  setField: <K extends keyof T>(key: K, value: T[K]) => void
  setFields: (patch: Partial<T>) => void
  update: (updater: (prev: T) => T) => void
  reset: (next?: T) => void
}

export function useForm<T extends Record<string, unknown>>(
  initialValues: T,
  { resetKey, active = true }: UseFormOptions = {}
): UseFormReturn<T> {
  const initialRef = useRef(initialValues)

  initialRef.current = initialValues

  const [values, setValues] = useState<T>(initialValues)

  useEffect(() => {
    if (active) {
      setValues(initialRef.current)
    }
  }, [active, resetKey])

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  const setFields = useCallback((patch: Partial<T>) => {
    setValues(prev => ({ ...prev, ...patch }))
  }, [])

  const update = useCallback((updater: (prev: T) => T) => {
    setValues(updater)
  }, [])

  const reset = useCallback((next?: T) => {
    setValues(next ?? initialRef.current)
  }, [])

  return { values, setField, setFields, update, reset }
}
