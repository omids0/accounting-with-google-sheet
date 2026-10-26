import { getUserEmail } from './auth'
import { memberHasPermission, parseMembers } from './buildingRoles'
import { rowsToGroups } from './categoryGroups'
import { listArchiveSheets } from './recordArchive'
import { getSettings } from './settings'
import {
  readSharedLinks,
  writeSharedLinks,
  type SharedChoice,
  type SharedLinkTask
} from './sharedLinkPrefs'
import {
  buildCopyRow,
  copyCells,
  copyOperation,
  findCopyByRef,
  sharedRecordForm,
  sharedRef
} from './sharedLinkRows'
import { removeNotices } from './sharedNotices'
import { CATEGORIES_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { isPermanentApiError, isSpreadsheetAccessDeniedError, SheetsApiError } from './sheetsApi'
import { getSheetTitles } from './sheetsEnsure'
import { normalizeHeaderLabel } from './sheetsHeaders'
import { normalizeSheetTitle } from './sheetsMeta'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getSheetAllRows } from './spreadsheetStore'
import { getOutboxEntries } from './syncOutbox'
import { drainWorkspace, writeToWorkspace } from './workspaceBridge'
import { SHARED_LINK_FIELD_LABEL } from '../components/form/sharedFields'
import { showError } from '../utils/toast'

export { pendingSharedLink } from './sharedLinkPrefs'
export { buildCopyRow, findCopyByRef, sharedRef }

/**
 * The personal → shared link (spec «Linking a personal record»): a per-device queue of copies to
 * create, update or delete in the shared account, sent through the bridge (`writeToWorkspace`)
 * after a direct read of the shared sheet, so a retry never writes a second copy.
 */

type NewTask = Omit<SharedLinkTask, 'id' | 'attempts'>

/** The task being sent right now: a delete can no longer cancel it. */
let inFlight = ''

/** An update of a copy whose create never left this device: still that create, its gaps filled. */
function mergeIntoCreate(
  { id: _id, attempts: _attempts, failed: _failed, ...created }: SharedLinkTask,
  task: NewTask
): NewTask {
  // «فقط از حساب شخصی»: the copy the user chose to keep is still created, without a link.
  if (task.unlink) return { ...created, unlink: true }

  return {
    ...task,
    kind: 'create',
    values: { ...task.values, category: task.values.category || created.values.category || '' },
    split: task.split || created.split,
    payer: task.payer || created.payer
  }
}

/**
 * One task per copy (`ref`): a newer one replaces the queued one. A delete cancels a create that
 * never left this device; an update before its create left is still that create.
 */
export function enqueueSharedLink(task: NewTask): void {
  const tasks = readSharedLinks()
  const queued = tasks.find(item => item.ref === task.ref)
  const rest = tasks.filter(item => item.ref !== task.ref)
  const unsent = queued?.kind === 'create' && queued.id !== inFlight ? queued : null

  if (task.kind === 'delete' && unsent) return writeSharedLinks(rest)

  const next = unsent && task.kind === 'update' ? mergeIntoCreate(unsent, task) : task

  writeSharedLinks([...rest, { ...next, id: crypto.randomUUID(), attempts: 0 }])
}

class NoRecordRight extends Error {}

const offline = () => typeof navigator !== 'undefined' && !navigator.onLine

/**
 * The copy's append still waits in the shared sheet's outbox: it cannot be found by a read yet.
 * Matched by ref or by its row id (the task id): a copy kept without a link has no ref.
 */
const isCopyQueued = ({ sharedId, ref, id }: SharedLinkTask) =>
  getOutboxEntries(sharedId).some(
    ({ operation }) =>
      operation.type === 'append' && (operation.row[0] === id || operation.row.includes(ref))
  )

/** The shared record tab of the type: the default name, else the one this device's forms use. */
function tabOf(type: SharedLinkTask['type'], titles: string[]): string {
  const own = getSettings()?.forms.find(form => form.type === type)?.sheetName
  const names = [sharedRecordForm(type).sheetName, own ?? '']
  const has = (name: string) => titles.some(title => normalizeSheetTitle(title) === name)

  return names.find(name => name && has(normalizeSheetTitle(name))) ?? names[0]
}

/** One direct read of the shared sheet: members, categories, the record tab and its archives. */
export async function readTarget(sharedId: string, type: SharedLinkTask['type']) {
  const titles = await getSheetTitles(sharedId)
  const base = tabOf(type, titles)
  const form = { ...sharedRecordForm(type), sheetName: base }
  const record = [base, ...listArchiveSheets(titles, [form])]
  const read = await batchFetchSheetRangesFromApi(sharedId, [
    PERIOD_SETTINGS_SHEET,
    CATEGORIES_SHEET,
    ...record
  ])

  return { base, form, read, tabs: new Map(record.map(name => [name, read.get(name) ?? []])) }
}

/** The copy's split, payer and category, so the edit form shows (and keeps) them; null = none. */
export async function readCopyChoice(
  sharedId: string,
  type: SharedLinkTask['type'],
  ref: string
): Promise<Pick<SharedChoice, 'split' | 'payer' | 'category'> | null> {
  const { form, tabs } = await readTarget(sharedId, type)
  const found = findCopyByRef(tabs, ref)

  return found ? copyCells(found, form) : null
}

/**
 * The personal sheet's record tab of the type, whichever sheet is open: the forms are this device's
 * (the personal sheet's own names, even while a shared account is open), else the default name.
 */
