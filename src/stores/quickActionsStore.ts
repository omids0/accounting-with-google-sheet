import { createSlotsStore } from './createSlotsStore'
import {
  DEFAULT_QUICK_ACTION_IDS,
  sanitizeQuickActionIds
} from '../components/dashboard/quickActionCatalog'

export const QUICK_ACTIONS_KEY = 'accounting_quick_actions'

const slots = createSlotsStore(QUICK_ACTIONS_KEY, DEFAULT_QUICK_ACTION_IDS, sanitizeQuickActionIds)

export const readQuickActionIds = slots.read

/** The four dashboard shortcuts; each change saves and shows on the dashboard at once. */
export const useQuickActionsStore = slots.useSlots
