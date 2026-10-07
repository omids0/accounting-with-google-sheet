import { Capacitor, registerPlugin, type PermissionState } from '@capacitor/core'

/** One raw SMS as captured by the native `BankSms` plugin. */
export interface BankSmsItem {
  /** SHA-256 of sender + body; stable between live capture and inbox scans. */
  id: string
  sender: string
  body: string
  /** Epoch ms when the phone received it. */
  receivedAt: number
  source: 'live' | 'inbox'
}

interface BankSmsPermissionStatus {
  sms: PermissionState
}

interface BankSmsPlugin {
  checkPermissions(): Promise<BankSmsPermissionStatus>
  requestPermissions(): Promise<BankSmsPermissionStatus>
  getPending(): Promise<{ items: BankSmsItem[] }>
  markHandled(options: { ids: string[] }): Promise<void>
  /** `sinceMs` is a string so Java never reads a large number as a Double. */
  scanInbox(options: { sinceMs: string }): Promise<{ added: number; scannedAt: number }>
  listInbox(options: { limit: number }): Promise<{ items: BankSmsItem[] }>
  clear(): Promise<void>
}

const BankSms = registerPlugin<BankSmsPlugin>('BankSms')

/** SMS capture exists only in the Android app. */
export function isBankSmsAvailable(): boolean {
  return Capacitor.getPlatform() === 'android'
}

export async function getBankSmsPermission(): Promise<PermissionState> {
  if (!isBankSmsAvailable()) return 'denied'

  return (await BankSms.checkPermissions()).sms
}

export async function requestBankSmsPermission(): Promise<PermissionState> {
  if (!isBankSmsAvailable()) return 'denied'

  return (await BankSms.requestPermissions()).sms
}

export async function getPendingBankSms(): Promise<BankSmsItem[]> {
  if (!isBankSmsAvailable()) return []

  return (await BankSms.getPending()).items
}

export async function markBankSmsHandled(ids: string[]): Promise<void> {
  if (!isBankSmsAvailable() || !ids.length) return

  await BankSms.markHandled({ ids })
}

export async function scanBankSmsInbox(
  sinceMs: number
): Promise<{ added: number; scannedAt: number }> {
  if (!isBankSmsAvailable()) return { added: 0, scannedAt: sinceMs }

  return BankSms.scanInbox({ sinceMs: String(Math.max(0, Math.floor(sinceMs))) })
}

export async function listBankSmsInbox(limit = 30): Promise<BankSmsItem[]> {
  if (!isBankSmsAvailable()) return []

  return (await BankSms.listInbox({ limit })).items
}

export async function clearBankSmsStore(): Promise<void> {
  if (!isBankSmsAvailable()) return

  await BankSms.clear()
}
