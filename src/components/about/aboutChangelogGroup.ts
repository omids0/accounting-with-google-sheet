import { changelog } from './aboutChangelog'
import type { AboutFeatureGroup } from './types'
import { formatIsoDatePersian } from '../../utils/jalaliDate'

/** «همه تغییرات» in «چه خبر؟» opens About at this section (`/about#changelog`). */
export const ABOUT_CHANGELOG_ID = 'changelog'

/** «تغییرات نسخه‌ها»: one row per version, newest first. */
export const ABOUT_CHANGELOG_GROUP: AboutFeatureGroup = {
  id: ABOUT_CHANGELOG_ID,
  title: 'تغییرات نسخه‌ها',
  icon: 'clock',
  summary: 'مهم‌ترین تغییرهای هر نسخه؛ بعد از هر به‌روزرسانی هم یک بار نمایش داده می‌شود.',
  features: changelog.map(entry => ({
    title: entry.date
      ? `نسخه ${entry.version} — ${formatIsoDatePersian(entry.date)}`
      : `نسخه ${entry.version}`,
    description: entry.items.join('؛ ')
  }))
}
