import { useCallback } from 'react'

import { showError, showSuccess } from '../utils/toast'

export function useCopyToClipboard() {
  const copy = useCallback(async (value: string, successMessage = 'کپی شد') => {
    if (!value) return

    try {
      await navigator.clipboard.writeText(value)
      showSuccess(successMessage)
    } catch {
      showError('کپی نشد')
    }
  }, [])

  return { copy }
}
