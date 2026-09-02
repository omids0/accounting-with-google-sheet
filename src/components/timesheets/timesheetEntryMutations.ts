import type { TimesheetEntryWithRow } from './useTimesheetDetailPage'
import { isTokenValid } from '../../services/auth'
import { getSettings, isConfigured } from '../../services/settings'
import {
  createTimesheetEntry,
  deleteTimesheetEntry,
  updateTimesheetEntry
} from '../../services/timesheet'
import type { Timesheet } from '../../types'
import { showError, showSuccess } from '../../utils/toast'

export async function toggleTimesheetEntryChecked({
  item,
  checked,
  onReauth,
  onUpdated
}: {
  item: TimesheetEntryWithRow
  checked: boolean
  onReauth?: () => void
  onUpdated: (item: TimesheetEntryWithRow, checked: boolean) => void
}): Promise<boolean> {
  if (!isConfigured() || !isTokenValid()) {
    onReauth?.()

    return false
  }

  const settings = getSettings()!

  try {
    await updateTimesheetEntry(settings.spreadsheetId, item.rowNumber, {
      ...item,
      checked
    })
    onUpdated(item, checked)

    return true
  } catch (err) {
    showError(err instanceof Error ? err.message : 'خطا در به‌روزرسانی')

    return false
  }
}

export async function submitTimesheetEntry({
  timesheet,
  editingItem,
  form,
  durationMinutes,
  onReauth,
  onSuccess
}: {
  timesheet: Timesheet
  editingItem: TimesheetEntryWithRow | null
  form: { title: string; startAt: string; endAt: string; description: string }
  durationMinutes: number
  onReauth?: () => void
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  if (!isConfigured() || !isTokenValid()) {
    onReauth?.()

    return false
  }
  if (!form.title.trim()) {
    showError('عنوان الزامی است')

    return false
  }
  if (!form.startAt || !form.endAt) {
    showError('زمان شروع و پایان الزامی است')

    return false
  }
  if (durationMinutes <= 0) {
    showError('زمان پایان باید بعد از زمان شروع باشد')

    return false
  }

  const settings = getSettings()!

  try {
    if (editingItem) {
      await updateTimesheetEntry(settings.spreadsheetId, editingItem.rowNumber, {
        ...editingItem,
        title: form.title.trim(),
        startAt: form.startAt,
        endAt: form.endAt,
        durationMinutes,
        description: form.description.trim()
      })
      showSuccess('رکورد ویرایش شد')
    } else {
      await createTimesheetEntry(settings.spreadsheetId, {
        timesheetId: timesheet.id,
        title: form.title.trim(),
        startAt: form.startAt,
        endAt: form.endAt,
        description: form.description.trim()
      })
      showSuccess('رکورد ثبت شد')
    }
    await onSuccess()

    return true
  } catch (err) {
    showError(err instanceof Error ? err.message : 'خطا در ذخیره')

    return false
  }
}

export async function deleteTimesheetEntryItem({
  deletingItem,
  onSuccess
}: {
  deletingItem: TimesheetEntryWithRow
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  if (!isConfigured() || !isTokenValid()) return false

  const settings = getSettings()!

  try {
    await deleteTimesheetEntry(settings.spreadsheetId, deletingItem.rowNumber)
    showSuccess('رکورد حذف شد')
    await onSuccess()

    return true
  } catch (err) {
    showError(err instanceof Error ? err.message : 'خطا در حذف')

    return false
  }
}
