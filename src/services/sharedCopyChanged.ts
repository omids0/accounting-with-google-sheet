import { getUserEmail } from './auth'
import { getSettings } from './settings'
import { raiseInformNotice } from './sharedInformNotices'
import { applyNotice, raiseNotice, type SharedNotice } from './sharedNotices'
import {
  SHARED_CREATOR_FIELD_ID,
  SHARED_REF_FIELD_ID,
  SHARED_SPLIT_FIELD_ID
} from '../components/form/sharedFields'

/** A shared record edited or deleted inside the shared account (spec «When the partner edits…»). */
export interface SharedCopyChange {
  kind: 'edit' | 'delete'
  recordId: string
  /** The row as it was before the change. */
  values: Record<string, string>
  /** For an edit: the new values by field id (only the fields the edit touched). */
  next?: Record<string, string | number>
}

/** The fields a notice covers (v1), by the shared record's field id. */
const NOTICE_FIELDS = {
  amount: 'amount',
  title: 'title',
  category: 'category',
  split: SHARED_SPLIT_FIELD_ID
} as const

/**
 * Called after a shared record's edit or delete was written (the shared copy changes at once). A
 * copy of a personal record (`مرجع` = `share:…`) changed by someone who is not its creator raises
 * one notice per changed field for the creator (apply or ignore); any other record changed by a
 * non-creator raises an inform-only notice (`raiseInformNotice`). The creator deleting their own
 * copy clears the personal record's shared marker instead. Never throws: the shared write already
 * happened.
 */
export async function onSharedCopyChanged({
  kind,
  recordId,
  values,
  next = {}
}: SharedCopyChange): Promise<void> {
  const sharedId = getSettings()?.spreadsheetId ?? ''
  const copy = {
    ref: values[SHARED_REF_FIELD_ID] ?? '',
    creator: values[SHARED_CREATOR_FIELD_ID] ?? ''
  }
  const editor = getUserEmail() ?? ''
  const title = values.title ?? ''
  const raise = (change: Omit<SharedNotice, 'by' | 'time' | 'recordRef'>) =>
    copy.ref.startsWith('share:')
      ? raiseNotice(sharedId, copy, editor, change)
      : raiseInformNotice(sharedId, { id: recordId, creator: copy.creator }, editor, change)

  try {
    if (kind === 'delete') {
      const change = { field: 'delete', kind, old: values.amount ?? '', new: '', title } as const
      const own = copy.creator.trim().toLowerCase() === editor.trim().toLowerCase()

      // My own copy: my personal record is simply not shared any more.
      if (own && copy.ref.startsWith('share:')) {
        await applyNotice({ ...change, recordRef: copy.ref, by: editor, time: '' })
      } else {
        await raise(change)
      }

      return
    }

    for (const [field, id] of Object.entries(NOTICE_FIELDS)) {
      const old = String(values[id] ?? '').trim()
      const now = id in next ? String(next[id]).trim() : old

      if (now !== old) {
        await raise({
          field: field as SharedNotice['field'],
          kind,
          old,
          new: now,
          title
        })
      }
    }
  } catch {
    // A notice that could not be written is lost; the shared record itself is saved.
  }
}
