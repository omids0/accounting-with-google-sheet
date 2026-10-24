import type { ReactNode } from 'react'

import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import type { BuildingPermission } from '../../services/buildingRoles'
import { ReadOnlyContext } from '../ui/readOnly'

/**
 * Wraps one of the app's own list pages (debts, checks, counterparties) that a building reuses:
 * a role without `permission` sees it, but its add / edit / delete / paid controls are gone.
 */
export default function BuildingReadOnly({
  permission,
  children
}: {
  permission: BuildingPermission
  children: ReactNode
}) {
  const { can } = useBuildingAccess()

  return <ReadOnlyContext.Provider value={!can(permission)}>{children}</ReadOnlyContext.Provider>
}
