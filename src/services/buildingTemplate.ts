import { getUserEmail } from './auth'
import { JOURNEY_ROW, type JourneyState } from './buildingJourney'
import { ROLE_ROW_PREFIX } from './buildingRoles'
import { buildingCategoryGroups, buildingSubcategories } from './buildingTemplateData'
import { groupsToRows } from './categoryGroups'
import { BUILDING_SHEET_SPECS, MODULE_SHEET_SPECS } from './moduleSheetSpecs'
import { getDefaultSettings, getDefaultForms, getSettings, saveSettings } from './settings'
import {
  BUILDING_SHEET,
  CATEGORIES_SHEET,
  PERIOD_SETTINGS_SHEET,
  WALLET_LEDGER_SHEET,
  WALLET_SHEET
} from './sheetNames'
import { createSpreadsheet } from './sheetsCreate'
import { ensureManySheetsWithHeaders } from './sheetsEnsure'
import { appendSheetRowsApi } from './sheetsOutboxApi'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { accountToRow } from './wallet'
import { WALLET_ACCOUNT_KIND_BANK, WALLET_ACCOUNT_KIND_CASH } from './walletCategories'
import { ledgerEntry, ledgerRow } from './walletLedger'
import { setWorkspaceType, WORKSPACE_BUILDING_VALUE, WORKSPACE_TYPE_ROW } from './workspace'
import type {
  ChargeMethod,
  FundAccountType,
  VacancyRule
} from '../components/buildings/buildingOptions'
import { withBuildingFields } from '../components/form/buildingFields'
import type { CustomForm, WalletAccount } from '../types'
import { getTodayIso } from '../utils/jalaliDate'

/** The «ساختمان» tab's single row (Step 2 collects it in the journey). */
export interface BuildingProfile {
  name: string
  address: string
  floors: number
  defaultCharge: number
  chargeMethod: ChargeMethod
  /** Day of the Jalali month the monthly charge is issued. */
  issueDay: number
  /** Days after issue the charge falls due. */
  dueDay: number
  vacancyRule: VacancyRule
}

/** A fund account to create with its opening balance. */
export interface FundAccountInput {
  title: string
  type: FundAccountType
  /** Bank accounts only; the SMS routing of Step 6 matches it. */
  cardNumber: string
  balance: number
}

/** Tabs written at creation; the rest are created when the building is first opened. */
const TEMPLATE_SHEETS = [
  PERIOD_SETTINGS_SHEET,
  CATEGORIES_SHEET,
  BUILDING_SHEET,
  WALLET_SHEET,
  WALLET_LEDGER_SHEET
]

export interface BuildingTemplateRows {
  period: string[][]
  categories: string[][]
  building: string[][]
  wallet: string[][]
  ledger: string[][]
}

export function buildingProfileRow(profile: BuildingProfile, editedAt: string): string[] {
  return [
    profile.name.trim(),
    profile.address.trim(),
    String(profile.floors),
    String(profile.defaultCharge),
    profile.chargeMethod,
    String(profile.issueDay),
    String(profile.dueDay),
    profile.vacancyRule,
    editedAt
  ]
}

/** The wallet account a fund account becomes. */
export function fundAccount(input: FundAccountInput, createdAt: string): WalletAccount {
  const bank = input.type === 'bank'

  return {
    id: crypto.randomUUID(),
    createdAt,
    title: input.title.trim(),
    balance: input.balance,
    note: '',
    accountKind: bank ? WALLET_ACCOUNT_KIND_BANK : WALLET_ACCOUNT_KIND_CASH,
    bankId: '',
    cardNumber: bank ? input.cardNumber.trim() : '',
    cardHolder: '',
    cardColor: '',
    cardColorPrimary: '',
    cardColorSecondary: '',
    accountNumber: '',
    iban: ''
  }
}

/** Everything a new building spreadsheet starts with, as sheet rows (no I/O). */
export function buildTemplateRows(
  profile: BuildingProfile,
  accounts: FundAccountInput[],
  creatorEmail: string,
  now = new Date()
): BuildingTemplateRows {
  const stamp = now.toLocaleString('fa-IR')

  const wallets = accounts.map(account => fundAccount(account, stamp))

  return {
    period: [
      [WORKSPACE_TYPE_ROW, WORKSPACE_BUILDING_VALUE, stamp],
      ...(creatorEmail
        ? [[`${ROLE_ROW_PREFIX}${creatorEmail.trim().toLowerCase()}`, 'manager', stamp]]
        : [])
    ],
    categories: groupsToRows(buildingCategoryGroups(), buildingSubcategories()),
    building: [buildingProfileRow(profile, stamp)],
    wallet: wallets.map(accountToRow),
    // The balance each account starts with, like a hand-made account does (round 7 ledger).
    ledger: wallets
      .filter(account => account.balance !== 0)
      .map(account =>
        ledgerRow(
          ledgerEntry(account.id, account.balance, account.balance, {
            title: 'موجودی اولیه حساب',
            date: getTodayIso(),
            source: 'موجودی اولیه'
          })
        )
      )
  }
}

/** The income / expense forms of a building: the usual standard fields plus the building ones. */
export function buildingForms(): CustomForm[] {
  return withBuildingFields(getDefaultForms())
}

/** Lists the spreadsheet as a building without making it the active one. */
export function registerBuildingSpreadsheet(id: string, name: string): void {
  const settings = getSettings() ?? getDefaultSettings()

  const known = settings.spreadsheets ?? []

  saveSettings({
    ...settings,
    spreadsheets: known.some(sheet => sheet.id === id)
      ? known.map(sheet => (sheet.id === id ? { ...sheet, kind: 'building' as const } : sheet))
      : [...known, { id, name, createdAt: new Date().toISOString(), kind: 'building' as const }]
  })
}

/**
 * Creates the spreadsheet «حسابداری · ساختمان <name>» with the building forms, categories,
 * profile row, fund accounts (with their opening balances) and the creator as «مدیر», and lists it
 * in the settings as a building. Written straight to Sheets: the new spreadsheet is not active, so
 * nothing of it touches the manager's own books.
 */
export async function createBuildingSpreadsheet(
  profile: BuildingProfile,
  accounts: FundAccountInput[],
  /** Where the setup journey stands; the row stays until the summary is confirmed. */
  journey?: JourneyState
): Promise<string> {
  const title = formatSpreadsheetTitle(`ساختمان ${profile.name.trim()}`)

  const rows = buildTemplateRows(profile, accounts, getUserEmail() ?? '')

  if (journey)
    rows.period.push([JOURNEY_ROW, JSON.stringify(journey), new Date().toLocaleString('fa-IR')])

  const spreadsheetId = await createSpreadsheet(title, buildingForms())

  await ensureManySheetsWithHeaders(
    spreadsheetId,
    [...MODULE_SHEET_SPECS, ...BUILDING_SHEET_SPECS].filter(spec =>
      TEMPLATE_SHEETS.includes(spec.sheetName)
    )
  )

  const writes: [string, string[][]][] = [
    [PERIOD_SETTINGS_SHEET, rows.period],
    [CATEGORIES_SHEET, rows.categories],
    [BUILDING_SHEET, rows.building],
    [WALLET_SHEET, rows.wallet],
    [WALLET_LEDGER_SHEET, rows.ledger]
  ]

  for (const [sheetName, sheetRows] of writes) {
    await appendSheetRowsApi(spreadsheetId, sheetName, sheetRows)
  }

  // Known before the first activation, so its forms and category locks are the building's.
  setWorkspaceType(spreadsheetId, 'building')
  registerBuildingSpreadsheet(spreadsheetId, title)

  return spreadsheetId
}
