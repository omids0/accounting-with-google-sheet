import { ONLY_PREFIX, type SharedSplit } from '../components/form/sharedFields'

/** What the balance needs of a shared record; settlements («تسویه») are passed separately. */
export interface SharedRecordLite {
  type: 'income' | 'expense'
  amount: number
  payer: string
  split: SharedSplit
}

/** `from` paid `to` back `amount` (a «تسویه» record, see `settlementOf`). */
export interface SettlementLite {
  from: string
  to: string
  amount: number
}

export interface SharedBalance {
  /** Positive: the other person owes this one; negative: this person owes. Sums to exactly 0. */
  net: Record<string, number>
  /** Expenses each person paid. */
  paid: Record<string, number>
  /** Each person's part of the expenses. */
  share: Record<string, number>
  /**
   * Expenses and settlements left out: no payer, a payer or an `only:` person outside the two,
   * a settlement to oneself, or a non-positive amount. A page may flag them; they never count.
   */
  skipped: number
}

const key = (email: string) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

/**
 * The shared account's balance, computed and never stored. Every expense credits its payer the
 * full amount and charges each person their share: `only:<email>` puts all of it on that person;
 * `equal` puts floor(amount / 2) on the payer and the rest on the other, so every value stays a
 * whole toman. A settlement moves the balance from the receiver to the payer; incomes never do.
 * Only the two people count: nothing can make the balance (or a suggestion) name a stranger.
 */
export function computeBalance(
  records: SharedRecordLite[],
  settlements: SettlementLite[],
  emails: [string, string]
): SharedBalance {
  const people = emails.map(key)
  const zero = () => Object.fromEntries(people.map(email => [email, 0]))
  const paid: Record<string, number> = zero()
  const share: Record<string, number> = zero()
  const moved: Record<string, number> = zero()
  const isPerson = (email: string) => people.includes(email)
  const other = (email: string) => people.find(person => person !== email) ?? email
  let skipped = 0

  for (const record of records) {
    if (record.type !== 'expense') continue

    const payer = key(record.payer)
    const amount = Math.round(record.amount)
    const bearer = record.split === 'equal' ? null : key(record.split.slice(ONLY_PREFIX.length))

    if (!isPerson(payer) || !(amount > 0) || (bearer !== null && !isPerson(bearer))) {
      skipped++
      continue
    }

    paid[payer] += amount
    if (bearer !== null) {
      share[bearer] += amount
    } else {
      share[payer] += Math.floor(amount / 2)
      share[other(payer)] += amount - Math.floor(amount / 2)
    }
  }

  for (const settlement of settlements) {
    const from = key(settlement.from)
    const to = key(settlement.to)
    const amount = Math.round(settlement.amount)

    if (!isPerson(from) || !isPerson(to) || from === to || !(amount > 0)) {
      skipped++
      continue
    }

    moved[from] += amount
    moved[to] -= amount
  }

  const net = Object.fromEntries(
    people.map(email => [email, paid[email] - share[email] + moved[email] || 0])
  )

  return { net, paid, share, skipped }
}