export function personalTabName(personalId: string, type: SharedLinkTask['type']): string {
  const own = getSettings()?.forms.find(form => form.type === type)?.sheetName
  const fallback = sharedRecordForm(type).sheetName

  return own && (getSheetAllRows(personalId, own) || !getSheetAllRows(personalId, fallback))
    ? own
    : fallback
}

/**
 * Blanks «حساب مشترک» on the personal row (no copy exists any more): through the bridge, so the
 * open personal sheet's mirror follows and a closed one gets it on its next flush.
 */
export async function clearPersonalLink(
  personalId: string,
  recordId: string,
  type: SharedLinkTask['type']
): Promise<void> {
  const tab = personalTabName(personalId, type)
  const rows =
    getSheetAllRows(personalId, tab) ??
    (await batchFetchSheetRangesFromApi(personalId, [tab])).get(tab) ??
    []
  const column = (rows[0] ?? []).map(normalizeHeaderLabel).indexOf(SHARED_LINK_FIELD_LABEL)
  const index = rows.findIndex((row, at) => at > 0 && row[0] === recordId)

  if (column < 0 || index < 0 || !rows[index][column]) return

  const row = [...rows[index]]

  row[column] = ''
  await writeToWorkspace(personalId, {
    type: 'update',
    sheetName: tab,
    rowNumber: index + 1,
    expectedRow: rows[index],
    row,
    writeOptions: { skipActivity: true }
  })
}

/** Reads the shared sheet directly and queues the write. True: done, drop the task. */
async function send(task: SharedLinkTask): Promise<boolean> {
  if (isCopyQueued(task)) {
    await drainWorkspace(task.sharedId)
    if (isCopyQueued(task)) return false
  }

  const { base, form, read, tabs } = await readTarget(task.sharedId, task.type)
  const me = (getUserEmail() ?? '').trim().toLowerCase()
  const members = parseMembers((read.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1), 'shared')

  // Every writer re-checks right before writing (a role may have changed since the tick).
  if (!memberHasPermission(members, me, 'record', 'shared')) throw new NoRecordRight()

  // Saving the personal record replaces what a partner changed: its pending notices go.
  const supersede = () =>
    removeNotices(
      task.sharedId,
      notice => notice.recordRef === task.ref,
      read.get(PERIOD_SETTINGS_SHEET) ?? []
    ).catch(() => undefined)

  // The shared account removed the copy (no create is waiting: that would be this task):
  // the personal record is no longer shared, instead of a «در حساب مشترک» that is not true.
  if (task.kind === 'update' && !task.unlink && !findCopyByRef(tabs, task.ref)) {
    await clearPersonalLink(task.personalId, task.recordId, task.type)
    await supersede()

    return true
  }

  const operation = copyOperation({
    task,
    form,
    base,
    tabs,
    categories: rowsToGroups(read.get(CATEGORIES_SHEET) ?? [])[task.type],
    me,
    createdAt: new Date().toLocaleString('fa-IR'),
    // Stable per task: a create retried after the page closed finds the copy it already wrote.
    newId: task.id
  })

  if (operation) await writeToWorkspace(task.sharedId, operation)
  if (task.kind !== 'create') await supersede()

  return true
}

/** Why a task can never go, or null when trying again may work (offline, quota, a 5xx). */
function permanentReason(err: unknown): string | null {
  if (err instanceof NoRecordRight) return 'دسترسی «ثبت هزینه و درآمد» را در حساب مشترک ندارید'
  // A range Google rejects: a record tab the shared file no longer has, not a lost file.
  if (err instanceof SheetsApiError && err.status === 400) {
    return 'برگهٔ ثبت هزینه یا درآمد در فایل حساب مشترک پیدا نشد'
  }
  if (isSpreadsheetAccessDeniedError(err) || isPermanentApiError(err)) {
    return 'این دستگاه به فایل حساب مشترک دسترسی ندارد یا فایل پاک شده'
  }

  return null
}

function settle(task: SharedLinkTask, outcome: true | string | null): void {
  const tasks = readSharedLinks()

  // A newer task for the same copy has another id and stays. A failed one waits (even a delete)
  // until this device reaches the file again (`clearSharedLinkFailures`).
  if (outcome === true) return writeSharedLinks(tasks.filter(item => item.id !== task.id))
  // One toast per failure: a retry that fails the same way stays quiet.
  if (outcome && task.toasted !== outcome) {
    showError(`نسخهٔ «${task.values.title || 'ثبت'}» به حساب مشترک نرسید: ${outcome}`)
  }

  writeSharedLinks(
    tasks.map(item =>
      item.id === task.id
        ? {
            ...item,
            attempts: item.attempts + 1,
            ...(outcome ? { failed: outcome, toasted: outcome } : {})
          }
        : item
    )
  )
}

let running: Promise<void> | null = null

/** Sends the waiting copies, one run at a time per device; offline it leaves them queued. */
export function runSharedLinks(): Promise<void> {
  running ??= (async () => {
    const tried = new Set<string>()

    // Read again after every task: one queued while this run works is picked up by it too.
    for (;;) {
      const task = readSharedLinks().find(item => !item.failed && !tried.has(item.id))

      if (!task || offline()) return
      tried.add(task.id)
      inFlight = task.id

      const outcome = await send(task).then(
        done => done || null,
        (err: unknown) => permanentReason(err)
      )

      inFlight = ''
      settle(task, outcome)
    }
  })().finally(() => {
    running = null
  })

  return running
}

/** Persists the task first (an offline moment never loses it), then tries to send it. */
export function queueSharedLink(task: NewTask): Promise<void> {
  enqueueSharedLink(task)

  return runSharedLinks()
}
