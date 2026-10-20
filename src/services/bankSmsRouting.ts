import { anyCardMatches, savedCardDigits, smsCardTokens } from './bankSmsCards'
import { isArchivedEntry } from './buildingArchive'
import { getSettings } from './settings'
import { WALLET_SHEET } from './sheetNames'
import { getSheetDataRows } from './spreadsheetStore'
import { getItem, setItem } from './storage'
import { getWorkspaceType } from './workspace'
import type { WalletAccount } from '../types'
import { toPersianDigits } from '../utils/normalizeDigits'

/**
 * Round 11, Step 6: captured bank SMS belong to the device, but a record goes to the ACTIVE
 * spreadsheet, and only one spreadsheet is mirrored in memory at a time. So the cards of every
 * registered workspace are kept in a small cache, refreshed whenever a workspace is open,
 * synced or summarized on the «مدیر ساختمان» home; routing reads that, never another sheet.
 *
 * `{ [spreadsheetId]: [{ title, cards }] }`: card, account and IBAN digits of each wallet
 * account. Tied to the signed-in account's spreadsheets, so it is listed in `ACCOUNT_KEYS`
 * (localDataWipe.ts).
 */
export const WORKSPACE_CARDS_KEY = 'accounting_workspace_cards_v1'

export interface WorkspaceCardAccount {
  title: string
  cards: string[]
}

type CardStore = Record<string, WorkspaceCardAccount[]>

/** The wallet fields the cache reads (a full `WalletAccount` fits). */
export type CardAccountSource = Pick<
  WalletAccount,
  'title' | 'cardNumber' | 'accountNumber' | 'iban'
>

/** Card, account number and IBAN digits of a wallet account, those long enough to compare by. */
export function accountCards(account: Omit<CardAccountSource, 'title'>): string[] {
  return [
    ...new Set(
      [account.cardNumber, account.accountNumber, account.iban].map(savedCardDigits).filter(Boolean)
    )
  ]
}

const toCardAccounts = (accounts: CardAccountSource[]): WorkspaceCardAccount[] =>
  accounts.map(account => ({ title: account.title, cards: accountCards(account) }))

/**
 * Raw «حساب‌ها» rows → accounts for the cache. Columns follow `WALLET_HEADERS` (wallet.ts
 * `rowToAccount`): عنوان 2, شماره کارت 7, شماره حساب 12, شماره شبا 13.
 */
export function walletRowsToCardSources(rows: string[][]): CardAccountSource[] {
  return rows
    .filter(row => String(row[0] ?? '').trim())
    .map(row => ({
      title: row[2] ?? '',
      cardNumber: row[7] ?? '',
      accountNumber: row[12] ?? '',
      iban: row[13] ?? ''
    }))
}

let version = 0

const listeners = new Set<() => void>()

export function subscribeWorkspaceCards(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

/** Changes whenever the cache does, so a hook can read the cards again. */
export function getWorkspaceCardsVersion(): number {
  return version
}

export function readWorkspaceCards(): CardStore {
  return getItem<CardStore>(WORKSPACE_CARDS_KEY) ?? {}
}

/** Stores a workspace's cards; nothing is written (or announced) when they did not change. */
export function rememberWorkspaceCards(spreadsheetId: string, accounts: CardAccountSource[]): void {
  if (!spreadsheetId) return

  const next = toCardAccounts(accounts)
  const store = readWorkspaceCards()

  if (JSON.stringify(store[spreadsheetId]) === JSON.stringify(next)) return

  try {
    setItem(WORKSPACE_CARDS_KEY, { ...store, [spreadsheetId]: next })
  } catch {
    // Private mode: the cards are read again on the next sync.
  }
  version += 1
  listeners.forEach(listener => listener())
}

/** Refreshes the cache from the active spreadsheet's mirror (no network). */
export function rememberActiveWorkspaceCards(): void {
  const spreadsheetId = getSettings()?.spreadsheetId

  if (!spreadsheetId) return

  const rows = getSheetDataRows(spreadsheetId, WALLET_SHEET)

  if (rows) rememberWorkspaceCards(spreadsheetId, walletRowsToCardSources(rows))
}

/** The cards that route to one workspace: the lines of «کارت‌های صندوق» in building settings. */
export function routedCardAccounts(spreadsheetId: string): WorkspaceCardAccount[] {
  return (readWorkspaceCards()[spreadsheetId] ?? []).filter(account => account.cards.length > 0)
}

/** «۶۱۰۴…۳۲۱۰»: the first and last four digits of a card, the whole number when it is short. */
export function cardLabel(digits: string): string {
  const label = digits.length > 8 ? `${digits.slice(0, 4)}…${digits.slice(-4)}` : digits

  return toPersianDigits(label)
}

/** One label per fund account (its first number): what the building settings list as routed. */
export function routedCardLabels(spreadsheetId: string): string[] {
  return routedCardAccounts(spreadsheetId).map(account => cardLabel(account.cards[0]))
}

export interface RoutingWorkspace {
  id: string
  /** Card, account and IBAN digits of every wallet account of the workspace. */
  cards: string[]
}

/**
 * Every registered workspace (personal and buildings) with the cards this device knows;
 * the open one is always included.
 */
export function routingWorkspaces(): RoutingWorkspace[] {
  const settings = getSettings()
  const store = readWorkspaceCards()
  // An archived building no longer owns a card: its SMS stay in the personal queue.
  const ids = new Set([
    ...(settings?.spreadsheets ?? [])
      .filter(entry => !isArchivedEntry(entry))
      .map(entry => entry.id),
    ...(settings?.spreadsheetId ? [settings.spreadsheetId] : [])
  ])

  return [...ids].map(id => ({ id, cards: (store[id] ?? []).flatMap(account => account.cards) }))
}

/**
 * The workspace whose wallet account the SMS names (the card / account digits in its text), or
 * `null` when it names none: the SMS then stays in the personal queue, as before buildings.
 * When the digits fit several workspaces (a payer's card can be a personal one) the open
 * workspace wins, else the first registered.
 */
export function routeSmsToWorkspace(
  sms: { body: string },
  workspaces: RoutingWorkspace[],
  activeId = ''
): string | null {
  const tokens = smsCardTokens(sms.body)

  if (!tokens.length) return null

  const owners = workspaces.filter(workspace => anyCardMatches(tokens, workspace.cards))

  return (owners.find(workspace => workspace.id === activeId) ?? owners[0])?.id ?? null
}

/**
 * The SMS the queue of `activeId` lists: those routed to it, plus (in a personal workspace)
 * those no workspace owns. A building never lists an unrouted SMS.
 */
export function filterSmsForWorkspace<T extends { body: string }>(
  items: T[],
  workspaces: RoutingWorkspace[],
  activeId: string,
  activeIsBuilding: boolean
): T[] {
  return items.filter(sms => {
    const owner = routeSmsToWorkspace(sms, workspaces, activeId)

    return owner === null ? !activeIsBuilding : owner === activeId
  })
}

/** The queue of the open workspace, from the cache. */
export function smsForActiveWorkspace<T extends { body: string }>(items: T[]): T[] {
  const activeId = getSettings()?.spreadsheetId ?? ''

  return filterSmsForWorkspace(
    items,
    routingWorkspaces(),
    activeId,
    getWorkspaceType(activeId) === 'building'
  )
}
