import { useNavigate } from 'react-router'

import { useWorkspaceType } from '../../../hooks/useWorkspaceType'
import { getPathForTab } from '../../../routes/paths'
import AppIcon from '../../AppIcon'
import Button from '../../ui/Button'

/**
 * «بررسی یکپارچگی» on the wallet page: a visible way into the check that compares every
 * account's stored balance with its history. Personal book only.
 */
export default function IntegrityLink() {
  const navigate = useNavigate()

  if (useWorkspaceType() !== 'personal') return null

  return (
    <Button
      type="button"
      variant="secondary"
      className="min-h-touch-min"
      onClick={() => navigate(getPathForTab('wallet-integrity'))}
    >
      <AppIcon name="check" size={18} />
      بررسی یکپارچگی
    </Button>
  )
}
