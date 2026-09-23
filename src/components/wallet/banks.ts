import type { BankCardTheme } from './bankCardTypes'
import {
  getBluBankBaseTheme,
  getEghtesadNovinBaseTheme,
  getHiBankBaseTheme,
  resolveBankCardTheme
} from './bankColorPalettes'

export type { BankCardTheme } from './bankCardTypes'
export { BLU_BANK_ID, HIBANK_BANK_ID, isBluBank } from './bankColorPalettes'

export const IRANIAN_BANKS: BankCardTheme[] = [
  { ...getBluBankBaseTheme() },
  { ...getHiBankBaseTheme() },
  {
    id: 'melli',
    label: 'بانک ملی',
    swatch: '#2d6cb5',
    gradient: 'linear-gradient(135deg, #1a4f8c 0%, #2d6cb5 45%, #4a8fd4 100%)',
    accent: '#f0c14b',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 85% 15%, rgba(255,255,255,0.18) 0%, transparent 45%)',
    initials: 'ملی'
  },
  {
    id: 'mellat',
    label: 'بانک ملت',
    swatch: '#c41e1e',
    gradient: 'linear-gradient(135deg, #8b0000 0%, #c41e1e 50%, #e83030 100%)',
    accent: '#ffd54f',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 12% 88%, rgba(255,255,255,0.14) 0%, transparent 50%)',
    initials: 'ملت'
  },
  {
    id: 'saderat',
    label: 'بانک صادرات',
    swatch: '#123d6b',
    gradient: 'linear-gradient(135deg, #0a2a4a 0%, #123d6b 50%, #1a5494 100%)',
    accent: '#7ec8ff',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 78% 22%, rgba(126,200,255,0.2) 0%, transparent 42%)',
    initials: 'صادرات'
  },
  {
    id: 'tejarat',
    label: 'بانک تجارت',
    swatch: '#0066b3',
    gradient: 'linear-gradient(135deg, #004a8f 0%, #0066b3 55%, #0088cc 100%)',
    accent: '#ffcc00',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 20% 30%, rgba(255,204,0,0.15) 0%, transparent 40%)',
    initials: 'تجارت'
  },
  {
    id: 'pasargad',
    label: 'بانک پاسارگاد',
    swatch: '#c49a1a',
    gradient: 'linear-gradient(135deg, #8b6914 0%, #c49a1a 45%, #e8b830 100%)',
    accent: '#1a1a2e',
    text: '#1a1a2e',
    pattern: 'radial-gradient(circle at 90% 80%, rgba(255,255,255,0.25) 0%, transparent 45%)',
    initials: 'پاسارگاد'
  },
  {
    id: 'parsian',
    label: 'بانک پارسیان',
    swatch: '#8b1a4b',
    gradient: 'linear-gradient(135deg, #5c1230 0%, #8b1a4b 50%, #a82860 100%)',
    accent: '#ffd700',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 15% 70%, rgba(255,215,0,0.12) 0%, transparent 45%)',
    initials: 'پارسیان'
  },
  {
    id: 'saman',
    label: 'بانک سامان',
    swatch: '#00a0e3',
    gradient: 'linear-gradient(135deg, #0077b6 0%, #00a0e3 55%, #48cae4 100%)',
    accent: '#ffffff',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 82% 18%, rgba(255,255,255,0.2) 0%, transparent 42%)',
    initials: 'سامان'
  },
  {
    id: 'sepah',
    label: 'بانک سپه',
    swatch: '#2e7d32',
    gradient: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #43a047 100%)',
    accent: '#ffd54f',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 75% 75%, rgba(255,255,255,0.12) 0%, transparent 48%)',
    initials: 'سپه'
  },
  {
    id: 'maskan',
    label: 'بانک مسکن',
    swatch: '#c62828',
    gradient: 'linear-gradient(135deg, #8b1a1a 0%, #c62828 55%, #e53935 100%)',
    accent: '#ffab91',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 10% 20%, rgba(255,255,255,0.15) 0%, transparent 40%)',
    initials: 'مسکن'
  },
  {
    id: 'keshavarzi',
    label: 'بانک کشاورزی',
    swatch: '#558b2f',
    gradient: 'linear-gradient(135deg, #33691e 0%, #558b2f 50%, #7cb342 100%)',
    accent: '#fff176',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 88% 12%, rgba(255,241,118,0.18) 0%, transparent 42%)',
    initials: 'کشاورزی'
  },
  {
    id: 'refah',
    label: 'بانک رفاه',
    swatch: '#1976d2',
    gradient: 'linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)',
    accent: '#ffeb3b',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 25% 85%, rgba(255,255,255,0.14) 0%, transparent 45%)',
    initials: 'رفاه'
  },
  {
    id: 'shahr',
    label: 'بانک شهر',
    swatch: '#6a1b9a',
    gradient: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 50%, #8e24aa 100%)',
    accent: '#ce93d8',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 70% 30%, rgba(206,147,216,0.2) 0%, transparent 42%)',
    initials: 'شهر'
  },
  {
    id: 'ayandeh',
    label: 'بانک آینده',
    swatch: '#00838f',
    gradient: 'linear-gradient(135deg, #006064 0%, #00838f 50%, #00acc1 100%)',
    accent: '#80deea',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 18% 45%, rgba(128,222,234,0.18) 0%, transparent 45%)',
    initials: 'آینده'
  },
  {
    id: 'gardeshgari',
    label: 'بانک گردشگری',
    swatch: '#f57c00',
    gradient: 'linear-gradient(135deg, #e65100 0%, #f57c00 50%, #ff9800 100%)',
    accent: '#ffffff',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 85% 60%, rgba(255,255,255,0.16) 0%, transparent 45%)',
    initials: 'گردشگری'
  },
  {
    id: 'sina',
    label: 'بانک سینا',
    swatch: '#3949ab',
    gradient: 'linear-gradient(135deg, #283593 0%, #3949ab 50%, #5c6bc0 100%)',
    accent: '#ff8a65',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 50% 10%, rgba(255,255,255,0.14) 0%, transparent 50%)',
    initials: 'سینا'
  },
  { ...getEghtesadNovinBaseTheme() },
  {
    id: 'karafarin',
    label: 'بانک کارآفرین',
    swatch: '#D4AF64',
    gradient: 'linear-gradient(135deg, #D4AF64 0%, #6f9b5d 52%, #2F7747 100%)',
    accent: '#ffffff',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 8% 55%, rgba(255,255,255,0.16) 0%, transparent 45%)',
    initials: 'کارآفرین'
  },
  {
    id: 'resalat',
    label: 'بانک رسالت',
    swatch: '#2d6a4f',
    gradient: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 50%, #40916c 100%)',
    accent: '#d8f3dc',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 65% 85%, rgba(255,255,255,0.12) 0%, transparent 48%)',
    initials: 'رسالت'
  },
  {
    id: 'day',
    label: 'بانک دی',
    swatch: '#4527a0',
    gradient: 'linear-gradient(135deg, #311b92 0%, #4527a0 50%, #673ab7 100%)',
    accent: '#ffab40',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 30% 15%, rgba(255,171,64,0.16) 0%, transparent 42%)',
    initials: 'دی'
  },
  {
    id: 'post',
    label: 'پست بانک',
    swatch: '#e64a19',
    gradient: 'linear-gradient(135deg, #bf360c 0%, #e64a19 50%, #ff5722 100%)',
    accent: '#ffffff',
    text: '#ffffff',
    pattern: 'radial-gradient(circle at 80% 25%, rgba(255,255,255,0.18) 0%, transparent 42%)',
    initials: 'پست'
  }
]

