import type { ActivityEntry } from '../../services/activityLog'
import { firstPersonSummary } from '../../services/activityLogText'
import { createdAgoLabel } from '../../services/recordDuplicates'
import { writerLabel, type SharingInfo } from '../../services/sharing'
import { formatSmsWhen } from '../bankSms/smsLabels'

/** «سارا بودجهٔ «خوراک» را … تغییر داد» / «من قسط مهر … را پرداخت‌شده زدم». */
export function activityText(entry: ActivityEntry, info: SharingInfo | null): string {
  const who = writerLabel(entry.email, info)

  if (who.isMe) return `من ${firstPersonSummary(entry.summary)}`

  return `${entry.name || who.name} ${entry.summary}`
}

/** The person column of the desktop table and the person chips: «من» or the name. */
export function activityPerson(email: string, info: SharingInfo | null, fallback = ''): string {
  const who = writerLabel(email, info)

  return who.isMe ? 'من' : fallback || who.name
}

/** «۱۰ دقیقه پیش» within the hour, then «امروز ۱۴:۰۲» / «دیروز …» / the date. */
export function activityWhen(at: string, nowMs = Date.now()): string {
  const ms = Date.parse(at)

  if (Number.isNaN(ms)) return ''

  return nowMs - ms < 60 * 60_000 ? createdAgoLabel(ms, nowMs) : formatSmsWhen(ms, nowMs)
}

/** «۱۰ دقیقه پیش · Android» */
export function activityMeta(entry: ActivityEntry, nowMs = Date.now()): string {
  return [activityWhen(entry.at, nowMs), entry.device].filter(Boolean).join(' · ')
}
