import { removeDuplicateCharges, issueCharges } from './buildingChargeActions'
import { planIssueFrom } from './buildingChargePlan'
import { latestChargeMonth, missingIssueMonths } from './buildingCharges'
import {
  formatIssueMarker,
  getDeviceId,
  hasAutoIssuedToday,
  isIssueBlocked,
  ISSUE_MARKER_ROW,
  markAutoIssuedToday,
  parseIssueMarker
} from './buildingIssueGuard'
import { isJourneyUnfinished, readJourney } from './buildingJourney'
import { issueDueDate, monthName } from './buildingMonths'
import { getBuildingProfile } from './buildingProfile'
import { chargeResidents, fetchStays } from './buildingResidents'
import { can } from './buildingRoles'
import { setBuildingSetting } from './buildingSettings'
import { activeUnits, fetchUnits } from './buildingUnits'
import { fetchCounterparties } from './counterparties'
import { getPeriodSetting } from './periodSettings'
import { fetchReceivables } from './receivablesCrud'
import { flushOutbox, fullSyncFromRemote } from './sheetSync'
import { getActiveWorkspaceType } from './workspace'
import { placeholderOwnerCount } from '../components/buildings/buildingSetup'
import { getTodayIso } from '../utils/jalaliDate'
import { toPersianDigits } from '../utils/normalizeDigits'
import { showSuccess } from '../utils/toast'

/** The newest marker of this spreadsheet, read from the mirror. */
async function readMarker(spreadsheetId: string) {
  return parseIssueMarker(await getPeriodSetting(spreadsheetId, ISSUE_MARKER_ROW))
}

/** Everything `planIssue` needs, read from the mirror right now. */
async function loadIssueData(spreadsheetId: string) {
  const [units, stays, persons, receivables] = await Promise.all([
    fetchUnits(spreadsheetId).then(activeUnits),
    fetchStays(spreadsheetId),
    fetchCounterparties(spreadsheetId),
    fetchReceivables(spreadsheetId)
  ])

  return { units, stays, persons, receivables, profile: getBuildingProfile(spreadsheetId) }
}

/**
 * The automatic monthly issue (round 11, Step 4), for the manager only: it catches up every
 * month on/after the issue day that has no charge, with the profile's due day. It runs only when
 * a charge month already exists (the first issue is manual) and no unit still has a placeholder
 * owner, once per building per day. Two devices opening the building together are kept apart by
 * the «آخرین صدور» marker: a marker of another device less than two minutes old stops this one,
 * and after the marker is written the receivables are synced and planned again.
 * Returns how many receivables were written.
 */
export async function runAutoIssue(spreadsheetId: string): Promise<number> {
  const today = getTodayIso()

  if (getActiveWorkspaceType() !== 'building' || !can('autoIssue')) return 0
  if (hasAutoIssuedToday(spreadsheetId, today)) return 0
  if (isJourneyUnfinished(readJourney(spreadsheetId))) return 0

  const first = await loadIssueData(spreadsheetId)

  if (!first.profile || !first.units.length || !latestChargeMonth(first.receivables)) return 0
  if (placeholderOwnerCount(first.units, first.stays, first.persons) > 0) return 0

  const months = missingIssueMonths(first.profile, first.receivables, today)

  if (!months.length) {
    markAutoIssuedToday(spreadsheetId, today)

    return 0
  }

  const deviceId = getDeviceId()

  const newest = months[months.length - 1]

  if (isIssueBlocked(await readMarker(spreadsheetId), newest, deviceId, Date.now())) return 0

  await setBuildingSetting(
    spreadsheetId,
    ISSUE_MARKER_ROW,
    formatIssueMarker({ monthKey: newest, deviceId, at: new Date().toISOString() })
  )
  await flushOutbox(spreadsheetId)
  await fullSyncFromRemote(spreadsheetId, { force: true })

  // Whoever wrote the marker last wins; a newer marker of another device means this one yields.
  const after = await readMarker(spreadsheetId)

  if (after && after.deviceId !== deviceId && isIssueBlocked(after, newest, deviceId, Date.now())) {
    markAutoIssuedToday(spreadsheetId, today)

    return 0
  }

  const data = await loadIssueData(spreadsheetId)

  if (!data.profile) return 0

  const profile = data.profile

  const residents = chargeResidents(data.stays, data.persons)

  const issued: string[] = []

  let count = 0

  const missing = missingIssueMonths(profile, data.receivables, today)

  for (const [index, month] of missing.entries()) {
    // Each month is planned against the receivables as the previous one left them.
    const receivables = index === 0 ? data.receivables : await fetchReceivables(spreadsheetId)

    const written = await issueCharges(
      spreadsheetId,
      planIssueFrom(profile, data.units, residents, receivables, month),
      issueDueDate(month, profile.dueDay, today),
      ''
    )

    if (written) issued.push(monthName(month))
    count += written
  }

  markAutoIssuedToday(spreadsheetId, today)

  if (count) {
    showSuccess(
      `شارژ ${issued.join('، ')} خودکار برای ${toPersianDigits(String(count))} واحد صادر شد`
    )
  }

  return count
}

let running = false

/**
 * What the building workspace does by itself after entering and after every sync: remove the
 * later unpaid duplicates two devices may have issued, then (manager only) the automatic issue.
 * One run at a time; it never throws into the UI.
 */
export async function maintainCharges(spreadsheetId: string): Promise<void> {
  if (running) return
  running = true
  try {
    await removeDuplicateCharges(spreadsheetId)
    await runAutoIssue(spreadsheetId)
  } catch {
    // A failed run is retried after the next sync; the manual issue is always there.
  } finally {
    running = false
  }
}
