import { FILES_API } from './driveFiles'
import { apiRequest, SheetsApiError } from './sheetsApi'
import { toUserMessage } from '../utils/userMessage'

/**
 * Who may open a Drive file, with the existing `drive.file` scope: the app grants, changes and
 * takes back a person's access to the building sheet. Drive answers only for a file this account
 * created or opened with the app, and only when the account may share it.
 */
export type DriveShareRole = 'writer' | 'reader'

interface DrivePermissionRow {
  id: string
  emailAddress?: string
  role?: string
}

const permissionsUrl = (fileId: string) => `${FILES_API}/${encodeURIComponent(fileId)}/permissions`

const normalizeEmail = (email: string) => email.trim().toLowerCase()

/** Gives `email` access; Drive sends them its sharing e-mail with `message` when one is given. */
export async function shareFile(
  fileId: string,
  email: string,
  role: DriveShareRole,
  message?: string
): Promise<void> {
  const notify = message
    ? `&sendNotificationEmail=true&emailMessage=${encodeURIComponent(message)}`
    : '&sendNotificationEmail=false'

  await apiRequest(`${permissionsUrl(fileId)}?supportsAllDrives=true${notify}`, {
    method: 'POST',
    body: JSON.stringify({ type: 'user', role, emailAddress: normalizeEmail(email) })
  })
}

async function findPermission(fileId: string, email: string): Promise<DrivePermissionRow | null> {
  const fields = encodeURIComponent('permissions(id,emailAddress,role)')

  const data = await apiRequest<{ permissions?: DrivePermissionRow[] }>(
    `${permissionsUrl(fileId)}?fields=${fields}&supportsAllDrives=true`
  )

  const key = normalizeEmail(email)

  return data.permissions?.find(item => normalizeEmail(item.emailAddress ?? '') === key) ?? null
}

/**
 * Moves `email` to `role`. The owner never changes. Someone Drive does not know yet is added
 * without an e-mail: their invitation already went out when they were invited.
 */
export async function setFileRole(
  fileId: string,
  email: string,
  role: DriveShareRole
): Promise<void> {
  const found = await findPermission(fileId, email)

  if (!found) return shareFile(fileId, email, role)
  if (found.role === 'owner' || found.role === role) return

  await apiRequest(
    `${permissionsUrl(fileId)}/${encodeURIComponent(found.id)}?supportsAllDrives=true`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role })
    }
  )
}

/** Takes `email`'s access back. Nothing to do when Drive does not list them; the owner stays. */
export async function unshareFile(fileId: string, email: string): Promise<void> {
  const found = await findPermission(fileId, email)

  if (!found || found.role === 'owner') return

  await apiRequest(
    `${permissionsUrl(fileId)}/${encodeURIComponent(found.id)}?supportsAllDrives=true`,
    {
      method: 'DELETE'
    }
  )
}

/** Plain words for a share that Drive refused; the generic mapper's «no access» would mislead. */
export function shareErrorMessage(err: unknown, fallback = 'ارسال دعوت ناموفق بود'): string {
  const status = err instanceof SheetsApiError ? err.status : 0

  if (
    !status &&
    (err instanceof TypeError || (typeof navigator !== 'undefined' && !navigator.onLine))
  ) {
    return 'اینترنت وصل نیست؛ برای دعوت و تغییر دسترسی باید آنلاین باشید'
  }
  if (status === 403) {
    return 'گوگل اجازهٔ اشتراک این فایل را نداد. فقط مالک فایل یا ویرایشگری که اجازهٔ اشتراک دارد می‌تواند دسترسی بدهد'
  }
  if (status === 404) return 'فایل ساختمان در حساب گوگل شما پیدا نشد'
  if (status === 400) return 'گوگل این ایمیل را نپذیرفت؛ ایمیل یک حساب گوگل را وارد کنید'
  if (status === 429) return 'گوگل درخواست‌ها را موقتاً محدود کرده؛ کمی بعد دوباره تلاش کنید'

  return toUserMessage(err, fallback)
}
