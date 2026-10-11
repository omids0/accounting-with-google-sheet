import type { Tab } from './types'

/** One-line explanation under each menu item, so new users know what a module is for. */
export const NAV_HINTS: Partial<Record<Tab, string>> = {
  dashboard: 'خلاصه وضعیت مالی',
  wallet: 'حساب‌ها و موجودی‌ها',
  receivables: 'طلب‌هایت از دیگران',
  dang: 'بدهی‌هایت به دیگران',
  installments: 'وام و خرید قسطی',
  checks: 'چک‌های پرداختی و دریافتی',
  treasury: 'پس‌انداز هدف‌دار',
  'personal-reminders': 'قبض، بیمه و مواعد شخصی',
  'vehicle-service': 'موعد سرویس و بیمه خودرو',
  'bank-sms': 'ثبت هزینه و درآمد از پیامک بانک',
  counterparties: 'افرادی که با آن‌ها حساب داری',
  about: 'راهنمای همه امکانات'
}
