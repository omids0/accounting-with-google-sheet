import type { SortDirection } from '../hooks/useListSort'
import type { Timesheet, TimesheetEntry } from '../types'

export type TimesheetListSortId = 'title' | 'createdAt'

export type TimesheetEntrySortId = 'startAt' | 'duration' | 'title' | 'checked'

export const TIMESHEET_LIST_SORT_OPTIONS = [
  { id: 'title' as const, label: 'عنوان', defaultDirection: 'asc' as const },
  { id: 'createdAt' as const, label: 'تاریخ ایجاد', defaultDirection: 'desc' as const }
]

export const TIMESHEET_ENTRY_SORT_OPTIONS = [
  { id: 'startAt' as const, label: 'تاریخ شروع', defaultDirection: 'desc' as const },
  { id: 'duration' as const, label: 'مدت کارکرد', defaultDirection: 'desc' as const },
  { id: 'title' as const, label: 'عنوان', defaultDirection: 'asc' as const },
  { id: 'checked' as const, label: 'وضعیت تایید', defaultDirection: 'asc' as const }
]

function applyDirection(result: number, direction: SortDirection): number {
  return direction === 'asc' ? result : -result
}

export function compareTimesheets<T extends Timesheet>(
  a: T,
  b: T,
  sort: TimesheetListSortId,
  direction: SortDirection
): number {
  let result = 0

  switch (sort) {
    case 'title':
      result = a.title.localeCompare(b.title, 'fa')
      break
    case 'createdAt':
      result = a.createdAt.localeCompare(b.createdAt)
      break
  }

  return applyDirection(result, direction)
}

export function compareTimesheetEntries<T extends TimesheetEntry>(
  a: T,
  b: T,
  sort: TimesheetEntrySortId,
  direction: SortDirection
): number {
  let result = 0

  switch (sort) {
    case 'startAt':
      result = a.startAt.localeCompare(b.startAt)
      break
    case 'duration':
      result = a.durationMinutes - b.durationMinutes
      break
    case 'title':
      result = a.title.localeCompare(b.title, 'fa')
      break
    case 'checked':
      result = Number(a.checked) - Number(b.checked)
      break
  }

  return applyDirection(result, direction)
}
