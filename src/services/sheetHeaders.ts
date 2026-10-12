/** Column headers of the fixed module tabs; dependency-free for the same reason as sheetNames.ts. */

export const ACTIVITY_HEADERS = ['آخرین_بازدید', 'آخرین_عملیات']

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
  'زیردسته'
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
  'توضیحات'
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
  'زیردسته'
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
  'زیردسته'
]

export const MONTHLY_BALANCE_HEADERS = ['کلید ماه', 'موجودی اول', 'زمان ثبت', 'توضیحات']

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
  'زیردسته'
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

export const VEHICLE_DEADLINE_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'دسته',
  'تاریخ_شروع',
  'تاریخ_پایان',
  'مبلغ',
  'توضیحات',
  'expense_id',
  'فعال',
  'یادآوری_فعال',
  'روز_قبل'
]

export const VEHICLE_EXPENSE_META_HEADERS = [
  'شناسه',
  'شناسه_هزینه',
  'شناسه_خودرو',
  'نوع_هزینه',
  'نرخ_لیتر',
  'لیتر',
  'کارکرد',
  'زمان_ثبت'
]

export const VEHICLE_HISTORY_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'نوع_رکورد',
  'مرجع_id',
  'تاریخ',
  'کارکرد',
  'km_بعدی',
  'جزئیات',
  'مبلغ',
  'expense_id'
]

export const VEHICLE_MECHANIC_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'تاریخ',
  'کارکرد',
  'مکان',
  'مبلغ_کل',
  'اقلام_json',
  'توضیحات',
  'expense_id'
]

export const VEHICLE_PERIODIC_HEADERS = [
  'شناسه',
  'خودرو_id',
  'زمان_ثبت',
  'نوع_سرویس',
  'کارکرد_فعلی',
  'فاصله_km',
  'km_بعدی',
  'برند',
  'محل',
  'مبلغ',
  'توضیحات',
  'expense_id',
  'فعال',
  'یادآوری_فعال',
  'آستانه_کیلومتر'
]

export const VEHICLES_HEADERS = [
  'شناسه',
  'زمان_ثبت',
  'عنوان',
  'کارکرد',
  'VIN',
  'سال_ساخت',
  'ظرفیت',
  'پلاک',
  'یادآوری_کارکرد',
  'آخرین_بروز_کارکرد',
  'فعال'
]

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
