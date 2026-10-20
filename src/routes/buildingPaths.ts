import type { Tab } from '../components/layout/types'

/** Round 11: the pages of a building workspace and the personal «مدیر ساختمان» home. */
export const BUILDING_TAB_PATHS: Partial<Record<Tab, string>> = {
  'buildings-home': '/buildings',
  'building-dashboard': '/building',
  'building-units': '/building/units',
  'building-residents': '/building/residents',
  'building-charges': '/building/charges',
  'building-expenses': '/building/expenses',
  'building-fund': '/building/fund',
  'building-dang': '/building/dang',
  'building-checks': '/building/checks',
  'building-counterparties': '/building/counterparties',
  'building-sms': '/building/sms',
  'building-reports': '/building/reports',
  'building-settings': '/building/settings',
  'building-members': '/building/settings/members',
  'building-lists': '/building/settings/lists'
}

const UNIT_PATH = /^\/building\/units\/[^/]+$/

/** `/building/units/<unitId>`: one unit's statement, history, residents and details. */
export function isBuildingUnitPath(pathname: string): boolean {
  return UNIT_PATH.test(pathname)
}

export function buildingUnitPath(unitId?: string): string {
  const units = BUILDING_TAB_PATHS['building-units'] ?? '/building/units'

  return unitId ? `${units}/${encodeURIComponent(unitId)}` : units
}
