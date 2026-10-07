import { appendSheetRow, deleteSheetRow, ensureSheetWithHeaders, fetchSheetRows } from './sheets'
import type { SmsTemplate, SmsTemplatePart } from '../types'

export const SMS_TEMPLATES_SHEET = 'قالب_پیامک'

export const SMS_TEMPLATES_HEADERS = ['شناسه', 'زمان ثبت', 'شناسه حساب', 'نوع', 'واحد', 'الگو']

export type SmsTemplateWithRow = SmsTemplate & { rowNumber: number }

const DIRECTION_LABEL = { debit: 'برداشت', credit: 'واریز' } as const

function parseParts(raw: string): SmsTemplatePart[] {
  try {
    const parsed = JSON.parse(raw) as SmsTemplatePart[]

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function rowToSmsTemplate(row: string[], rowNumber: number): SmsTemplateWithRow | null {
  const id = String(row[0] ?? '').trim()
  const parts = parseParts(row[5] ?? '')

  if (!id || !parts.length) return null

  return {
    rowNumber,
    id,
    createdAt: row[1] ?? '',
    accountId: row[2] ?? '',
    direction: row[3] === DIRECTION_LABEL.credit ? 'credit' : 'debit',
    unit: row[4] === 'toman' ? 'toman' : 'rial',
    parts
  }
}

export function smsTemplateToRow(template: SmsTemplate): string[] {
  return [
    template.id,
    template.createdAt,
    template.accountId,
    DIRECTION_LABEL[template.direction],
    template.unit,
    JSON.stringify(template.parts)
  ]
}

export async function ensureSmsTemplatesSheet(spreadsheetId: string): Promise<void> {
  await ensureSheetWithHeaders(spreadsheetId, SMS_TEMPLATES_SHEET, SMS_TEMPLATES_HEADERS)
}

export async function fetchSmsTemplates(spreadsheetId: string): Promise<SmsTemplateWithRow[]> {
  await ensureSmsTemplatesSheet(spreadsheetId)

  const rows = await fetchSheetRows(spreadsheetId, SMS_TEMPLATES_SHEET)

  return rows
    .map((row, index) => rowToSmsTemplate(row, index + 2))
    .filter((item): item is SmsTemplateWithRow => item !== null)
}

export async function createSmsTemplate(
  spreadsheetId: string,
  input: Omit<SmsTemplate, 'id' | 'createdAt'>
): Promise<SmsTemplate> {
  const template: SmsTemplate = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toLocaleString('fa-IR')
  }

  await ensureSmsTemplatesSheet(spreadsheetId)
  await appendSheetRow(spreadsheetId, SMS_TEMPLATES_SHEET, smsTemplateToRow(template))

  return template
}

export async function deleteSmsTemplate(spreadsheetId: string, rowNumber: number): Promise<void> {
  await deleteSheetRow(spreadsheetId, SMS_TEMPLATES_SHEET, rowNumber)
}

/** Bottom-up so earlier deletes do not shift the rows still to delete. */
export async function deleteAccountSmsTemplates(
  spreadsheetId: string,
  accountId: string
): Promise<void> {
  const templates = await fetchSmsTemplates(spreadsheetId)
  const rows = templates
    .filter(template => template.accountId === accountId)
    .map(template => template.rowNumber)
    .sort((a, b) => b - a)

  for (const rowNumber of rows) await deleteSmsTemplate(spreadsheetId, rowNumber)
}
