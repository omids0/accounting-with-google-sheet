import type { ChangelogEntry } from '../../services/whatsNew'

/**
 * What changed per version, newest first: the source of «چه خبر؟» after an update
 * and of «تغییرات نسخه‌ها» in About. At most three short user-facing lines per
 * version, each «عنوان — توضیح». Add an entry with every release (About rule).
 */
export const changelog: ChangelogEntry[] = [
  {
    version: '2.3.0',
    items: [
      'تطبیق موجودی — مقایسهٔ هر حساب با پیامک بانک و پیدا کردن اختلاف',
      'گزارش ماهانه و سال در یک نگاه — PDF یک‌صفحه‌ای اول هر ماه و کارت سال در نوروز',
      'پیوست رسید — عکس یا PDF روی رکورد، چک و قسط'
    ]
  },
  {
    version: '2.2.0',
    items: [
      'بودجه و هدف پس‌انداز — سقف ماهانه برای هر دسته و پیشرفت هدف‌ها در صندوقچه',
      'ثبت سریع‌تر — «پرتکرار» با یک لمس و تکرار ماهانه هزینه‌ها و درآمدها',
      'جستجوی سراسری — همه بخش‌ها از یک جا، با ⌕ بالای صفحه'
    ]
  },
  {
    version: '2.1.0',
    items: [
      'داشبورد خلوت‌تر — نمودارها در صفحه «نمودارها»',
      'چیدمان تبلت و دسکتاپ — منوی کناری، جدول‌ها و پنل فرم',
      'پشتیبان کامل — تنظیمات ← حساب و داده'
    ]
  }
]
