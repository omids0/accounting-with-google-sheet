import {
  getPathForTab,
  getTabFromPath,
  isKnownPath,
  isSettingsPath,
  SETTINGS_CLOSE_YEAR_PATH,
  SETTINGS_PATH,
  SETTINGS_REMINDERS_PATH
} from './paths'
import { SHARED_REPLACED_TABS, SHARED_TABS } from '../components/layout/sharedTabs'
import { BUILDING_TABS, PERSONAL_ONLY_TABS, type Tab } from '../components/layout/types'
import type { WorkspaceType } from '../services/workspace'

/** The page a workspace opens on, and where the pages that are not its own are sent. */
export const WORKSPACE_HOME: Record<WorkspaceType, Tab> = {
  personal: 'dashboard',
  building: 'building-dashboard',
  shared: 'shared-home'
}

function normalizedPath(pathname: string): string {
  return pathname.replace(/\/+$/, '').toLowerCase()
}

function isRemindersPath(pathname: string): boolean {
  return normalizedPath(pathname) === SETTINGS_REMINDERS_PATH
}

/** Reminders and «بستن سال» belong to the personal books; a shared account has neither. */
function isPersonalSettingsPath(pathname: string): boolean {
  return isRemindersPath(pathname) || normalizedPath(pathname).startsWith(SETTINGS_CLOSE_YEAR_PATH)
}

/**
 * Where a page that does not belong to the active workspace goes (round 11), or null when it
 * does: a building sends the personal-only pages to its dashboard, the personal workspace sends
 * the building pages to its own, a shared account sends both to its home, and both of the others
 * send the shared pages to their home. Settings, backup, categories and close-year work in all.
 */
export function workspaceRedirect(pathname: string, type: WorkspaceType): string | null {
  if (type === 'shared' && isPersonalSettingsPath(pathname)) return SETTINGS_PATH
  // Reminder rules and push keys live only in the personal sheet: a building's board reads its tabs.
  if (type === 'building' && isRemindersPath(pathname)) return SETTINGS_PATH
  if (isSettingsPath(pathname)) return null
  // An unknown URL is not a personal page in disguise: it gets «صفحه پیدا نشد» in every workspace.
  if (!isKnownPath(pathname)) return null

  const tab = getTabFromPath(pathname)
  const home = getPathForTab(WORKSPACE_HOME[type])

  if (type === 'shared') {
    const replaced = SHARED_REPLACED_TABS[tab]

    if (replaced) return getPathForTab(replaced)

    return PERSONAL_ONLY_TABS.includes(tab) || BUILDING_TABS.includes(tab) ? home : null
  }
  if (SHARED_TABS.includes(tab)) return home

  const isBuilding = type === 'building'

  // A notification or shortcut opens «bank-sms»; a building has its own queue.
  if (isBuilding && tab === 'bank-sms') return getPathForTab('building-sms')
  if (isBuilding && PERSONAL_ONLY_TABS.includes(tab)) return home

  return !isBuilding && BUILDING_TABS.includes(tab) ? home : null
}
