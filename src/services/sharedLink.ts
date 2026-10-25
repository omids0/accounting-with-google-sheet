import { getUserEmail } from './auth'
import { memberHasPermission, parseMembers } from './buildingRoles'
import { rowsToGroups } from './categoryGroups'
import { listArchiveSheets } from './recordArchive'
import { getSettings } from './settings'
import { readSharedLinks, writeSharedLinks, type SharedLinkTask } from './sharedLinkPrefs'
import { copyOperation, sharedRecordForm } from './sharedLinkRows'
import { CATEGORIES_SHEET, PERIOD_SETTINGS_SHEET } from './sheetNames'
import { isPermanentApiError, isSpreadsheetAccessDeniedError } from './sheetsApi'
import { getSheetTitles } from './sheetsEnsure'
import { normalizeSheetTitle } from './sheetsMeta'
import { batchFetchSheetRangesFromApi } from './sheetsRows'
import { getOutboxEntries } from './syncOutbox'
import { drainWorkspace, writeToWorkspace } from './workspaceBridge'
import { showError } from '../utils/toast'

export { pendingSharedLink } from './sharedLinkPrefs'
export { buildCopyRow, findCopyByRef, sharedRef } from './sharedLinkRows'

/**
 * The personal → shared link (spec «Linking a personal record»): a per-device queue of copies to
 * create, update or delete in the shared account, sent through the bridge (`writeToWorkspace`)
 * after a direct read of the shared sheet, so a retry never writes a second copy.
 */

type NewTask = Omit<SharedLinkTask, 'id' | 'attempts'>

/** The task being sent right now: a delete can no longer cancel it. */
let inFlight = ''

/**
 * One task per copy (`ref`): a newer one replaces the queued one. A delete cancels a create that
 * never left this device; an update before its create left is still that create.
 */
export function enqueueSharedLink(task: NewTask): void {
  const tasks = readSharedLinks()
  const queued = tasks.find(item => item.ref === task.ref)
  const rest = tasks.filter(item => item.ref !== task.ref)
  const unsent = queued?.kind === 'create' && queued.id !== inFlight

  if (task.kind === 'delete' && unsent) return writeSharedLinks(rest)

  const kind = task.kind === 'update' && unsent ? 'create' : task.kind

  writeSharedLinks([...rest, { ...task, kind, id: crypto.randomUUID(), attempts: 0 }])
}

class NoRecordRight extends Error {}

const offline = () => typeof navigator !== 'undefined' && !navigator.onLine

/** The copy's append still waits in the shared sheet's outbox: it cannot be found by a read yet. */
const isCopyQueued = (sharedId: string, ref: string) =>
  getOutboxEntries(sharedId).some(
    entry => entry.operation.type === 'append' && entry.operation.row.includes(ref)
  )

/** The shared record tab of the type: the default name, else the one this device's forms use. */
function tabOf(type: SharedLinkTask['type'], titles: string[]): string {
  const own = getSettings()?.forms.find(form => form.type === type)?.sheetName
  const names = [sharedRecordForm(type).sheetName, own ?? '']
  const has = (name: string) => titles.some(title => normalizeSheetTitle(title) === name)

  return names.find(name => name && has(normalizeSheetTitle(name))) ?? names[0]
}

/** Reads the shared sheet directly and queues the write. True: done, drop the task. */
async function send(task: SharedLinkTask): Promise<boolean> {
  if (isCopyQueued(task.sharedId, task.ref)) {
    await drainWorkspace(task.sharedId)
    if (isCopyQueued(task.sharedId, task.ref)) return false
  }

  const titles = await getSheetTitles(task.sharedId)
  const base = tabOf(task.type, titles)
  const form = { ...sharedRecordForm(task.type), sheetName: base }
  const record = [base, ...listArchiveSheets(titles, [form])]
  const read = await batchFetchSheetRangesFromApi(task.sharedId, [
    PERIOD_SETTINGS_SHEET,
    CATEGORIES_SHEET,
    ...record
  ])
  const me = (getUserEmail() ?? '').trim().toLowerCase()
  const members = parseMembers((read.get(PERIOD_SETTINGS_SHEET) ?? []).slice(1), 'shared')

  // Every writer re-checks right before writing (a role may have changed since the tick).
  if (!memberHasPermission(members, me, 'record', 'shared')) throw new NoRecordRight()

  const operation = copyOperation({
    task,
    form,
    base,
    tabs: new Map(record.map(name => [name, read.get(name) ?? []])),
    categories: rowsToGroups(read.get(CATEGORIES_SHEET) ?? [])[task.type],
    me,
    createdAt: new Date().toLocaleString('fa-IR'),
    newId: crypto.randomUUID()
  })

  if (operation) await writeToWorkspace(task.sharedId, operation)

  return true
}

/** Why a task can never go, or null when trying again may work (offline, quota, a 5xx). */
function permanentReason(err: unknown): string | null {
  if (err instanceof NoRecordRight) return 'دسترسی «ثبت هزینه و درآمد» را در حساب مشترک ندارید'
  if (isSpreadsheetAccessDeniedError(err) || isPermanentApiError(err)) {
    return 'این دستگاه به فایل حساب مشترک دسترسی ندارد یا فایل پاک شده'
  }

  return null
}

function settle(task: SharedLinkTask, outcome: true | string | null): void {
  const tasks = readSharedLinks()

  // A newer task for the same copy has another id and stays. A failed delete or unlink belongs
  // to a record that is gone, so no form can offer «لغو ارسال»: reported once, then dropped.
  const drop = outcome === true || (!!outcome && (task.kind === 'delete' || !!task.unlink))

  if (outcome && outcome !== true) {
    showError(`نسخهٔ «${task.values.title || 'ثبت'}» به حساب مشترک نرسید: ${outcome}`)
  }
  if (drop) return writeSharedLinks(tasks.filter(item => item.id !== task.id))

  writeSharedLinks(
    tasks.map(item =>
      item.id === task.id
        ? { ...item, attempts: item.attempts + 1, ...(outcome ? { failed: outcome } : {}) }
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
