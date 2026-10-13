import { monthsToRebuild, snapshotMonthToWrite, type NetWorthGate } from './netWorth'
import { earliestNetMonth, rebuildSnapshots } from './netWorthRebuild'
import { appendNetWorthSnapshots, fetchNetWorthSnapshots, netWorthTimestamp } from './netWorthSheet'
import { loadNetWorthRecords, loadRebuildInput, loadTodayNetWorth } from './netWorthSources'
import { getNetAvailableConfig, getSettings } from './settings'
import { getItem, setItem } from './storage'
import { getSyncStatus, subscribeSyncStatus } from './syncStatus'
import { getJalaliMonthKey } from '../utils/dateRange'
import { getTodayIso } from '../utils/jalaliDate'

/** Per spreadsheet: `NetWorthGate` (month whose first open ran, one-time rebuild). */
export const NET_WORTH_STORAGE_KEY = 'accounting_net_worth_v1'

/** Give up for this open when no sync succeeds in time; the next open tries again. */
const SYNC_WAIT_MS = 3 * 60_000

export function readNetWorthGate(spreadsheetId: string): NetWorthGate {
  return getItem<Record<string, NetWorthGate>>(NET_WORTH_STORAGE_KEY)?.[spreadsheetId] ?? {}
}

function writeNetWorthGate(spreadsheetId: string, gate: NetWorthGate): void {
  try {
    const store = getItem<Record<string, NetWorthGate>>(NET_WORTH_STORAGE_KEY) ?? {}

    setItem(NET_WORTH_STORAGE_KEY, { ...store, [spreadsheetId]: gate })
  } catch {
    // Private mode: the sheet check simply runs again next open.
  }
}

function sessionStart(): number {
  return typeof performance !== 'undefined' ? performance.timeOrigin : Date.now()
}

/** Resolves true once a sync has succeeded since the page loaded (false on timeout). */
function waitForSessionSync(since: number, timeoutMs = SYNC_WAIT_MS): Promise<boolean> {
  const synced = () => {
    const { lastSyncedAt, syncState } = getSyncStatus()

    return lastSyncedAt != null && lastSyncedAt >= since && syncState !== 'syncing'
  }

  if (synced()) return Promise.resolve(true)

  return new Promise(resolve => {
    const finish = (value: boolean) => {
      clearTimeout(timer)
      unsubscribe()
      resolve(value)
    }
    const timer = setTimeout(() => finish(false), timeoutMs)
    const unsubscribe = subscribeSyncStatus(() => {
      if (synced()) finish(true)
    })
  })
}

async function snapshotAndRebuild(spreadsheetId: string, monthKey: string): Promise<void> {
  const gate = readNetWorthGate(spreadsheetId)

  if (gate.checkedMonth === monthKey && gate.rebuiltAt) return
  if (!(await waitForSessionSync(sessionStart()))) return

  const settings = getSettings()

  if (settings?.spreadsheetId !== spreadsheetId) return

  const existing = new Set((await fetchNetWorthSnapshots(spreadsheetId)).map(s => s.monthKey))
  const recordedAt = netWorthTimestamp()
  const autoMonth = snapshotMonthToWrite(gate, monthKey, existing)
  const rows = []

  if (autoMonth) {
    rows.push({
      monthKey: autoMonth,
      ...(await loadTodayNetWorth(settings)),
      recordedAt,
      source: 'auto' as const
    })
    existing.add(autoMonth)
  }

  if (!gate.rebuiltAt) {
    const input = await loadRebuildInput(settings, await loadNetWorthRecords(settings))
    const months = monthsToRebuild(earliestNetMonth(input.monthlyNet), existing, monthKey)

    rows.unshift(...rebuildSnapshots(input, months, getNetAvailableConfig(), recordedAt))
  }

  await appendNetWorthSnapshots(spreadsheetId, rows)
  writeNetWorthGate(spreadsheetId, {
    checkedMonth: monthKey,
    rebuiltAt: gate.rebuiltAt ?? new Date().toISOString()
  })
}

let inFlight: Promise<void> | null = null

/**
 * First open of a Jalali month, after the first successful sync: writes last
 * month's snapshot (when absent) and, once per spreadsheet, rebuilds the months
 * before the first snapshot from records.
 */
export function runNetWorthSnapshot(spreadsheetId: string): Promise<void> {
  if (inFlight) return inFlight

  inFlight = snapshotAndRebuild(spreadsheetId, getJalaliMonthKey(getTodayIso()))
    .catch(() => undefined)
    .finally(() => {
      inFlight = null
    })

  return inFlight
}

let watching = false

/** The APK can stay alive across a month boundary; coming back to the app checks again. */
export function watchNetWorthSnapshot(spreadsheetId: string): void {
  if (watching || typeof document === 'undefined') return
  watching = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return

    const id = getSettings()?.spreadsheetId

    if (id && id === spreadsheetId) void runNetWorthSnapshot(id)
  })
}
