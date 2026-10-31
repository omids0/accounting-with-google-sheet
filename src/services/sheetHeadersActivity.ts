import { ACTIVITY_TRAIL_HEADERS } from './activityTrailModel'

/**
 * «فعالیت_ها»: the nine columns every version wrote, then the «ردپا» columns (قبل، بعد، نسخه).
 * New columns only ever go at the end, so an older app and the older rows keep reading the first nine.
 */
export const ACTIVITY_LOG_HEADERS = [
  'شناسه',
  'زمان',
  'کاربر',
  'نام',
  'عمل',
  'ماژول',
  'شناسه مورد',
  'خلاصه',
  'دستگاه',
  ...ACTIVITY_TRAIL_HEADERS
]
