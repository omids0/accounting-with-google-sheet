import { getItem, setItem } from './storage'

/**
 * Per spreadsheet: `{ [spreadsheetId]: { [goalId]: { title, dismissed } } }`. A goal is
 * congratulated once: the entry stays after the card is dismissed. It is removed when
 * money leaves the goal below its target, so reaching it again earns a new card.
 */
export const GOAL_CONGRATS_STORAGE_KEY = 'accounting_goal_congrats_v1'

type GoalCongratsEntry = { title: string; dismissed: boolean }
type GoalCongratsStore = Record<string, Record<string, GoalCongratsEntry>>

function readStore(): GoalCongratsStore {
  return getItem<GoalCongratsStore>(GOAL_CONGRATS_STORAGE_KEY) ?? {}
}

function writeStore(store: GoalCongratsStore): void {
  try {
    setItem(GOAL_CONGRATS_STORAGE_KEY, store)
  } catch {
    // Private mode: the card simply does not come back after a reload.
  }
}

/** Queues the dashboard card; false when this goal was congratulated before. */
export function queueGoalCongrats(
  spreadsheetId: string,
  goal: { id: string; title: string }
): boolean {
  const store = readStore()
  const goals = store[spreadsheetId] ?? {}

  if (goals[goal.id]) return false

  writeStore({
    ...store,
    [spreadsheetId]: { ...goals, [goal.id]: { title: goal.title, dismissed: false } }
  })

  return true
}

/** Goals waiting for their congratulation card, oldest first. */
export function getPendingGoalCongrats(
  spreadsheetId: string | undefined
): { id: string; title: string }[] {
  if (!spreadsheetId) return []

  return Object.entries(readStore()[spreadsheetId] ?? {})
    .filter(([, entry]) => !entry.dismissed)
    .map(([id, entry]) => ({ id, title: entry.title }))
}

/** Forgets a goal's congratulation (card and dismissal), e.g. after money left the goal. */
export function resetGoalCongrats(spreadsheetId: string, goalId: string): void {
  const store = readStore()
  const goals = store[spreadsheetId]

  if (!goals?.[goalId]) return

  const { [goalId]: _removed, ...rest } = goals

  writeStore({ ...store, [spreadsheetId]: rest })
}

export function dismissGoalCongrats(spreadsheetId: string, goalId: string): void {
  const store = readStore()
  const entry = store[spreadsheetId]?.[goalId]

  if (!entry) return

  writeStore({
    ...store,
    [spreadsheetId]: { ...store[spreadsheetId], [goalId]: { ...entry, dismissed: true } }
  })
}
