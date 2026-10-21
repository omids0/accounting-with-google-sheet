import { setBuildingSetting } from './buildingSettings'
import { getSettings } from './settings'
import { PERIOD_SETTINGS_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'

/**
 * The eight-step setup journey of a new building. Its progress lives in «تنظیمات دوره», row
 * `راه‌اندازی` (JSON), so any device that opens the building continues where it stopped. A building
 * without the row (a connected sheet) has nothing left to set up.
 */
export type JourneyStepKey =
  | 'profile'
  | 'fund'
  | 'units'
  | 'people'
  | 'debts'
  | 'issue'
  | 'invite'
  | 'summary'

export const JOURNEY_STEPS: { key: JourneyStepKey; title: string }[] = [
  { key: 'profile', title: 'مشخصات' },
  { key: 'fund', title: 'صندوق و شارژ' },
  { key: 'units', title: 'واحدها' },
  { key: 'people', title: 'مالک و ساکنان' },
  { key: 'debts', title: 'بدهی قبلی' },
  { key: 'issue', title: 'شارژ اول' },
  { key: 'invite', title: 'دعوت اعضا' },
  { key: 'summary', title: 'جمع‌بندی' }
]

export const JOURNEY_ROW = 'راه‌اندازی'

/** Steps whose «رد کردن» is allowed to stay empty; the others (profile, fund) are mandatory. */
export const OPTIONAL_STEPS: JourneyStepKey[] = ['units', 'people', 'debts', 'issue', 'invite']

/** From this step on the journey offers «قبلی» (the first two run before the sheet exists). */
const FIRST_BACK_STEP: JourneyStepKey = 'debts'

export interface JourneyState {
  /** The step the building is on now. */
  step: JourneyStepKey
  done: JourneyStepKey[]
  skipped: JourneyStepKey[]
  /** True once the summary was confirmed. */
  finished: boolean
  /** From step 1: seeds the quick unit builder. */
  unitCount?: number
  /** From step 1: the optional note about the building. */
  note?: string
}

export function stepNumber(key: JourneyStepKey): number {
  return JOURNEY_STEPS.findIndex(step => step.key === key) + 1
}

/** What a created building starts with: steps 1 and 2 are behind it. */
export function initialJourneyState(
  extra: Pick<JourneyState, 'unitCount' | 'note'> = {}
): JourneyState {
  return { step: 'units', done: ['profile', 'fund'], skipped: [], finished: false, ...extra }
}

function mark(list: JourneyStepKey[], key: JourneyStepKey): JourneyStepKey[] {
  return list.includes(key) ? list : [...list, key]
}

function unmark(list: JourneyStepKey[], key: JourneyStepKey): JourneyStepKey[] {
  return list.filter(item => item !== key)
}

/** Saves or skips the current step and moves on; after the summary the journey is finished. */
export function goNextStep(state: JourneyState, how: 'done' | 'skipped' = 'done'): JourneyState {
  const done = how === 'done' ? mark(state.done, state.step) : unmark(state.done, state.step)

  const skipped =
    how === 'skipped' ? mark(state.skipped, state.step) : unmark(state.skipped, state.step)

  const next = JOURNEY_STEPS[stepNumber(state.step)]

  return next
    ? { ...state, done, skipped, step: next.key }
    : { ...state, done, skipped, finished: true }
}

export function canGoBack(state: JourneyState): boolean {
  return stepNumber(state.step) >= stepNumber(FIRST_BACK_STEP)
}

export function goPreviousStep(state: JourneyState): JourneyState {
  const previous = JOURNEY_STEPS[stepNumber(state.step) - 2]

  return previous && canGoBack(state) ? { ...state, step: previous.key } : state
}

export function parseJourneyState(raw: string): JourneyState | null {
  try {
    const parsed = JSON.parse(raw) as Partial<JourneyState>

    const known = (key: unknown): key is JourneyStepKey =>
      JOURNEY_STEPS.some(step => step.key === key)

    if (!known(parsed.step)) return null

    return {
      step: parsed.step,
      done: (parsed.done ?? []).filter(known),
      skipped: (parsed.skipped ?? []).filter(known),
      finished: parsed.finished === true,
      ...(typeof parsed.unitCount === 'number' ? { unitCount: parsed.unitCount } : {}),
      ...(typeof parsed.note === 'string' && parsed.note ? { note: parsed.note } : {})
    }
  } catch {
    return null
  }
}

/**
 * Journeys of buildings created on this device. Right after «ساخت ساختمان» the new spreadsheet is
 * not mirrored yet, so its journey row cannot be read; this keeps the known state until it is.
 */
const createdJourneys = new Map<string, JourneyState>()

export function rememberCreatedJourney(spreadsheetId: string, state: JourneyState): void {
  createdJourneys.set(spreadsheetId, state)
}

/**
 * The journey of the active (or given) building; null = no row = nothing to set up. While the
 * mirror of a building created on this device has no row yet, the state it was created with
 * stands in.
 */
export function readJourney(
  spreadsheetId = getSettings()?.spreadsheetId ?? ''
): JourneyState | null {
  const row = (getSheetDataRows(spreadsheetId, PERIOD_SETTINGS_SHEET) ?? []).find(
    cells => String(cells[0] ?? '').trim() === JOURNEY_ROW
  )

  // The row is never deleted (a finished journey is saved as finished), so a mirror without it
  // has not caught up with the building yet.
  if (!row) return createdJourneys.get(spreadsheetId) ?? null

  return parseJourneyState(String(row[1] ?? ''))
}

export function isJourneyUnfinished(state: JourneyState | null): boolean {
  return state !== null && !state.finished
}

export async function saveJourney(spreadsheetId: string, state: JourneyState): Promise<void> {
  if (createdJourneys.has(spreadsheetId)) createdJourneys.set(spreadsheetId, state)
  await setBuildingSetting(spreadsheetId, JOURNEY_ROW, JSON.stringify(state))
}
