/**
 * Google Sheets tab names. Kept dependency-free so the sync engine, wipe and
 * onboarding code can name a tab without pulling a feature's service into the main chunk.
 */

export const ACTIVITY_SHEET = 'فعالیت'
/** Round 8 feed: one row per change, who and from which device (not the status row above). */
export const ACTIVITY_LOG_SHEET = 'فعالیت_ها'
export const APP_LOCK_SHEET = 'قفل_اپ'
export const BUDGETS_SHEET = 'بودجه'
/** Round 11 (building workspace): one profile row, the units, and who lives in or owns each. */
export const BUILDING_SHEET = 'ساختمان'
export const BUILDING_UNITS_SHEET = 'واحدها'
export const BUILDING_RESIDENTS_SHEET = 'ساکنان'
export const CATEGORIES_SHEET = 'دسته‌بندی‌ها'
export const CHECKS_SHEET = 'چک‌ها'
export const COUNTERPARTIES_SHEET = 'طرف_حساب‌ها'
export const DANG_SHEET = 'دنگ'
export const DANG_SPLIT_GROUPS_SHEET = 'گروه_دنگ'
export const DANG_SPLIT_CATEGORIES_SHEET = 'دسته_افراد_دنگ'
export const DANG_SPLIT_PEOPLE_SHEET = 'افراد_دنگ'
export const DANG_SPLIT_EXPENSES_SHEET = 'اقلام_دنگ'
export const DANG_SPLIT_ALLOCATIONS_SHEET = 'تخصیص_دنگ'
export const INSTALLMENTS_SHEET = 'اقساط'
export const MONTHLY_BALANCE_SHEET = 'موجودی ماهانه'
/** Month-end «دارایی قابل اتکا» snapshots (round 7); not the opening-balance tab above. */
export const NET_WORTH_SHEET = 'دارایی ماهانه'
export const PERIOD_SETTINGS_SHEET = 'تنظیمات دوره'
export const PERSONAL_REMINDERS_SHEET = 'مواعد_شخصی'
export const RECEIVABLES_SHEET = 'طلب‌ها'
export const RECURRING_SHEET = 'تکرارها'
export const REMINDERS_SHEET = 'یادآوری'
export const PUSH_SUBS_SHEET = 'ناتیف'
export const REMINDER_LOG_SHEET = 'یادآوری_ثبت'
export const SMS_TEMPLATES_SHEET = 'قالب_پیامک'
export const TIMESHEETS_SHEET = 'تایم‌شیت‌ها'
export const TIMESHEET_ENTRIES_SHEET = 'رکوردهای تایم‌شیت'
export const TREASURY_SHEET = 'صندوقچه'
export const TREASURY_ASSETS_SHEET = 'دارایی_صندوقچه'
export const TREASURY_GOALS_SHEET = 'هدف_صندوقچه'
export const VEHICLES_SHEET = 'خودرو'
export const VEHICLE_DEADLINE_SHEET = 'موعد_خودرو'
export const VEHICLE_EXPENSE_META_SHEET = 'هزینه_خودرو'
export const VEHICLE_HISTORY_SHEET = 'تاریخچه_خودرو'
export const VEHICLE_MECHANIC_SHEET = 'مکانیک_خودرو'
export const VEHICLE_PERIODIC_SHEET = 'سرویس_خودرو'
export const WALLET_SHEET = 'کیف پول'
export const WALLET_LEDGER_SHEET = 'گردش حساب'

/**
 * Tabs only the manager's personal books use (round 11): installments, the treasury, timesheets,
 * vehicles, personal reminders, the dang-split family and the net-worth snapshots. A building
 * spreadsheet is created without them and never downloads them; the personal spreadsheet keeps
 * every tab. Nothing a building page opens reads these (see `buildingSheetSeparation.test.ts`).
 */
export const PERSONAL_ONLY_SHEETS: readonly string[] = [
  INSTALLMENTS_SHEET,
  TREASURY_SHEET,
  TREASURY_ASSETS_SHEET,
  TREASURY_GOALS_SHEET,
  TIMESHEETS_SHEET,
  TIMESHEET_ENTRIES_SHEET,
  VEHICLES_SHEET,
  VEHICLE_PERIODIC_SHEET,
  VEHICLE_DEADLINE_SHEET,
  VEHICLE_HISTORY_SHEET,
  VEHICLE_MECHANIC_SHEET,
  VEHICLE_EXPENSE_META_SHEET,
  PERSONAL_REMINDERS_SHEET,
  DANG_SPLIT_GROUPS_SHEET,
  DANG_SPLIT_CATEGORIES_SHEET,
  DANG_SPLIT_PEOPLE_SHEET,
  DANG_SPLIT_EXPENSES_SHEET,
  DANG_SPLIT_ALLOCATIONS_SHEET,
  NET_WORTH_SHEET
]

/**
 * The tabs a shared account («حساب مشترک») keeps besides its two record forms: the period
 * settings (type marker, notices), the categories, the budgets, the recurring entries and the
 * activity log. Nothing personal-only and nothing building-only; the wallet, checks, receivables
 * and the other module tabs stay out of it too.
 */
export const SHARED_ACCOUNT_SHEETS: readonly string[] = [
  PERIOD_SETTINGS_SHEET,
  CATEGORIES_SHEET,
  BUDGETS_SHEET,
  RECURRING_SHEET,
  ACTIVITY_LOG_SHEET
]
