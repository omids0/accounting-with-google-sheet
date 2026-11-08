import { useEffect } from 'react'

import { usePendingInvoiceScan } from '../../stores/pendingInvoiceScanStore'
import { showInfo } from '../../utils/toast'

/**
 * Runs after the entry form mounted (its fields' effects run first). A dashboard photo still held
 * then found no «ریز اقلام» field (a vehicle category, a form without the field): say so instead
 * of dropping it silently, and never leave it for the next form to pick up.
 */
export function useDropUnclaimedScan(formId: string) {
  useEffect(() => {
    const pending = usePendingInvoiceScan.getState()

    if (!formId || !pending.file) return

    pending.clear()
    showInfo('این فرم «ریز اقلام» ندارد؛ عکس فاکتور خوانده نشد.')
  }, [formId])
}
