import type { WorkspaceEntry } from '../../hooks/useEnterWorkspace'
import { getChild } from '../../services/childrenRegistry'
import { markSharedAccessLost } from '../../services/sharedAccessLost'

/**
 * «مشاهده» of a child: the parent's `useEnterWorkspace` entry for a child's account. The page it
 * opens is the month summary (`child-home`); a refused file marks the child «دسترسی قطع شد».
 */
export const CHILD_ENTRY: WorkspaceEntry = {
  kind: 'child',
  destination: requested => requested ?? 'child-home',
  busyMessage: id => `در حال باز کردن حساب ${getChild(id)?.name ?? 'فرزند'}…`,
  failMessage: 'باز کردن حساب فرزند ناموفق بود',
  denied: {
    message: 'دسترسی شما به این حساب قطع شده است؛ شاید فرزندتان اشتراک فایل را برداشته است',
    onDenied: markSharedAccessLost
  }
}
