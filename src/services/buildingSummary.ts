import { parseJourneyState, JOURNEY_ROW, type JourneyState } from './buildingJourney'
import { parseBuildingProfile } from './buildingProfile'
import { ROLE_ROW_PREFIX } from './buildingRoles'
import { parseUnits } from './buildingUnits'
import { remainingAmount, rowToReceivable } from './receivablesRow'
import {
  BUILDING_SHEET,
  BUILDING_UNITS_SHEET,
  PERIOD_SETTINGS_SHEET,
  RECEIVABLES_SHEET,
  WALLET_SHEET
} from './sheetNames'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getItem, setItem } from './storage'
import { WORKSPACE_BUILDING_VALUE, WORKSPACE_TYPE_ROW } from './workspace'
import { getJalaliParts } from '../utils/jalaliDate'
import { parseNumeric } from '../utils/parseNumeric'

/** `{ [spreadsheetId]: { at, summary } }`; listed in `ACCOUNT_KEYS` (localDataWipe.ts). */
export const BUILDING_SUMMARY_KEY = 'accounting_building_summary_v1'

/** The home cards read other buildings from Sheets; a summary is reused for 10 minutes. */
export const SUMMARY_TTL_MS = 10 * 60_000

export interface ChargeMonthSummary {
  /** `YYYY-MM` (Jalali). */
  monthKey: string
  issued: number
  paid: number
  billed: number
  collected: number
}

/** What the card of one building on the «مدیر ساختمان» home shows. */
export interface BuildingSummary {
  id: string
  /** False when the sheet has no «نوع فضا = ساختمان» row (connecting it is refused). */
  isBuilding: boolean
  name: string
  units: number
  /** People with a role besides the signed-in user are counted by the card. */
  members: number
  debtorUnits: number
  debt: number
  /** This month's charge; null while it has not been issued. */
  charge: ChargeMonthSummary | null
  issueDay: number
  fundTotal: number
  accounts: number
  journey: JourneyState | null
}

/** Jalali `YYYY-MM` of a date: the key of a charge month. */
export function monthKeyOf(date = new Date()): string {
  const { year, month } = getJalaliParts(date)

  return `${year}-${String(month).padStart(2, '0')}`
}

/** `charge:<unitId>:<YYYY-MM>`, `share:<unitId>:<recordId>` and `opening:<unitId>` → the unit id. */
export function unitOfReference(reference: string): string {
  const [kind, unitId] = reference.split(':')

  return kind === 'charge' || kind === 'share' || kind === 'opening' ? unitId ?? '' : ''
}

const dataRows = (tabs: Record<string, string[][]>, name: string) => (tabs[name] ?? []).slice(1)

/** Pure: the card numbers from the raw tabs of a building spreadsheet. */
export function summarizeBuilding(
  id: string,
  tabs: Record<string, string[][]>,
  monthKey = monthKeyOf()
): BuildingSummary {
  const period = dataRows(tabs, PERIOD_SETTINGS_SHEET)
  const profile = parseBuildingProfile(dataRows(tabs, BUILDING_SHEET)[0])

  const marker = period.find(row => String(row[0] ?? '').trim() === WORKSPACE_TYPE_ROW)

  const receivables = dataRows(tabs, RECEIVABLES_SHEET)
    .filter(row => String(row[0] ?? '').trim())
    .map((row, index) => rowToReceivable(row, index + 2))

  const openByUnit = new Map<string, number>()

  const month: ChargeMonthSummary = { monthKey, issued: 0, paid: 0, billed: 0, collected: 0 }

  for (const item of receivables) {
    const unitId = unitOfReference(item.reference ?? '')

    if (!unitId) continue

    const open = remainingAmount(item)

    openByUnit.set(unitId, (openByUnit.get(unitId) ?? 0) + open)

    if (item.reference?.startsWith('charge:') && item.reference.endsWith(`:${monthKey}`)) {
      month.issued += 1
      month.paid += open === 0 ? 1 : 0
      month.billed += item.amount
      month.collected += item.amount - open
    }
  }

  const debts = [...openByUnit.values()].filter(amount => amount > 0)

  const journeyRow = period.find(row => String(row[0] ?? '').trim() === JOURNEY_ROW)

  const wallet = dataRows(tabs, WALLET_SHEET).filter(row => String(row[0] ?? '').trim())

  return {
    id,
    isBuilding: String(marker?.[1] ?? '').trim() === WORKSPACE_BUILDING_VALUE,
    name: profile?.name ?? '',
    units: parseUnits(dataRows(tabs, BUILDING_UNITS_SHEET)).filter(unit => unit.active).length,
    members: period.filter(row => String(row[0] ?? '').startsWith(ROLE_ROW_PREFIX)).length,
    debtorUnits: debts.length,
    debt: debts.reduce((sum, amount) => sum + amount, 0),
    charge: month.issued ? month : null,
    issueDay: profile?.issueDay ?? 1,
    fundTotal: wallet.reduce((sum, row) => sum + parseNumeric(row[3]), 0),
    accounts: wallet.length,
    journey: journeyRow ? parseJourneyState(String(journeyRow[1] ?? '')) : null
  }
}

type Cache = Record<string, { at: number; summary: BuildingSummary }>

const readCache = (): Cache => getItem<Cache>(BUILDING_SUMMARY_KEY) ?? {}

function writeCache(id: string, summary: BuildingSummary): void {
  try {
    setItem(BUILDING_SUMMARY_KEY, { ...readCache(), [id]: { at: Date.now(), summary } })
  } catch {
    // Private mode: the card is read again next time.
  }
}

/** The cached summary, even a stale one; used until the fresh read arrives. */
export function cachedBuildingSummary(id: string): BuildingSummary | null {
  return readCache()[id]?.summary ?? null
}

/**
 * Reads a building's tabs straight from Sheets (the single in-memory mirror belongs to the active
 * spreadsheet, so a building that is not open is never loaded into it) and summarizes them.
 * Reused for 10 minutes; a failed read falls back to the last summary.
 */
export async function loadBuildingSummary(
  id: string,
  force = false
): Promise<BuildingSummary | null> {
  const cached = readCache()[id]

  if (!force && cached && Date.now() - cached.at < SUMMARY_TTL_MS) return cached.summary

  try {
    const fetched = await batchFetchSheetRangesFromApi(id, [
      PERIOD_SETTINGS_SHEET,
      BUILDING_SHEET,
      BUILDING_UNITS_SHEET,
      RECEIVABLES_SHEET,
      WALLET_SHEET
    ])

    const summary = summarizeBuilding(id, Object.fromEntries(fetched))

    writeCache(id, summary)

    return summary
  } catch {
    return cached?.summary ?? null
  }
}
