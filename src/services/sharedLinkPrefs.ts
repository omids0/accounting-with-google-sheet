import { getItem, setItem } from './storage'
import { hasSharedAccount } from './workspace'
import { SHARED_LINK_FIELD_ID, type SharedSplit } from '../components/form/sharedFields'
import { showError } from '../utils/toast'

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
  /** Only the whitelisted cells: date, title, amount, category. */
  values: Values
  split: SharedSplit
  /** '' = the person who sends it. */
  payer: string
  attempts: number
  /** «فقط از حساب شخصی»: the copy stays, its `مرجع` is cleared. */
  unlink?: boolean
  /** Why it can never be sent (no access, file gone); kept until the user cancels it. */
  failed?: string
}

export function readSharedLinks(): SharedLinkTask[] {
  return getItem<SharedLinkTask[]>(SHARED_LINK_KEY) ?? []
}

export function writeSharedLinks(tasks: SharedLinkTask[]): void {
  try {
    setItem(SHARED_LINK_KEY, tasks)
  } catch {
    // Private mode: the queue lasts until the page closes.
  }
}

const taskOf = (recordId: string) => readSharedLinks().find(task => task.recordId === recordId)

/** «در انتظار ارسال»: the record's copy has not reached the shared account yet. */
export const pendingSharedLink = (recordId: string): boolean => !!taskOf(recordId)

/** Why the record's copy can never be sent, or ''. */
export const failedSharedLink = (recordId: string): string => taskOf(recordId)?.failed ?? ''

export function cancelSharedLink(recordId: string): void {
  writeSharedLinks(readSharedLinks().filter(task => task.recordId !== recordId))
}

/** The tick panel's answer, carried in the saved values under this key (never written). */
export const SHARED_CHOICE_KEY = '__sharedChoice'

export interface SharedChoice {
  on: boolean
  sharedId: string
  /** '' = the personal category (exact name in the shared list, else «سایر»). */
  category: string
  split: SharedSplit
  payer: string
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

const pick = ({ date = '', title = '', amount = '', category = '' }: Values): Values => ({
  date,
  title,
  amount,
  category
})

/**
 * After the personal write (never before, never awaited): the tick on save is the only truth.
 * Ticked → create (new or unlinked) or update (linked); unticked on a linked record → delete.
 * `linkedTo` is the shared spreadsheet the record had a copy in before this save ('' = none).
 */
export function linkSharedSave(
  personalId: string,
  recordId: string,
  type: string,
  values: Values,
  choice: SharedChoice,
  linkedTo = ''
): void {
  if (!choice.on && !linkedTo) return

  queue({
    kind: choice.on ? (linkedTo ? 'update' : 'create') : 'delete',
    sharedId: choice.on ? choice.sharedId : linkedTo,
    personalId,
    recordId,
    type: type as RecordType,
    values: pick({ ...values, category: choice.category || values.category || '' }),
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
    split: 'equal',
    payer: ''
  })
}
