import type { SmsDirection, SmsSlotRole, WalletAccount } from '../types'

/**
 * Synthetic bank SMS shaped like real Iranian bank messages. Card numbers,
 * amounts and balances are invented. Each fixture has a `sample` the template
 * is built from and a `next` message the template must recognise.
 */
export interface BankSmsFixture {
  bank: string
  sample: string
  next: string
  roles: Exclude<SmsSlotRole, 'ignore'>[]
  direction: SmsDirection
  expected: { amount: number; balance: number | null; accountRef: string }
}

export const BANK_SMS_FIXTURES: BankSmsFixture[] = [
  {
    bank: 'mellat-debit',
    sample: 'بانک ملت\nبرداشت:1,250,000\nحساب:4567***1234\nمانده:8,430,000\n0715-14:32',
    next: 'بانک ملت\nبرداشت:90,000\nحساب:4567***1234\nمانده:8,340,000\n0716-09:01\nاپ جدید همراه بانک',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'debit',
    expected: { amount: 90000, balance: 8340000, accountRef: '4567***1234' }
  },
  {
    bank: 'mellat-credit',
    sample: 'بانک ملت\nواریز:2,000,000\nحساب:4567***1234\nمانده:10,430,000\n0715-15:00',
    next: 'بانک ملت\nواریز:500,000\nحساب:4567***1234\nمانده:8,840,000\n0716-10:00',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'credit',
    expected: { amount: 500000, balance: 8840000, accountRef: '4567***1234' }
  },
  {
    bank: 'melli-debit',
    sample: 'بانك ملي ايران\nخريد:500,000\nاز:0101234567001\nمانده:3,200,000\n05/07/15_18:40',
    next: 'بانک ملی ایران\nخرید:۴۵,۰۰۰\nاز:0101234567001\nمانده:۳,۱۵۵,۰۰۰\n05/07/16_08:05',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'debit',
    expected: { amount: 45000, balance: 3155000, accountRef: '0101234567001' }
  },
  {
    bank: 'saman-debit',
    sample:
      'بانک سامان\nانتقال از 1234...5678\nمبلغ: 2,000,000-\nمانده: 15,000,000\n1405/07/15 10:20\nلغو11',
    next: 'بانک سامان\nانتقال از 1234...5678\nمبلغ: 300,000-\nمانده: 14,700,000\n1405/07/16 11:00',
    roles: ['accountRef', 'amount', 'balance'],
    direction: 'debit',
    expected: { amount: 300000, balance: 14700000, accountRef: '1234...5678' }
  },
  {
    bank: 'pasargad-credit',
    sample: 'پاسارگاد\n+3,000,000\nحساب 205.8000.1234567.1\nمانده 12,500,000\n1405/07/15',
    next: 'پاسارگاد\n+150,000\nحساب 205.8000.1234567.1\nمانده 12,650,000\n1405/07/16',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'credit',
    expected: { amount: 150000, balance: 12650000, accountRef: '205.8000.1234567.1' }
  },
  {
    bank: 'tejarat-credit',
    sample:
      'تجارت\nواریز به حساب ۱۲۳۴۵۶۷۸۹۰\nمبلغ ۷۵۰٬۰۰۰ ریال\nموجودی ۹٬۸۰۰٬۰۰۰\n۱۴۰۵/۰۷/۱۵ ۰۹:۱۲',
    next: 'تجارت\nواریز به حساب ۱۲۳۴۵۶۷۸۹۰\nمبلغ ۱٬۰۰۰٬۰۰۰ ریال\nموجودی ۱۰٬۸۰۰٬۰۰۰\n۱۴۰۵/۰۷/۱۶ ۱۰:۰۰',
    roles: ['accountRef', 'amount', 'balance'],
    direction: 'credit',
    expected: { amount: 1000000, balance: 10800000, accountRef: '1234567890' }
  },
  {
    bank: 'resalat-no-balance',
    sample: 'رسالت\nبرداشت از کارت ***9876\nمبلغ 120,000 تومان',
    next: 'رسالت\nبرداشت از کارت ***9876\nمبلغ 80,000 تومان',
    roles: ['accountRef', 'amount'],
    direction: 'debit',
    expected: { amount: 80000, balance: null, accountRef: '***9876' }
  }
]

type FixtureAccount = Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>

export function fixtureAccount(id: string, numbers: Partial<FixtureAccount> = {}): FixtureAccount {
  return { id, cardNumber: '', accountNumber: '', iban: '', ...numbers }
}