export const CASH_CARD_THEME: BankCardTheme = {
  id: 'cash',
  label: 'نقدی',
  swatch: '#059669',
  gradient: 'linear-gradient(135deg, #064e3b 0%, #047857 52%, #10b981 100%)',
  accent: '#fcd34d',
  text: '#ecfdf5',
  pattern:
    'radial-gradient(circle at 82% 18%, rgba(252,211,77,0.16) 0%, transparent 42%), radial-gradient(circle at 12% 88%, rgba(255,255,255,0.08) 0%, transparent 48%)',
  initials: 'نقد'
}

export const GENERIC_CARD_THEME: BankCardTheme = {
  id: 'generic',
  label: 'سایر حساب',
  swatch: '#4f46e5',
  gradient: 'linear-gradient(135deg, #312e81 0%, #4338ca 52%, #6366f1 100%)',
  accent: '#c4b5fd',
  text: '#eef2ff',
  pattern:
    'radial-gradient(circle at 84% 16%, rgba(196,181,253,0.2) 0%, transparent 42%), radial-gradient(circle at 10% 84%, rgba(255,255,255,0.08) 0%, transparent 48%)',
  initials: 'حساب'
}

/**
 * Matches by internal id (legacy stored accounts) or by label (the bank picker's
 * category value), so both old and newly-saved accounts resolve to their theme.
 */
export function getBankDefinition(bankId: string): BankCardTheme | undefined {
  return IRANIAN_BANKS.find(bank => bank.id === bankId || bank.label === bankId)
}

export function getBankById(bankId: string, cardColor = ''): BankCardTheme | undefined {
  const base = getBankDefinition(bankId)

  if (!base) return undefined

  return resolveBankCardTheme(base.id, cardColor, base)
}

/** The short internal id used by the color-palette lookups, from either an id or a label. */
export function resolveBankInternalId(bankId: string): string {
  return getBankDefinition(bankId)?.id ?? bankId
}

/** The display label used by the bank picker, from either an id or a label. */
export function resolveBankLabel(bankId: string): string {
  return getBankDefinition(bankId)?.label ?? bankId
}
