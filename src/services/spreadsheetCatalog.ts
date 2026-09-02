/** Standard title format: «حسابداری · 1406» — used to find sheets across devices in Google Drive */
export const SPREADSHEET_TITLE_PREFIX = 'حسابداری · '

export function formatSpreadsheetTitle(label: string): string {
  const trimmed = label.trim()

  if (!trimmed) {
    throw new Error('نام شیت را وارد کنید')
  }
  if (trimmed.startsWith(SPREADSHEET_TITLE_PREFIX)) {
    return trimmed
  }

  return `${SPREADSHEET_TITLE_PREFIX}${trimmed}`
}

export function getSpreadsheetLabel(title: string): string {
  if (title.startsWith(SPREADSHEET_TITLE_PREFIX)) {
    return title.slice(SPREADSHEET_TITLE_PREFIX.length)
  }

  const legacy = title.match(/^حسابداری\s+(.+)$/)

  return legacy ? legacy[1] : title
}

export function isAccountingSpreadsheetTitle(title: string): boolean {
  return title.startsWith(SPREADSHEET_TITLE_PREFIX) || /^حسابداری\s+/.test(title)
}

export function parseSpreadsheetIdFromUrl(input: string): string | null {
  const trimmed = input.trim()

  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)

  return match?.[1] ?? (trimmed.length >= 20 && !trimmed.includes('/') ? trimmed : null)
}
