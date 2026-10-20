import { getPathForTab, getTabFromPath, isSettingsPath } from './paths'
import { BUILDING_TABS, PERSONAL_ONLY_TABS } from '../components/layout/types'

/**
 * Where a page that does not belong to the active workspace goes (round 11), or null when it
 * does: a building sends the personal-only pages to its dashboard and the personal workspace
 * sends the building pages to its own. Settings, backup, categories and close-year work in both.
 */
export function workspaceRedirect(pathname: string, isBuilding: boolean): string | null {
  if (isSettingsPath(pathname)) return null

  const tab = getTabFromPath(pathname)

  if (isBuilding && PERSONAL_ONLY_TABS.includes(tab)) return getPathForTab('building-dashboard')

  return !isBuilding && BUILDING_TABS.includes(tab) ? '/' : null
}
