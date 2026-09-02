export interface Timesheet {
  id: string
  createdAt: string
  title: string
  description: string
}

export interface TimesheetEntry {
  id: string
  timesheetId: string
  createdAt: string
  title: string
  startAt: string
  endAt: string
  durationMinutes: number
  description: string
  checked: boolean
}
