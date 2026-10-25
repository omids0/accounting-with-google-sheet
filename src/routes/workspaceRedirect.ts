import { getPathForTab, getTabFromPath, isKnownPath, isSettingsPath } from './paths'
import { BUILDING_TABS, PERSONAL_ONLY_TABS } from '../components/layout/types'
import type { WorkspaceType } from '../services/workspace'

/**
 * Where a page that does not belong to the active workspace goes (round 11), or null when it
 * does: a building sends the personal-only pages to its dashboard and the personal workspace
 * sends the building pages to its own. Settings, backup, categories and close-year work in both.
 */
export function workspaceRedirect(pathname: string, type: WorkspaceType): string | null {
  if (isSettingsPath(pathname)) return null
  // An unknown URL is not a personal page in disguise: it gets «صفحه پیدا نشد» in either workspace.
  if (!isKnownPath(pathname)) return null
  // The shared account's own page sets and their redirects arrive with its navigation.
  if (type === 'shared') return null

  const isBuilding = type === 'building'
  const tab = getTabFromPath(pathname)

  // A notification or shortcut opens «bank-sms»; a building has its own queue.
  if (isBuilding && tab === 'bank-sms') return getPathForTab('building-sms')
  if (isBuilding && PERSONAL_ONLY_TABS.includes(tab)) return getPathForTab('building-dashboard')

  return !isBuilding && BUILDING_TABS.includes(tab) ? '/' : null
}
