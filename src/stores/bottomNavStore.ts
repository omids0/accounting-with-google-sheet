import { createSlotsStore } from './createSlotsStore'
import {
  DEFAULT_BOTTOM_NAV_IDS,
  sanitizeBottomNavIds
} from '../components/dashboard/quickActionCatalog'

export const BOTTOM_NAV_KEY = 'accounting_bottom_nav'

const slots = createSlotsStore(BOTTOM_NAV_KEY, DEFAULT_BOTTOM_NAV_IDS, sanitizeBottomNavIds)

export const readBottomNavIds = slots.read

/** The six pages of the phone bottom bar, around the fixed «داشبورد» button. */
export const useBottomNavStore = slots.useSlots
