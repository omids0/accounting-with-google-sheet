import { buildingMenuGroups, type BuildingMenuGroup } from './navMenuGroups'
import { useBuildingAccess } from '../../hooks/useBuildingAccess'
import { TAB_PERMISSIONS, type BuildingPermission } from '../../services/buildingRoles'

/** The groups with the rows the role may not open dropped (and groups left empty). */
export function visibleBuildingGroups(
  groups: BuildingMenuGroup[],
  can: (permission: BuildingPermission) => boolean
): BuildingMenuGroup[] {
  return groups
    .map(group => ({
      ...group,
      links: group.links.filter(link => {
        const permission = TAB_PERMISSIONS[link.tab]

        return !permission || can(permission)
      })
    }))
    .filter(group => group.links.length > 0)
}

/** The building drawer groups the signed-in role may see. */
export function useBuildingMenuGroups(): BuildingMenuGroup[] {
  const { can } = useBuildingAccess()

  return visibleBuildingGroups(buildingMenuGroups, can)
}
