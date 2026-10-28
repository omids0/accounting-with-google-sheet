import { setMemberSetting } from './buildingSettings'
import {
  norm,
  noticeKey,
  readNotices,
  removeNotices,
  type SharedNotice,
  type StoredNotice
} from './sharedNotices'

/**
 * Inform-only notices: a record made in the shared account itself that a member other than its
 * creator edited or deleted leaves one row for the creator in «تنظیمات دوره»:
 * `اعلان:<creator>:i-<recordId>-<field>`. The creator's device shows it on the shared home with
 * «باشه»; nothing is applied anywhere (a copy of a personal record keeps the apply-or-ignore
 * notices of `sharedNotices`).
 */

export const informRef = (recordId: string) => `record:${recordId}`

const informId = (recordId: string, field: SharedNotice['field']) => `i-${recordId}-${field}`

const isInformOf = (notice: StoredNotice, recordId: string) =>
  notice.inform === true && notice.recordRef === informRef(recordId)

/**
 * Writes the notice for the record's creator unless they made the change themselves. One row per
 * record and field: another edit before the creator looked updates it and keeps the first «از»
 * value, so 800 → 850 → 900 reads «از ۸۰۰ به ۹۰۰»; editing back to the first value removes it. A
 * delete replaces the pending edit notices of that record.
 */
export async function raiseInformNotice(
  sharedId: string,
  record: { id: string; creator: string },
  editor: string,
  change: Pick<SharedNotice, 'field' | 'old' | 'new' | 'kind' | 'title'>
): Promise<boolean> {
  const creator = norm(record.creator)
  const by = norm(editor)

  if (!record.id || !creator || creator === by) return false

  const id = informId(record.id, change.field)

  if (change.kind === 'delete') {
    await removeNotices(sharedId, notice => isInformOf(notice, record.id), undefined, creator)
  }

  const pending = readNotices(sharedId, creator).find(notice => notice.id === id)
  const old = change.kind === 'edit' && pending ? pending.old : change.old

  if (change.kind === 'edit' && old === change.new) {
    if (pending) await removeNotices(sharedId, notice => notice.id === id, undefined, creator)

    return false
  }

  const notice: SharedNotice = {
    ...change,
    old,
    recordRef: informRef(record.id),
    by,
    time: new Date().toISOString(),
    inform: true
  }

  await setMemberSetting(sharedId, noticeKey(creator, id), JSON.stringify(notice))

  return true
}
