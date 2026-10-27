import { memberRulesOf, type MemberKind } from '../services/memberRegistry'
import { getSettings } from '../services/settings'

/**
 * The member rules a screen speaks in: `explicit` when the screen names its kind (the shared
 * account's pages do), else the kind of the open spreadsheet. A personal sheet has no members, so
 * it keeps the building's rules, as the services do.
 */
export function useMemberKind(explicit?: MemberKind): MemberKind {
  return explicit ?? memberRulesOf(getSettings()?.spreadsheetId)
}
