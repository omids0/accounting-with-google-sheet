import { ONBOARDING_STORAGE_KEY, type OnboardingState } from './onboarding'
import { getItem, setItem } from './storage'
import { version as APP_VERSION } from '../../package.json'
import { toIsoDate } from '../utils/jalaliDate'

/**
 * Last app version this device showed «چه خبر؟» for. Per device, not per spreadsheet:
 * it describes the installed app, so it stays out of `ACCOUNT_KEYS` and survives sign-out.
 */
export const LAST_SEEN_VERSION_KEY = 'accounting_last_seen_version'

export interface LastSeenVersion {
  version: string
  /** ISO day this device first ran a version that records this key. */
  firstDay: string
}

export interface ChangelogEntry {
  version: string
  items: string[]
}

/** The sheet shows at most this many lines, however many versions were skipped. */
export const WHATS_NEW_MAX_ITEMS = 3

function versionParts(version: string): number[] {
  return version.split('.').map(part => Number.parseInt(part, 10) || 0)
}

/** Negative when `a` is older than `b`, 0 when equal, positive when newer. */
export function compareVersions(a: string, b: string): number {
  const left = versionParts(a)
  const right = versionParts(b)

  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0)

    if (diff !== 0) return diff
  }

  return 0
}

/** Items of every version after `lastSeen` up to `current`, newest first, capped. */
export function selectWhatsNewItems(
  changelog: readonly ChangelogEntry[],
  lastSeen: string,
  current: string,
  max = WHATS_NEW_MAX_ITEMS
): string[] {
  return changelog
    .filter(
      entry =>
        compareVersions(entry.version, lastSeen) > 0 && compareVersions(entry.version, current) <= 0
    )
    .sort((a, b) => compareVersions(b.version, a.version))
    .flatMap(entry => entry.items)
    .slice(0, max)
}

/** Last version shipped before this key existed; devices already in use count as upgrading from it. */
export const PRE_WHATS_NEW_VERSION = '2.0.0'

/**
 * What a launch should do. A first install only records the version; on the first
 * day after that a newer version is marked seen silently; otherwise the sheet shows.
 * `inUseSince` (ISO day) marks a device that used the app before this key existed.
 */
export function decideWhatsNew(
  storedValue: LastSeenVersion | null,
  current: string,
  today: string,
  inUseSince?: string
): { show: boolean; next: LastSeenVersion | null } {
  const stored =
    storedValue ??
    (inUseSince && inUseSince < today
      ? { version: PRE_WHATS_NEW_VERSION, firstDay: inUseSince }
      : null)

  if (!stored) return { show: false, next: { version: current, firstDay: today } }
  if (compareVersions(current, stored.version) <= 0) return { show: false, next: null }

  const next = { ...stored, version: current }

  return { show: stored.firstDay < today, next }
}

/** Earliest day any spreadsheet's setup wizard was closed on this device, if any. */
function deviceInUseSince(): string | undefined {
  const store = getItem<Record<string, OnboardingState>>(ONBOARDING_STORAGE_KEY) ?? {}
  const closed = Object.values(store)
    .map(state => state?.closedAt)
    .filter((value): value is number => typeof value === 'number')

  return closed.length ? toIsoDate(new Date(Math.min(...closed))) : undefined
}

let claimed: { lastSeen: string | null } | null = null

/**
 * Once per launch, when the app shell first shows (ready, past the wizard): records
 * this version and returns the version the user last saw when «چه خبر؟» is due.
 */
export function claimWhatsNew(now = new Date()): string | null {
  if (claimed) return claimed.lastSeen

  const stored = getItem<LastSeenVersion>(LAST_SEEN_VERSION_KEY)
  const { show, next } = decideWhatsNew(stored, APP_VERSION, toIsoDate(now), deviceInUseSince())

  if (next) setItem(LAST_SEEN_VERSION_KEY, next)
  claimed = { lastSeen: show ? stored?.version ?? PRE_WHATS_NEW_VERSION : null }

  return claimed.lastSeen
}

/** The sheet was answered; a remount of the shell in the same launch does not repeat it. */
export function closeWhatsNew(): void {
  claimed = { lastSeen: null }
}
