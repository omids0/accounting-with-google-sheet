import type { ChargeMethod, VacancyRule } from './buildingOptions'
import type { BuildingProfile, FundAccountInput } from '../../services/buildingTemplate'
import { normalizeDigits } from '../../utils/normalizeDigits'
import { parseNumeric } from '../../utils/parseNumeric'

/**
 * What steps 1 and 2 of the setup journey collect before the spreadsheet exists. Nothing is
 * written until «ساخت ساختمان», so a half-filled journey leaves no half-built sheet behind.
 */
export interface ProfileDraft {
  name: string
  address: string
  floors: string
  units: string
  note: string
}

export interface FundAccountDraft extends FundAccountInput {
  /** Local key of the list row; the account gets its real id when the sheet is built. */
  key: string
}

export interface FundDraft {
  accounts: FundAccountDraft[]
  defaultCharge: number | ''
  chargeMethod: ChargeMethod
  issueDay: string
  dueDay: string
  vacancyRule: VacancyRule
}

export const EMPTY_PROFILE: ProfileDraft = {
  name: '',
  address: '',
  floors: '',
  units: '',
  note: ''
}

export const EMPTY_FUND: FundDraft = {
  accounts: [],
  defaultCharge: '',
  chargeMethod: 'fixed',
  issueDay: '1',
  dueDay: '10',
  vacancyRule: 'half'
}

/** A whole number from a count field (Persian digits allowed); 0 when it is not one. */
export function countOf(raw: string): number {
  return Math.max(0, Math.trunc(parseNumeric(normalizeDigits(raw))))
}

export function profileError(draft: ProfileDraft): string | null {
  if (!draft.name.trim()) return 'نام ساختمان را وارد کنید'
  if (countOf(draft.floors) < 1) return 'تعداد طبقه را وارد کنید'
  if (countOf(draft.units) < 1) return 'تعداد واحد را وارد کنید'

  return null
}

/** Bank accounts need their 16-digit card (the SMS routing of round 11 matches on it). */
export function accountError(account: Pick<FundAccountDraft, 'title' | 'type' | 'cardNumber'>) {
  if (!account.title.trim()) return 'نام حساب را وارد کنید'
  if (account.type === 'bank' && account.cardNumber.replace(/\D/g, '').length !== 16) {
    return 'شمارهٔ کارت ۱۶ رقم است'
  }

  return null
}

export function fundError(draft: FundDraft): string | null {
  if (draft.accounts.length === 0) return 'حداقل یک حساب برای صندوق لازم است'
  if (!(Number(draft.defaultCharge) > 0)) return 'شارژ پیش‌فرض را وارد کنید'

  return null
}

export function fundTotal(accounts: Pick<FundAccountDraft, 'balance'>[]): number {
  return accounts.reduce((sum, account) => sum + account.balance, 0)
}

export function profileFromDrafts(profile: ProfileDraft, fund: FundDraft): BuildingProfile {
  return {
    name: profile.name.trim(),
    address: profile.address.trim(),
    floors: countOf(profile.floors),
    defaultCharge: Number(fund.defaultCharge),
    chargeMethod: fund.chargeMethod,
    issueDay: countOf(fund.issueDay) || 1,
    dueDay: countOf(fund.dueDay) || 10,
    vacancyRule: fund.vacancyRule
  }
}
