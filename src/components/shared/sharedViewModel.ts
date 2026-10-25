import { monthKeyOfIso } from '../../services/buildingMonths'
import { suggestSettlement, type SharedRow } from '../../services/sharedSettlement'
import { parseNumeric } from '../../utils/parseNumeric'
import { SETTLEMENT_CATEGORY } from '../../utils/protectedCategories'
import {
  SHARED_CREATOR_FIELD_ID,
  SHARED_PAYER_FIELD_ID,
  type SharedSplit
} from '../form/sharedFields'

/**
 * The words and numbers of the shared account's pages (home, records, settle), pure so the pages
 * stay thin and the copy is testable. E-mails are compared trimmed and lower-cased; copy says
 * «شریک», never «همسر».
 */

/** E-mail → display name (Drive's name, else the e-mail local part; see `writerLabel`). */
export type PersonNames = Readonly<Record<string, string>>

type Values = Record<string, string | number | undefined>

const key = (email: unknown) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

/** «شما» for the signed-in user; anyone else by name, else the part of the e-mail before '@'. */
export function personName(email: string, me: string, names: PersonNames): string {
  const person = key(email)

  if (person && person === key(me)) return 'شما'

  return names[person] || person.split('@')[0] || person
}

/**
 * The balance card's sentence: «شما به X بدهکارید», «X به شما بدهکار است» or «حساب شما صاف است»;
 * someone outside the two (a viewer) reads «X به Y بدهکار است» / «حساب صاف است».
 */
export function balanceHeadline(
  net: Record<string, number>,
  me: string,
  names: PersonNames
): string {
  const mine = Object.keys(net).includes(key(me))
  const owed = suggestSettlement(net)

  if (!owed) return mine ? 'حساب شما صاف است' : 'حساب صاف است'

  const from = personName(owed.from, me, names)
  const to = personName(owed.to, me, names)

  if (owed.from === key(me)) return `شما به ${to} بدهکارید`

  return `${from} به ${to} بدهکار است`
}

/**
 * Amount edit and delete of a shared record: only with `record`, and only on an own record
 * (`ایجادکننده` = me) unless `editOthers` is on. A row with no creator is someone else's.
 */
export function canEditRecord({
  me,
  creator,
  canRecord,
  canEditOthers
}: {
  me: string
  creator: string
  canRecord: boolean
  canEditOthers: boolean
}): boolean {
  if (!canRecord) return false
  if (canEditOthers) return true

  return !!key(creator) && key(creator) === key(me)
}

/** Why the record sheet shows no edit: a viewer, or another person's record without the right. */
export function recordLockNote({
  canRecord,
  creatorName
}: {
  canRecord: boolean
  creatorName: string
}): string {
  if (!canRecord) return 'ناظر نمی‌تواند ثبت‌ها را تغییر بدهد.'

  return `این ثبت را ${
    creatorName || 'شخص دیگری'
  } انجام داده و شما دسترسی «ویرایش ثبت‌های دیگران» ندارید.`
}

export interface SharePart {
  email: string
  share: number
}

/**
 * Each person's part of an expense, the same rule as the balance (`computeBalance`): `only:x`
 * puts all of it on x; `equal` gives the payer floor(amount / 2) and the other person the rest.
 */
export function splitPreview(
  amount: number,
  split: SharedSplit,
  emails: [string, string],
  payer: string = emails[0]
): SharePart[] {
  const total = Math.max(0, Math.round(amount || 0))
  const people = emails.map(key)
  const bearer = split === 'equal' ? null : key(split.slice('only:'.length))
  const payerKey = people.includes(key(payer)) ? key(payer) : people[0]

  return people.map(email => {
    if (bearer !== null) return { email, share: email === bearer ? total : 0 }

    const half = Math.floor(total / 2)

    return { email, share: email === payerKey ? half : total - half }
  })
}

/** «نصف‌نصف» or «فقط برای X» on a row and in the record sheet. */
export function splitLabel(split: SharedSplit, me: string, names: PersonNames): string {
  if (split === 'equal') return 'نصف‌نصف'

  return `فقط برای ${personName(split.slice('only:'.length), me, names)}`
}

const isSettlement = (values: Values) =>
  String(values.category ?? '').trim() === SETTLEMENT_CATEGORY

/**
 * The month's spending (Jalali `YYYY-MM`): the total of its expenses and what each payer paid.
 * Settlements («تسویه») and incomes are not spending.
 */
export function monthTotals(
  rows: SharedRow[],
  month: string
): { total: number; paid: Record<string, number> } {
  const paid: Record<string, number> = {}
  let total = 0

  for (const { type, values } of rows) {
    const date = String(values.date ?? '')
    const amount = Math.round(parseNumeric(values.amount))

    if (type !== 'expense' || isSettlement(values) || !date || !(amount > 0)) continue
    if (monthKeyOfIso(date) !== month) continue

    total += amount

    const payer = key(values[SHARED_PAYER_FIELD_ID])

    if (payer) paid[payer] = (paid[payer] ?? 0) + amount
  }

  return { total, paid }
}

/** The records filter: «همه», or one person's (the payer; an income, which has none, by creator). */
export function matchesPerson(values: Values, person: string): boolean {
  if (person === 'all') return true

  return key(values[SHARED_PAYER_FIELD_ID] || values[SHARED_CREATOR_FIELD_ID]) === key(person)
}

/** The two people of the balance: the owner and the single partner; null until there is one. */
export function sharedPair(
  list: readonly { email: string; role: string }[]
): [string, string] | null {
  const owner = list.find(member => member.role === 'owner')
  const partner = list.find(member => member.role === 'partner')

  return owner && partner ? [key(owner.email), key(partner.email)] : null
}
