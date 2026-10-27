import { useMemo } from 'react'
import { useNavigate } from 'react-router'

import { useTransferModal } from './useTransferModal'
import type { PageSpeedDialAction } from '../../../hooks/usePageSpeedDial'
import { useWorkspaceType } from '../../../hooks/useWorkspaceType'
import { getPathForTab } from '../../../routes/paths'
import AppIcon from '../../AppIcon'

/**
 * The wallet page's transfer entry points: «انتقال» (opens the form) and «لیست انتقال‌ها» (opens the
 * list) as speed-dial actions, plus the form's props for the page to render. Both are absent in a
 * building or a shared account, and «انتقال» also with fewer than two accounts.
 */
export function useWalletTransferActions() {
  const navigate = useNavigate()
  const personal = useWorkspaceType() === 'personal'
  const { canTransfer, openTransfer, modalProps } = useTransferModal()

  const extraActions = useMemo<PageSpeedDialAction[]>(
    () => [
      ...(canTransfer
        ? [
            {
              id: 'transfer',
              label: 'انتقال',
              icon: <AppIcon name="swap" size={18} />,
              onClick: () => openTransfer()
            }
          ]
        : []),
      ...(personal
        ? [
            {
              id: 'transfers',
              label: 'لیست انتقال‌ها',
              icon: <AppIcon name="records" size={18} />,
              onClick: () => navigate(getPathForTab('wallet-transfers'))
            }
          ]
        : [])
    ],
    [canTransfer, navigate, openTransfer, personal]
  )

  return { extraActions, modalProps, personal }
}
