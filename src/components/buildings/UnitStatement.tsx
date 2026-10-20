import type { UnitStatementData } from '../../services/buildingStatement'
import { formatIsoDatePersian } from '../../utils/jalaliDate'
import { toPersianDigits } from '../../utils/normalizeDigits'
import MoneyText from '../MoneyText'
import {
  calmListClass,
  calmNoteClass,
  calmRowClass,
  calmRowEndClass,
  calmRowMainClass,
  calmRowSubClass,
  calmRowTitleClass
} from '../ui/calmListStyles'

const sectionTitleClass = 'm-0 px-0.5 text-[0.86rem] font-bold text-text'

/**
 * «صورت‌حساب» (screen 17): what the unit owes, oldest first (a capital share says «به نام مالک»
 * when it is addressed to the owner), the payments of the last three months, the credit and the
 * fund card to pay into.
 */
export default function UnitStatement({ data, card }: { data: UnitStatementData; card: string }) {
  return (
    <>
      <ul className={calmListClass}>
        {data.items.length ? (
          data.items.map(item => (
            <li key={item.id} className={calmRowClass}>
              <span className={calmRowMainClass}>
                <span className={calmRowTitleClass}>{item.label}</span>
                <span className={calmRowSubClass}>
                  {item.kind === 'share'
                    ? item.ownerNamed
                      ? 'به نام مالک'
                      : 'سهم از هزینه'
                    : `سررسید ${formatIsoDatePersian(item.due)}`}
                  {item.paid > 0 ? (
                    <>
                      {' '}
                      · پرداخت‌شده <MoneyText amount={item.paid} />
                    </>
                  ) : null}
                </span>
              </span>
              <span className={`${calmRowEndClass} text-danger`}>
                <MoneyText amount={item.open} />
              </span>
            </li>
          ))
        ) : (
          <li className={calmRowClass}>
            <span className={`${calmRowTitleClass} text-success`}>بدهی بازی ندارد ✓</span>
          </li>
        )}
        <li className={calmRowClass}>
          <span className={calmRowTitleClass}>جمع بدهی</span>
          <span className={calmRowEndClass}>
            <MoneyText amount={data.totalOpen} />
          </span>
        </li>
        {data.credit > 0 ? (
          <li className={calmRowClass}>
            <span className={calmRowTitleClass}>اعتبار</span>
            <span className={`${calmRowEndClass} text-success`}>
              <MoneyText amount={data.credit} />
            </span>
          </li>
        ) : null}
      </ul>

      {data.paid.length ? (
        <>
          <h2 className={sectionTitleClass}>پرداخت‌های اخیر</h2>
          <ul className={calmListClass}>
            {data.paid.map(item => (
              <li key={item.id} className={calmRowClass}>
                <span className={calmRowMainClass}>
                  <span className={calmRowTitleClass}>{item.label}</span>
                  <span className={calmRowSubClass}>
                    {formatIsoDatePersian(item.paidAt)}
                    {item.fromCredit ? ' · از اعتبار' : ''}
                  </span>
                </span>
                <span className={`${calmRowEndClass} text-success`}>
                  <MoneyText amount={item.amount} />
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p className={calmNoteClass}>کارت صندوق برای واریز: {card ? toPersianDigits(card) : '—'}</p>
    </>
  )
}
