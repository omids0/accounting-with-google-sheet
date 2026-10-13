import type { PriceChange } from '../../../services/lineItemsReport'
import { formatPersianNumber } from '../../../utils/formatMoney'
import { formatPersianPercent } from '../../charts/chartUtils'
import {
  calmBlockClass,
  calmBlockHeadClass,
  calmBlockTitleClass,
  calmListClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../../ui/calmListStyles'

/** «گران‌تر از ماه قبل»: items whose price per unit rose by 5% or more. */
export default function PricierSection({ changes }: { changes: PriceChange[] }) {
  if (!changes.length) return null

  return (
    <section className={calmBlockClass} aria-label="گران‌تر از ماه قبل">
      <div className={calmBlockHeadClass}>
        <h3 className={calmBlockTitleClass}>گران‌تر از ماه قبل</h3>
      </div>
      <ul className={calmListClass}>
        {changes.map(change => (
          <li key={change.key} className={calmRowClass}>
            <span className={calmRowMainClass}>
              <span className={calmRowTitleClass}>{change.name}</span>
              <span className={calmRowSubClass}>
                {`${formatPersianNumber(Math.round(change.from))} ← ${formatPersianNumber(
                  Math.round(change.to)
                )} برای هر ${change.unit || 'واحد'}`}
              </span>
            </span>
            <span className={`${calmRowEndClass} text-danger`}>
              {`↑ ${formatPersianPercent(Math.round(change.pct))}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
