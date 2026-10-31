import { monthKeyOfIso } from '../../services/buildingMonths'
import { suggestSettlement, type SharedRow } from '../../services/sharedSettlement'
import { UNKNOWN_WRITER_NAME } from '../../services/sharing'
import { isolateLatin } from '../../utils/bidiIsolate'
import { formatMoney } from '../../utils/formatMoney'
import { parseNumeric } from '../../utils/parseNumeric'
import { isSettlement } from '../../utils/protectedCategories'
import {
  SHARED_CREATOR_FIELD_ID,
  SHARED_PAYER_FIELD_ID,
  SHARED_SPLIT_FIELD_ID,
  type SharedSplit
} from '../form/sharedFields'

/**
 * The words and numbers of the shared account's pages (home, records, settle), pure so the pages
 * stay thin and the copy is testable. E-mails are compared trimmed and lower-cased; copy says
 * «شریک», never «همسر».
 */

/** E-mail → display name (Drive's name, else «شریک» / «عضو سابق»; see `memberDisplayName`). */
export type PersonNames = Readonly<Record<string, string>>

type Values = Record<string, string | number | undefined>

const key = (email: unknown) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

/** A person who is no longer a member and has no Drive access (left, or removed). */
export const FORMER_MEMBER_NAME = 'عضو سابق'

/**
 * The name shown for someone other than me: Drive's name when known, else «عضو سابق» for a person
 * the member rows and Drive both no longer list, else «شریک». Never the Latin e-mail local part.
 */
export function memberDisplayName(
  label: { known: boolean; name: string },
  { isMember, hasAccess }: { isMember: boolean; hasAccess: boolean }
): string {
  if (label.known) return label.name

  return isMember || hasAccess ? UNKNOWN_WRITER_NAME : FORMER_MEMBER_NAME
}

/**
 * «شما» for the signed-in user; anyone else by name, else «شریک». A name with Latin letters is
 * isolated so it cannot reorder the Persian sentence around it.
 */
export function personName(email: string, me: string, names: PersonNames): string {
  const person = key(email)

  if (person && person === key(me)) return 'شما'

  return names[person] ? isolateLatin(names[person]) : UNKNOWN_WRITER_NAME
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
 * Said first when someone leaves, is removed or turns the account off with an open balance
 * («مینا ۳٬۱۴۰٬۰۰۰ تومان به شما بدهکار است.»); it never blocks. Null when the account is settled.
 */
export function sharedBalanceWarning(
  net: Record<string, number>,
  me: string,
  names: PersonNames = {}
): string | null {
  const owed = suggestSettlement(net)

  if (!owed) return null

  const amount = formatMoney(owed.amount)
  const to = personName(owed.to, me, names)

  return owed.from === key(me)
    ? `شما ${amount} به ${to} بدهکارید.`
    : `${personName(owed.from, me, names)} ${amount} به ${to} بدهکار است.`
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

/** The settle page and a locked settlement say the same line (prototype). */
export const SETTLE_PERMISSION_NOTE = 'ثبت تسویه با دسترسی «ثبت تسویه» ممکن است.'

/**
 * Why the record sheet shows no edit: a viewer, a partner whose «ثبت» switch is off, a settlement
 * without `settle` (a partner may still hold `record`), or another person's record without the right.
 */
export function recordLockNote({
  canRecord,
  creatorName,
  settlement = false,
  role = 'viewer'
}: {
  /** `settle` for a settlement, else `record`. */
  canRecord: boolean
  creatorName: string
  settlement?: boolean
  role?: string
}): string {
  if (!canRecord && settlement) return SETTLE_PERMISSION_NOTE
  if (!canRecord) {
    return role === 'viewer'
      ? 'ناظر نمی‌تواند ثبت‌ها را تغییر بدهد.'
      : 'دسترسی «ثبت هزینه و درآمد» شما خاموش است و ثبت‌ها را نمی‌توانید تغییر بدهید.'
  }

  return `این ثبت را ${
    creatorName || 'شخص دیگری'
  } انجام داده و شما دسترسی «ویرایش ثبت‌های دیگران» ندارید.`
}

/** The record as the latest read has it (rows shift after a delete); null once it is gone. */
export function latestRecord<T extends { id: string }>(rows: readonly T[], id: string): T | null {
  return rows.find(item => item.id === id) ?? null
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

/**
 * The two people of the balance (the add sheet uses it without `rows`: only members can be picked): the owner and the single partner; null until there is one.
 * With `rows`, a partner whose member row is gone (left, or removed) is still the other person
 * the rows name most (payer, `only:` bearer), so the balance stays for whoever remains.
 */
export function sharedPair(
  list: readonly { email: string; role: string }[],
  rows: readonly SharedRow[] = []
): [string, string] | null {
  const owner = key(list.find(member => member.role === 'owner')?.email)
  const partner = list.find(member => member.role === 'partner')
  const seen: Record<string, number> = {}

  for (const { values } of partner ? [] : rows) {
    for (const cell of [values[SHARED_PAYER_FIELD_ID], values[SHARED_SPLIT_FIELD_ID]]) {
      const email = key(cell).replace(/^only:/, '')

      if (email.includes('@') && email !== owner) seen[email] = (seen[email] ?? 0) + 1
    }
  }

  const other = partner
    ? key(partner.email)
    : Object.keys(seen).sort((a, b) => seen[b] - seen[a])[0]

  return owner && other ? [owner, other] : null
}
