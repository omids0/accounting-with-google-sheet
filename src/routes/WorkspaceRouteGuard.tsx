import { Navigate, Outlet, useLocation } from 'react-router'

import { getTabFromPath } from './paths'
import { workspaceRedirect } from './workspaceRedirect'
import EmptyState from '../components/EmptyState'
import { useBuildingAccess } from '../hooks/useBuildingAccess'
import { useIsBuildingWorkspace } from '../hooks/useWorkspaceType'
import { TAB_PERMISSIONS, type BuildingPermission } from '../services/buildingRoles'

/** Renders the page only for a role that has `permission`; roles are read again after a sync. */
function PermissionGate({ permission }: { permission: BuildingPermission }) {
  const { can } = useBuildingAccess()

  return can(permission) ? <Outlet /> : <EmptyState icon="lock" message="دسترسی ندارید" />
}

/**
 * Keeps each workspace on its own pages (round 11): see `workspaceRedirect`. A page the signed-in
 * role may not use renders «دسترسی ندارید».
 */
export default function WorkspaceRouteGuard() {
  const { pathname } = useLocation()
  const isBuilding = useIsBuildingWorkspace()
  const redirect = workspaceRedirect(pathname, isBuilding)

  if (redirect) return <Navigate to={redirect} replace />

  const permission = TAB_PERMISSIONS[getTabFromPath(pathname)]

  return isBuilding && permission ? <PermissionGate permission={permission} /> : <Outlet />
}
