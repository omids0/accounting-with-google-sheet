import { Navigate, Outlet, useLocation } from 'react-router'

import { getTabFromPath } from './paths'
import { workspaceRedirect } from './workspaceRedirect'
import EmptyState from '../components/EmptyState'
import { SHARED_TABS } from '../components/layout/sharedTabs'
import { BUILDING_TABS } from '../components/layout/types'
import { AppLoadingSkeleton } from '../components/skeleton'
import { useBuildingAccess } from '../hooks/useBuildingAccess'
import { useWorkspaceResolution } from '../hooks/useWorkspaceType'
import { TAB_PERMISSIONS, type BuildingPermission } from '../services/buildingRoles'

/** Renders the page only for a role that has `permission`; roles are read again after a sync. */
function PermissionGate({ permission }: { permission: BuildingPermission }) {
  const { can } = useBuildingAccess()

  return can(permission) ? <Outlet /> : <EmptyState icon="lock" message="دسترسی ندارید" />
}

/**
 * Keeps each workspace on its own pages (round 11): see `workspaceRedirect`. A building page the
 * signed-in role may not use renders «دسترسی ندارید»; the shared account's «اعضا» stays open to
 * every role (a viewer gets the read-only list, the page itself hides management without
 * `members`). While the active sheet's type is still unread, a building or shared page waits
 * (skeleton) instead of being sent to the personal dashboard.
 */
export default function WorkspaceRouteGuard() {
  const { pathname, state } = useLocation()
  const resolution = useWorkspaceResolution()
  const tab = getTabFromPath(pathname)

  if (resolution === 'unknown' && (BUILDING_TABS.includes(tab) || SHARED_TABS.includes(tab))) {
    return <AppLoadingSkeleton variant="inline" />
  }

  // While unresolved the personal pages stay as they were; only a workspace page waits above.
  const redirect = workspaceRedirect(pathname, resolution === 'unknown' ? 'personal' : resolution)

  if (redirect) return <Navigate to={redirect} replace state={state} />

  const permission = TAB_PERMISSIONS[tab]

  return resolution === 'building' && permission ? (
    <PermissionGate permission={permission} />
  ) : (
    <Outlet />
  )
}
