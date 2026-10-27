import { useNavigate } from 'react-router'

import { useWorkspaceType } from '../../../hooks/useWorkspaceType'
import { getPathForTab } from '../../../routes/paths'
import AppIcon from '../../AppIcon'
import Button from '../../ui/Button'

/**
 * «انتقال‌ها» on the wallet page: a visible way into the list of transfers between accounts.
 * Personal book only. No count: reading the transfers tab here would create it on first view.
 */
export default function TransferListLink() {
  const navigate = useNavigate()

  if (useWorkspaceType() !== 'personal') return null

  return (
    <Button
      type="button"
      variant="secondary"
      className="min-h-touch-min"
      onClick={() => navigate(getPathForTab('wallet-transfers'))}
    >
      <AppIcon name="swap" size={18} />
      انتقال‌ها
    </Button>
  )
}
