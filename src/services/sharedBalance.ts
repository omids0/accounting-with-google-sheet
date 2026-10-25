import type { SharedSplit } from '../components/form/sharedFields'

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
  /** Positive: the others owe this person; negative: this person owes. Sums to zero. */
  net: Record<string, number>
  /** Expenses each person paid. */
  paid: Record<string, number>
  /** Each person's part of the expenses. */
  share: Record<string, number>
}

const key = (email: string) =>
  String(email ?? '')
    .trim()
    .toLowerCase()

const add = (totals: Record<string, number>, email: string, amount: number) => {
  totals[email] = (totals[email] ?? 0) + amount
}

/**
 * The shared account's balance, computed and never stored: every expense credits its payer the
 * full amount and charges each person their share (`equal` = half each, `only:<email>` = all of
 * it); a settlement moves the balance from the receiver to the payer. Incomes never move it.
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

  for (const record of records) {
    const payer = key(record.payer)

    if (record.type !== 'expense' || !payer || !(record.amount > 0)) continue

    add(paid, payer, record.amount)
    if (record.split === 'equal') {
      people.forEach(email => add(share, email, record.amount / people.length))
    } else {
      add(share, key(record.split.slice('only:'.length)), record.amount)
    }
  }

  for (const settlement of settlements) {
    if (!(settlement.amount > 0)) continue

    add(moved, key(settlement.from), settlement.amount)
    add(moved, key(settlement.to), -settlement.amount)
  }

  const everyone = new Set([...Object.keys(paid), ...Object.keys(share), ...Object.keys(moved)])
  const net = Object.fromEntries(
    [...everyone].map(email => [
      email,
      (paid[email] ?? 0) - (share[email] ?? 0) + (moved[email] ?? 0) || 0
    ])
  )

  return { net, paid, share }
}
