import { getItem, setItem } from './storage'
import { hasSharedAccount } from './workspace'
import { SUBCATEGORY_FIELD_ID, withAutoTitle } from '../components/form/fieldUtils'
import { SHARED_LINK_FIELD_ID, type SharedSplit } from '../components/form/sharedFields'
import { showError } from '../utils/toast'
import { isVehicleExpenseCategory } from '../utils/vehicleExpenseUtils'

/**
 * The copies of personal records still to be written to the shared account (personal → shared
 * link). Per device, listed in `ACCOUNT_KEYS` (localDataWipe.ts): it names records of the account.
 * Kept tiny: the record list asks `pendingSharedLink` for every linked row; the runner and the tick
 * panel load on demand (`sharedLink.ts`, `SharedTick.tsx`).
 */
export const SHARED_LINK_KEY = 'accounting_shared_link_v1'

type Values = Record<string, string | number>

export type RecordType = 'income' | 'expense'

export interface SharedLinkTask {
  id: string
  kind: 'create' | 'update' | 'delete'
  sharedId: string
  personalId: string
  recordId: string
  /** `share:<personalSpreadsheetId>:<recordId>`: how the copy is found again. */
  ref: string
  /** The copy goes to the shared tab of the personal record's own type. */
  type: RecordType
  /**
   * Only date, title (as typed: '' = the shared category), amount and category (on an update ''
   * = the copy keeps its own).
   */
  values: Values
  /** '' = unset: a new copy is «نصف‌نصف», an existing one keeps its own. */
  split: SharedSplit | ''
  /** '' = unset: a new copy is paid by the sender, an existing one keeps its own. */
  payer: string
  attempts: number
  /** «فقط از حساب شخصی»: the copy stays, its `مرجع` is cleared. */
  unlink?: boolean
  /** Why it cannot be sent now (no access, file gone); retried once access is proven. */
  failed?: string
  /** The failure already reported to the user (one toast per failure, not per retry). */
  toasted?: string
}

export function readSharedLinks(): SharedLinkTask[] {
  return getItem<SharedLinkTask[]>(SHARED_LINK_KEY) ?? []
}

const listeners = new Set<() => void>()

/** Called after every change of the queue: a memoised row's «در انتظار ارسال» follows it. */
export function subscribeSharedLinks(listener: () => void): () => void {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function writeSharedLinks(tasks: SharedLinkTask[]): void {
  try {
    setItem(SHARED_LINK_KEY, tasks)
  } catch {
    // Private mode: the queue lasts until the page closes.
  }
  listeners.forEach(listener => listener())
}

const taskOf = (recordId: string) => readSharedLinks().find(task => task.recordId === recordId)

/** «در انتظار ارسال»: the record's copy has not reached the shared account yet. */
export const pendingSharedLink = (recordId: string): boolean => !!taskOf(recordId)

/** The record's task that cannot be sent now, if any. */
export const failedSharedLink = (recordId: string): SharedLinkTask | undefined =>
  readSharedLinks().find(task => task.recordId === recordId && task.failed)

export function cancelSharedLink(recordId: string): void {
  writeSharedLinks(readSharedLinks().filter(task => task.recordId !== recordId))
}

/** This device reached the shared file (opened it, read it): failed tasks may go again. */
export function clearSharedLinkFailures(): void {
  const tasks = readSharedLinks()

  if (tasks.some(task => task.failed)) {
    writeSharedLinks(tasks.map(({ failed: _failed, ...task }) => task))
  }
}

/**
 * The title the user typed, or '': an auto title («دسته · زیردسته») or a vehicle title names the
 * PERSONAL category or vehicle, which never reaches the shared sheet.
 */
export function typedTitle(values: Values, stored?: Values): string {
  const title = String(values.title ?? '').trim()
  // A generated title names the category it was made from, the live one or the stored one.
  const generated = (from: Values) =>
    title ===
      withAutoTitle({
        category: String(from.category ?? ''),
        [SUBCATEGORY_FIELD_ID]: from[SUBCATEGORY_FIELD_ID] ?? ''
      }).title || isVehicleExpenseCategory(String(from.category ?? ''))
  const kept = !!stored && title === String(stored.title ?? '').trim()

  return title && !generated(values) && !(kept && generated(stored)) ? title : ''
}

/** The tick panel's answer, carried in the saved values under this key (never written). */
export const SHARED_CHOICE_KEY = '__sharedChoice'

export interface SharedChoice {
  on: boolean
  sharedId: string
  /** The shared category; '' = the personal one mapped (new copy) or the copy's own (edit). */
  category: string
  split: SharedSplit | ''
  payer: string
  /** `typedTitle` of the form. */
  title?: string
  /** «لغو ارسال» of a create that never landed: the record has no copy any more. */
  unlinked?: boolean
}

/** The values without the tick's answer, and the answer (null when no tick was shown). */
export function takeSharedChoice(input: Values): { values: Values; choice: SharedChoice | null } {
  const { [SHARED_CHOICE_KEY]: raw, ...values } = input

  try {
    return { values, choice: typeof raw === 'string' ? (JSON.parse(raw) as SharedChoice) : null }
  } catch {
    return { values, choice: null }
  }
}

type Task = Omit<SharedLinkTask, 'id' | 'attempts'>

/** Hands the task to the runner (loaded on demand); a failure never touches the personal save. */
function queue(task: Omit<Task, 'ref'>): void {
  if (
    !task.sharedId ||
    !hasSharedAccount() ||
    (task.type !== 'income' && task.type !== 'expense')
  ) {
    return
  }

  void import('./sharedLink')
    .then(({ queueSharedLink }) =>
      queueSharedLink({ ...task, ref: `share:${task.personalId}:${task.recordId}` })
    )
    .catch(() => showError('ثبت شخصی ذخیره شد ولی نسخهٔ حساب مشترک فرستاده نشد'))
}

/**
 * After the personal write (never before, never awaited): the tick on save is the only truth.
 * Ticked → create (new or unlinked) or update (linked); unticked on a linked record → delete.
 * `linked` is the shared spreadsheet the record had a copy in before this save ('' = none).
 */
export function linkSharedSave(
  personalId: string,
  recordId: string,
  type: string,
  { date = '', amount = '', category = '' }: Values,
  choice: SharedChoice,
  linked = ''
): void {
  // A marker of a previous (or another) shared account is no link here: a tick creates a copy.
  const linkedTo = choice.unlinked || (choice.on && linked !== choice.sharedId) ? '' : linked

  if (!choice.on && !linkedTo) return

  queue({
    kind: choice.on ? (linkedTo ? 'update' : 'create') : 'delete',
    sharedId: choice.on ? choice.sharedId : linkedTo,
    personalId,
    recordId,
    type: type as RecordType,
    values: {
      date,
      title: choice.title ?? '',
      amount,
      category: choice.category || (linkedTo ? '' : category)
    },
    split: choice.split,
    payer: choice.payer
  })
}

/** A linked personal record was deleted: the copy goes too («both») or stays, unlinked («one»). */
export function linkSharedDelete(
  personalId: string,
  type: string,
  record: { id: string; values: Record<string, string> },
  answer: 'both' | 'one'
): void {
  queue({
    kind: answer === 'both' ? 'delete' : 'update',
    unlink: answer === 'one',
    sharedId: record.values[SHARED_LINK_FIELD_ID] ?? '',
    personalId,
    recordId: record.id,
    type: type as RecordType,
    values: {},
    split: '',
    payer: ''
  })
}
