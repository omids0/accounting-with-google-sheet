import { useNavigate } from 'react-router'

import type { QuickAction } from './quickActionCatalog'
import { usePhotoInput } from '../../hooks/usePhotoInput'
import { getPathForTab } from '../../routes/paths'
import { prefetchTabPageOnIntent } from '../../routes/prefetchPages'
import { usePendingInvoiceScan } from '../../stores/pendingInvoiceScanStore'
import { cn } from '../../utils/cn'
import AppIcon from '../AppIcon'
import {
  dashboardQuickActionClass,
  dashboardQuickActionIconClass,
  dashboardQuickActionIconWrapClass
} from '../ui/dashboardCalmStyles'

/**
 * «اسکن فاکتور» tile: one tap opens the phone camera; the shot goes to the expense form, whose
 * «ریز اقلام» field reads it and waits for the user's review. A cancelled camera changes nothing.
 */
export default function ScanInvoiceShortcut({ action }: { action: QuickAction }) {
  const navigate = useNavigate()

  const camera = usePhotoInput({
    camera: true,
    onFiles: ([file]) => {
      if (!file) return

      usePendingInvoiceScan.getState().hold(file)
      navigate(getPathForTab('entry', { formType: 'expense' }))
    }
  })

  return (
    <>
      <button
        type="button"
        className={dashboardQuickActionClass}
        onClick={camera.open}
        onPointerEnter={() => prefetchTabPageOnIntent('entry')}
        onTouchStart={() => prefetchTabPageOnIntent('entry')}
      >
        <span
          className={cn(
            dashboardQuickActionIconWrapClass,
            dashboardQuickActionIconClass[action.tone]
          )}
        >
          <AppIcon name={action.icon} size={18} />
        </span>
        {action.label}
      </button>
      {camera.input}
    </>
  )
}
