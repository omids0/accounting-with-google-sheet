import { forecastDayLabel } from './forecastLabels'
import ForecastMoney from './ForecastMoney'
import type { PurchaseAssessment } from '../../services/cashForecastPurchase'
import { getTodayIso } from '../../utils/jalaliDate'
import AmountField from '../AmountField'
import CalmBlock from '../CalmBlock'
import JalaliDatePicker from '../JalaliDatePicker'
import { alertClassName } from '../ui/Alert'

const fieldLabelClass = 'mb-1 block text-[0.78rem] font-semibold text-text'

/** The sentence under the form. It reads only the lowest balance and its day from the estimate. */
function Verdict({ result }: { result: PurchaseAssessment }) {
  const lowest = (
    <>
      <ForecastMoney amount={result.lowest.balance} /> در{' '}
      <bdi>{forecastDayLabel(result.lowest.date)}</bdi>
    </>
  )

  if (result.verdict === 'none') {
    return (
      <p className={alertClassName('info', 'mb-0')}>چیزی برای سنجیدن نیست؛ مبلغ خرید را بنویس.</p>
    )
  }

  if (result.verdict === 'out-of-range') {
    return (
      <p className={alertClassName('info', 'mb-0')}>
        این تاریخ بعد از بازهٔ برآورد است؛ بازهٔ ۶۰ روزه را انتخاب کن یا تاریخ را زودتر بگذار.
      </p>
    )
  }

  if (result.verdict === 'ok') {
    return (
      <p className={alertClassName('success', 'mb-0')}>
        <strong>می‌توانی.</strong> در این برآورد پایین‌ترین مانده با این خرید {lowest} است، بالای
        حاشیهٔ امن (<ForecastMoney amount={result.safeMargin} />
        ).
      </p>
    )
  }

  if (result.verdict === 'tight') {
    return (
      <p className={alertClassName('warning', 'mb-0')}>
        <strong>تنگ می‌شود.</strong> در این برآورد پایین‌ترین مانده با این خرید {lowest} است، کمتر
        از حاشیهٔ امن (<ForecastMoney amount={result.safeMargin} />
        ).
      </p>
    )
  }

  return (
    <p className={alertClassName('error', 'mb-0')}>
      <strong>
        کم می‌آوری: <ForecastMoney amount={result.shortfall} /> در{' '}
        <bdi>{forecastDayLabel(result.lowest.date)}</bdi>.
      </strong>{' '}
      {result.alreadyShort
        ? 'در این برآورد حتی بدون این خرید هم مانده زیر صفر می‌رود.'
        : result.suggestedDate
        ? `اگر خرید را به ${forecastDayLabel(
            result.suggestedDate
          )} ببری، در این برآورد مانده زیر صفر نمی‌رود.`
        : 'در بازهٔ این برآورد تاریخی پیدا نشد که با آن مانده زیر صفر نرود.'}
    </p>
  )
}

/**
 * «می‌توانم بخرم؟»: an amount and an optional day. Nothing is recorded; the card only puts the
 * purchase on the estimate and reads the answer off the lowest balance.
 */
export default function ForecastPurchaseCard({
  amount,
  date,
  result,
  onAmountChange,
  onDateChange
}: {
  amount: number | ''
  date: string
  result: PurchaseAssessment
  onAmountChange: (amount: number | '') => void
  onDateChange: (date: string) => void
}) {
  return (
    <CalmBlock
      title="می‌توانم بخرم؟"
      badge={<span className="text-muted">· برآورد، ثبت نمی‌شود</span>}
    >
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2">
        <div>
          <span className={fieldLabelClass}>مبلغ خرید</span>
          <AmountField
            value={amount}
            onChange={onAmountChange}
            label="مبلغ خرید"
            placeholder="مبلغ خرید را وارد کنید"
          />
        </div>
        <div>
          <span className={fieldLabelClass}>تاریخ خرید (اختیاری)</span>
          <JalaliDatePicker
            value={date}
            onChange={onDateChange}
            allowEmpty
            emptyLabel="امروز"
            minIso={getTodayIso()}
          />
        </div>
      </div>
      <div className="mt-3" aria-live="polite">
        <Verdict result={result} />
      </div>
    </CalmBlock>
  )
}
