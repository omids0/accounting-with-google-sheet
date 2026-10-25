import MoneyText from '../MoneyText'
import Card from '../ui/Card'
import {
  sharedBarClass,
  sharedCardHeadClass,
  sharedCardTitleClass,
  sharedLegendClass,
  sharedLegendDotClass,
  sharedLegendRowClass,
  sharedPersonFillClass
} from '../ui/sharedStyles'

interface SharedMonthCardProps {
  /** «آبان». */
  monthName: string
  total: number
  paid: Record<string, number>
  /** The owner and the partner, in that order (their colours on the bar). */
  people: [string, string]
  nameOf: (email: string) => string
}

/** «هزینهٔ آبان»: the month's shared spending and a bar of who paid how much of it. */
export default function SharedMonthCard({
  monthName,
  total,
  paid,
  people,
  nameOf
}: SharedMonthCardProps) {
  const part = (email: string) => (total > 0 ? ((paid[email] ?? 0) / total) * 100 : 0)

  const paidBy = (email: string) => {
    const name = nameOf(email)

    return name === 'شما' ? 'شما پرداخته‌اید' : `${name} پرداخته`
  }

  return (
    <Card>
      <div className={sharedCardHeadClass}>
        <h3 className={sharedCardTitleClass}>{`هزینهٔ ${monthName}`}</h3>
        <b className="numeric text-text">
          <MoneyText amount={total} />
        </b>
      </div>
      <div className={sharedBarClass} aria-hidden="true">
        {people.map((email, index) => (
          <i
            key={email}
            className={sharedPersonFillClass(index)}
            style={{ width: `${part(email)}%` }}
          />
        ))}
      </div>
      <ul className={sharedLegendClass}>
        {people.map((email, index) => (
          <li key={email} className={sharedLegendRowClass}>
            <span className={sharedLegendDotClass(index)} aria-hidden="true" />
            <span className="min-w-0 flex-1">{paidBy(email)}</span>
            <b className="numeric">
              <MoneyText amount={paid[email] ?? 0} />
            </b>
          </li>
        ))}
      </ul>
    </Card>
  )
}
