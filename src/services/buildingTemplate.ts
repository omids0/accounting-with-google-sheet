import { getUserEmail } from './auth'
import { JOURNEY_ROW, type JourneyState } from './buildingJourney'
import { buildingLabel } from './buildingLabel'
import { ROLE_ROW_PREFIX } from './buildingRoles'
import { buildingCategoryGroups, buildingSubcategories } from './buildingTemplateData'
import { groupsToRows, withDefaults } from './categoryGroups'
import { markCompactGridsMigrated } from './migrateCompactGrids'
import { BUILDING_MODULE_SHEET_SPECS, BUILDING_SHEET_SPECS } from './moduleSheetSpecs'
import { MEMBERSHIP_DATE_KEY } from './periodSettings'
import { getDefaultSettings, getDefaultForms, getSettings, saveSettings } from './settings'
import {
  BUILDING_SHEET,
  CATEGORIES_SHEET,
  PERIOD_SETTINGS_SHEET,
  WALLET_LEDGER_SHEET,
  WALLET_SHEET
} from './sheetNames'
import { createSpreadsheet, type NewSheetTab } from './sheetsCreate'
import { formatSpreadsheetTitle } from './spreadsheetCatalog'
import { markFreshlyCreated } from './spreadsheetPreparedSession'
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
      // Written now, so the first open has no «تاریخ عضویت» row left to add.
      [MEMBERSHIP_DATE_KEY, getTodayIso(), stamp],
      ...(creatorEmail
        ? [[`${ROLE_ROW_PREFIX}${creatorEmail.trim().toLowerCase()}`, 'manager', stamp]]
        : [])
    ],
    // The usual lists a building does not replace are filled in now, exactly as the first open
    // would: nothing is left to seed, so opening the new file writes nothing back to it.
    categories: groupsToRows(withDefaults(buildingCategoryGroups()), buildingSubcategories()),
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

/** Lists the spreadsheet as a building or a shared account without making it the active one. */
export function registerWorkspaceSpreadsheet(
  id: string,
  name: string,
  kind: 'building' | 'shared'
): void {
  const settings = getSettings() ?? getDefaultSettings()

  const known = settings.spreadsheets ?? []

  saveSettings({
    ...settings,
    spreadsheets: known.some(sheet => sheet.id === id)
      ? known.map(sheet => (sheet.id === id ? { ...sheet, kind } : sheet))
      : [...known, { id, name, createdAt: new Date().toISOString(), kind }]
  })
}

/** Lists the spreadsheet as a building without making it the active one. */
export function registerBuildingSpreadsheet(id: string, name: string): void {
  registerWorkspaceSpreadsheet(id, name, 'building')
}

/**
 * Creates the spreadsheet «حسابداری · ساختمان <name>» with the building forms, categories,
 * profile row, fund accounts (with their opening balances) and the creator as «مدیر», and lists it
 * in the settings as a building. The file, all of its tabs, every header and the first rows go out
 * in TWO requests (create, then one batch write); a building has only the tabs it uses, never the
 * personal-only ones. The new spreadsheet is not active, so nothing of it touches the manager's own
 * books.
 */
export async function createBuildingSpreadsheet(
  profile: BuildingProfile,
  accounts: FundAccountInput[],
  /** Where the setup journey stands; the row stays until the summary is confirmed. */
  journey?: JourneyState
): Promise<string> {
  const title = formatSpreadsheetTitle(buildingLabel(profile.name))

  const rows = buildTemplateRows(profile, accounts, getUserEmail() ?? '')

  if (journey)
    rows.period.push([JOURNEY_ROW, JSON.stringify(journey), new Date().toLocaleString('fa-IR')])

  const spreadsheetId = await createSpreadsheet(title, buildingForms(), buildingTabs(rows))

  // Every tab and header is in place: the first activation goes straight to opening it.
  markFreshlyCreated(spreadsheetId)
  // Its tabs were created with exact grids, so the first download has nothing to shrink either.
  markCompactGridsMigrated(spreadsheetId)
  // Known before the first activation, so its forms and category locks are the building's.
  setWorkspaceType(spreadsheetId, 'building')
  registerBuildingSpreadsheet(spreadsheetId, title)

  return spreadsheetId
}

/** The tabs of a new building: the template ones with their rows, the rest with headers only. */
export function buildingTabs(rows: BuildingTemplateRows): NewSheetTab[] {
  const withRows: Record<string, string[][]> = {
    [PERIOD_SETTINGS_SHEET]: rows.period,
    [CATEGORIES_SHEET]: rows.categories,
    [BUILDING_SHEET]: rows.building,
    [WALLET_SHEET]: rows.wallet,
    [WALLET_LEDGER_SHEET]: rows.ledger
  }

  return [...BUILDING_MODULE_SHEET_SPECS, ...BUILDING_SHEET_SPECS].map(spec => ({
    ...spec,
    rows: withRows[spec.sheetName]
  }))
}
