import {
  appendSheetRow,
  deleteSheetRow,
  ensureSheetWithHeaders,
  fetchSheetRows,
  replaceSheetDataRows,
  updateSheetRow
} from './sheets'
import type {
  Counterparty,
  CounterpartyAccount,
  CounterpartyLocation,
  CounterpartyPhone
} from '../types/counterparties'

export const COUNTERPARTIES_SHEET = 'طرف_حساب‌ها'

export const COUNTERPARTIES_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'نام',
  'نام خانوادگی',
  'تاریخ تولد',
  'آدرس',
  'لوکیشن',
  'شماره تماس',
  'حساب‌ها',
  'توضیحات'
]

export function parseCounterpartyAccounts(raw: string): CounterpartyAccount[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as CounterpartyAccount[]

    if (!Array.isArray(parsed)) return []

    return parsed
      .map(item => ({
        bankName: String(item.bankName ?? '').trim(),
        accountNumber: String(item.accountNumber ?? '').trim()
      }))
      .filter(item => item.bankName || item.accountNumber)
  } catch {
    return []
  }
}

export function parseCounterpartyPhones(raw: string): CounterpartyPhone[] {
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown

    if (Array.isArray(parsed)) {
      return parsed
        .map(item =>
          typeof item === 'string'
            ? { number: item.trim() }
            : { number: String((item as CounterpartyPhone).number ?? '').trim() }
        )
        .filter(item => item.number)
    }
  } catch {
    const legacy = String(raw).trim()

    if (legacy) return [{ number: legacy }]
  }

  return []
}

export function parseCounterpartyLocation(raw: string): CounterpartyLocation | null {
  const trimmed = String(raw ?? '').trim()

  if (!trimmed) return null

  try {
    const parsed = JSON.parse(trimmed) as Partial<CounterpartyLocation>

    if (typeof parsed.lat === 'number' && typeof parsed.lng === 'number') {
      return { lat: parsed.lat, lng: parsed.lng }
    }
  } catch {
    const [latRaw, lngRaw] = trimmed.split(',').map(part => Number(part.trim()))

    if (!Number.isNaN(latRaw) && !Number.isNaN(lngRaw)) {
      return { lat: latRaw, lng: lngRaw }
    }
  }

  return null
}

export function formatCounterpartyLocation(location: CounterpartyLocation | null): string {
  if (!location) return ''

  return JSON.stringify(location)
}

export function formatCounterpartyPhones(phones: CounterpartyPhone[]): string {
  return JSON.stringify(phones)
}

export function formatLocationLabel(location: CounterpartyLocation | null): string {
  if (!location) return ''

  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
}

function rowToCounterparty(
  row: string[],
  rowNumber: number
): (Counterparty & { rowNumber: number }) | null {
  const id = String(row[0] ?? '').trim()

  if (!id) return null

  return {
    rowNumber,
    id,
    createdAt: row[1] ?? '',
    firstName: row[2] ?? '',
    lastName: row[3] ?? '',
    birthDate: row[4] ?? '',
    address: row[5] ?? '',
    location: parseCounterpartyLocation(row[6] ?? ''),
    phones: parseCounterpartyPhones(row[7] ?? ''),
    accounts: parseCounterpartyAccounts(row[8] ?? ''),
    note: row[9] ?? ''
  }
}

function counterpartyToRow(item: Counterparty): string[] {
  return [
    item.id,
    item.createdAt,
    item.firstName,
    item.lastName,
    item.birthDate,
    item.address,
    formatCounterpartyLocation(item.location),
    formatCounterpartyPhones(item.phones),
    JSON.stringify(item.accounts),
    item.note
  ]
}

export function counterpartyRowFromImportCells(cells: (string | undefined)[]): string[] | null {
  const firstName = String(cells[2] ?? '').trim()
  const lastName = String(cells[3] ?? '').trim()

  if (!firstName || !lastName) return null

  return counterpartyToRow({
    id: cells[0] ?? '',
    createdAt: cells[1] ?? '',
    firstName,
    lastName,
    birthDate: cells[4] ?? '',
    address: cells[5] ?? '',
    location: parseCounterpartyLocation(cells[6] ?? ''),
    phones: parseCounterpartyPhones(cells[7] ?? ''),
    accounts: parseCounterpartyAccounts(cells[8] ?? ''),
    note: cells[9] ?? ''
  })
}

export function getCounterpartyFullName(
  item: Pick<Counterparty, 'firstName' | 'lastName'>
): string {
  return [item.firstName, item.lastName].filter(Boolean).join(' ').trim()
}

export function sortCounterparties<T extends Counterparty>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const nameA = getCounterpartyFullName(a)
    const nameB = getCounterpartyFullName(b)

    return nameA.localeCompare(nameB, 'fa')
  })
}

export async function ensureCounterpartiesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, COUNTERPARTIES_SHEET, COUNTERPARTIES_HEADERS)
}

export async function fetchCounterparties(
  spreadsheetId: string
): Promise<(Counterparty & { rowNumber: number })[]> {
  await ensureCounterpartiesSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, COUNTERPARTIES_SHEET)

  return rows
    .map((row, index) => ({ row, rowNumber: index + 2 }))
    .map(({ row, rowNumber }) => rowToCounterparty(row, rowNumber))
    .filter((item): item is Counterparty & { rowNumber: number } => item !== null)
}

export async function reorderCounterparties(
  spreadsheetId: string,
  orderedIds: string[]
): Promise<void> {
  await ensureCounterpartiesSheet(spreadsheetId)

  const items = await fetchCounterparties(spreadsheetId)
  const byId = new Map(items.map(item => [item.id, item]))
  const ordered: (Counterparty & { rowNumber: number })[] = []

  for (const id of orderedIds) {
    const item = byId.get(id)

    if (item) {
      ordered.push(item)
      byId.delete(id)
    }
  }

  for (const item of byId.values()) {
    ordered.push(item)
  }

  await replaceSheetDataRows(
    spreadsheetId,
    COUNTERPARTIES_SHEET,
    ordered.map(item => counterpartyToRow(item)),
    COUNTERPARTIES_HEADERS.length
  )
}

export async function createCounterparty(
  spreadsheetId: string,
  data: Omit<Counterparty, 'id' | 'createdAt'>
): Promise<Counterparty> {
  const item: Counterparty = {
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR'),
    ...data
  }

  await appendSheetRow(spreadsheetId, COUNTERPARTIES_SHEET, counterpartyToRow(item))

  return item
}

export async function updateCounterparty(
  spreadsheetId: string,
  rowNumber: number,
  item: Counterparty
): Promise<void> {
  await updateSheetRow(spreadsheetId, COUNTERPARTIES_SHEET, rowNumber, counterpartyToRow(item))
}

export async function deleteCounterparty(spreadsheetId: string, rowNumber: number): Promise<void> {
  await deleteSheetRow(spreadsheetId, COUNTERPARTIES_SHEET, rowNumber)
}
