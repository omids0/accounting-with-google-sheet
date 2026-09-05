import type { TimesheetEntryWithRow } from './useTimesheetDetailPage'
import { getSettings, isConfigured } from '../../services/settings'
import {
  createTimesheetEntry,
  deleteTimesheetEntry,
  updateTimesheetEntry
} from '../../services/timesheet'
import type { Timesheet } from '../../types'
import { requireAuth } from '../../utils/authGuard'
import { showError, showSuccess } from '../../utils/toast'

export async function toggleTimesheetEntryChecked({
  item,
  checked,
  onUpdated
}: {
  item: TimesheetEntryWithRow
  checked: boolean
  onUpdated: (item: TimesheetEntryWithRow, checked: boolean) => void
}): Promise<boolean> {
  if (!isConfigured() || !requireAuth()) return false

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
  onSuccess
}: {
  timesheet: Timesheet
  editingItem: TimesheetEntryWithRow | null
  form: { title: string; startAt: string; endAt: string; description: string }
  durationMinutes: number
  onSuccess: () => Promise<void>
}): Promise<boolean> {
  if (!isConfigured() || !requireAuth()) return false
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
  if (!isConfigured() || !requireAuth()) return false

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
