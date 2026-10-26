import type { ReactNode } from 'react'

import { useSharedCan } from '../../hooks/useSharedCan'
import type { SharedPermission } from '../../services/memberRegistry'
import { SHARED_NO_ACCESS_MESSAGE } from '../../services/sharedCan'
import EmptyState from '../EmptyState'

interface SharedWriteGateProps {
  permission: SharedPermission
  /** A whole page: «دسترسی ندارید» instead of nothing. */
  page?: boolean
  children: ReactNode
}

/** Its children only for whoever holds `permission` in a shared account (everyone elsewhere). */
export default function SharedWriteGate({
  permission,
  page = false,
  children
}: SharedWriteGateProps) {
  if (useSharedCan(permission)) return children

  return page ? <EmptyState icon="lock" message={SHARED_NO_ACCESS_MESSAGE} /> : null
}
