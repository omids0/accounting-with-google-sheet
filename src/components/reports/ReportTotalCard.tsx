import { cn } from '../../utils/cn'
import MoneyText from '../MoneyText'
import Card from '../ui/Card'

/** The headline card of a report: what the figure is, the figure, one muted line under it. */
export default function ReportTotalCard({
  label,
  amount,
  tone,
  caption
}: {
  label: string
  amount: number
  tone: 'income' | 'expense' | 'neutral'
  caption: string
}) {
  return (
    <Card>
      <p className="m-0 text-[0.8rem] font-semibold text-muted">{label}</p>
      <p
        className={cn(
          'm-0 mt-1 text-[1.5rem] font-bold',
          tone === 'income' ? 'text-success' : tone === 'expense' ? 'text-danger' : 'text-text'
        )}
      >
        <MoneyText amount={amount} />
      </p>
      <p className="m-0 mt-1.5 text-[0.78rem] leading-[1.6] text-muted">{caption}</p>
    </Card>
  )
}
