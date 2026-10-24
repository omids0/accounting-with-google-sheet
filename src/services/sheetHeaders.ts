/** Column headers of the fixed module tabs; dependency-free for the same reason as sheetNames.ts. */

export * from './sheetHeadersBuilding'
export * from './sheetHeadersVehicle'

export const ACTIVITY_HEADERS = ['آخرین_بازدید', 'آخرین_عملیات']

export const ACTIVITY_LOG_HEADERS = [
  'شناسه',
  'زمان',
  'کاربر',
  'نام',
  'عمل',
  'ماژول',
  'شناسه مورد',
  'خلاصه',
  'دستگاه'
]

export const APP_LOCK_HEADERS = ['فعال', 'رمز_هش', 'نمک', 'زمان_بروزرسانی']

export const SMS_TEMPLATES_HEADERS = ['شناسه', 'زمان ثبت', 'شناسه حساب', 'نوع', 'واحد', 'الگو']

export const CATEGORIES_HEADERS = ['نوع', 'دسته‌بندی', 'زیردسته']

export const CHECKS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'شماره چک',
  'طرف حساب',
  'مبلغ',
  'تاریخ صدور',
  'تاریخ سررسید',
  'پرداخت شده',
  'زمان پرداخت',
  'شناسه تراکنش',
  'زیردسته',
  // Round 7: Drive ids of the receipts (utils/attachmentIds.ts).
  'پیوست',
  // Round 8: email of whoever last saved the row (utils/writerColumn.ts).
  'ثبت‌کننده',
  // «پرداختی» or «دریافتی» (services/checks.ts); a row without the cell is a payable.
  'نوع چک'
]

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
  'توضیحات',
  // Round 11: building people; new columns go at the end of the row.
  'موقت',
  'من'
]

export const DANG_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'دسته‌بندی',
  'طرف حساب',
  'مبلغ',
  'تاریخ',
  'توضیحات',
  'پرداخت شده',
  'زمان پرداخت',
  'شناسه تراکنش',
  'زیردسته',
  'ثبت‌کننده'
]

export const DANG_SPLIT_GROUPS_HEADERS = ['شناسه', 'زمان ثبت', 'عنوان', 'توضیحات']

export const DANG_SPLIT_CATEGORIES_HEADERS = ['شناسه', 'شناسه گروه', 'عنوان', 'زمان ثبت']

export const DANG_SPLIT_PEOPLE_HEADERS = [
  'شناسه',
  'شناسه گروه',
  'نام',
  'شناسه دسته',
  'ضریب پیش‌فرض',
  'مبلغ پرداخت‌شده',
  'زمان تسویه',
  'یادداشت',
  'واریز به صندوق'
]

export const DANG_SPLIT_EXPENSES_HEADERS = [
  'شناسه',
  'شناسه گروه',
  'عنوان',
  'تاریخ',
  'مبلغ',
  'توضیحات',
  'زمان ثبت',
  'پرداخت‌کننده'
]

export const DANG_SPLIT_ALLOCATIONS_HEADERS = [
  'شناسه',
  'شناسه گروه',
  'شناسه قلم',
  'شناسه فرد',
  'وزن'
]

export const INSTALLMENTS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'مبلغ قسط',
  'تعداد بازپرداخت',
  'موعد در ماه',
  'تاریخ شروع',
  'توضیحات',
  'وضعیت پرداخت',
  'زیردسته',
  'پیوست',
  'ثبت‌کننده'
]

export const MONTHLY_BALANCE_HEADERS = ['کلید ماه', 'موجودی اول', 'زمان ثبت', 'توضیحات']

/** One row per Jalali month: net worth at its end and where the value came from. */
export const NET_WORTH_HEADERS = [
  'کلید ماه',
  'دارایی خالص',
  'دارایی‌های منتخب',
  'بدهی‌های منتخب',
  'زمان ثبت',
  'منبع'
]

export const PERIOD_SETTINGS_HEADERS = ['کلید', 'مقدار', 'زمان ثبت']

export const PERSONAL_REMINDERS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'دسته‌بندی',
  'عنوان',
  'تاریخ',
  'تکرار',
  'مبلغ',
  'روز_قبل',
  'فعال'
]

export const RECEIVABLES_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'طرف حساب',
  'دسته‌بندی',
  'مبلغ',
  'تاریخ قرض',
  'توضیحات',
  'پرداخت‌ها',
  'زیردسته',
  'ثبت‌کننده',
  'مرجع',
  'شناسهٔ بدهکار'
]

export const REMINDERS_HEADERS = ['نوع', 'فعال', 'روز_قبل', 'ساعت', 'دقیقه']

export const PUSH_SUBS_HEADERS = ['endpoint', 'p256dh', 'auth', 'دستگاه', 'زمان_ثبت']

export const REMINDER_LOG_HEADERS = ['تاریخ', 'نوع', 'مرجع', 'زمان_ارسال']

export const TIMESHEETS_HEADERS = ['شناسه', 'زمان ثبت', 'عنوان', 'توضیحات']

export const TIMESHEET_ENTRIES_HEADERS = [
  'شناسه',
  'شناسه تایم‌شیت',
  'زمان ثبت',
  'عنوان',
  'شروع',
  'پایان',
  'مدت (دقیقه)',
  'توضیحات',
  'تایید شده'
]

export const TREASURY_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'نوع دارایی',
  'عملیات',
  'مقدار',
  'قیمت واحد',
  'تاریخ',
  'توضیحات'
]

/** Vault asset catalog; built-in rows keep the legacy «نوع دارایی» ids. */
export const TREASURY_ASSETS_HEADERS = [
  'شناسه',
  'کلاس',
  'نماد',
  'نام',
  'واحد',
  'اعشار',
  'منبع قیمت',
  'کلید tgju',
  'قیمت دستی',
  'زمان قیمت دستی',
  'فعال'
]

/** Savings goals; deposits and withdrawals live in «گردش حساب» (kind `goal-deposit`). */
export const TREASURY_GOALS_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'مبلغ هدف',
  'تاریخ هدف',
  'حساب مبدا پیش‌فرض',
  'یادداشت',
  'وضعیت'
]

/** Monthly recurring income/expense items (round 6, Task A2). */
export const RECURRING_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'نوع',
  'دسته',
  'زیردسته',
  'حساب',
  'مبلغ',
  'عنوان',
  'روز ماه',
  'حالت',
  'آخرین ثبت',
  'فعال',
  // Round 11, building expenses (empty elsewhere).
  'نوع هزینه',
  'پرداخت‌کننده'
]

/** One monthly budget per expense category. */
export const BUDGETS_HEADERS = ['دسته', 'مبلغ ماهانه', 'زمان ویرایش']

export const WALLET_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'عنوان',
  'موجودی',
  'توضیحات',
  'نوع حساب',
  'بانک',
  'شماره کارت',
  'نام دارنده',
  'رنگ کارت',
  'رنگ اصلی',
  'رنگ ثانویه',
  'شماره حساب',
  'شماره شبا'
]

export const WALLET_LEDGER_HEADERS = [
  'شناسه',
  'زمان ثبت',
  'شناسه حساب',
  'تاریخ',
  'مبلغ',
  'موجودی بعد',
  'عنوان',
  'منبع',
  'شناسه رکورد',
  'اثر'
]
