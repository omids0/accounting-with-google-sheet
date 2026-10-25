import { useState } from 'react'
import { useNavigate } from 'react-router'

import { maskAmountsInText } from './traceMask'
import { isOvershoot } from './TraceSummary'
import type { WalletTrace } from './useWalletTrace'
import { useIsAmountsHidden } from '../../../hooks/useAmountsHidden'
import { recordFocusPath } from '../../../routes/recordPaths'
import type { WalletTraceResult } from '../../../services/walletTraceLoad'
import { useNavigationStore } from '../../../stores/navigationStore'
import { formatMoney } from '../../../utils/formatMoney'
import ConfirmActionModal from '../../ConfirmActionModal'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'

const textClass = 'm-0 leading-[1.9] text-muted'
const buttonClass = 'min-h-11'

/**
 * What nothing in the data explains, with guesses by amount, the opening balance that would
 * close it, and — as the last resort — the correction record the wallet page also offers.
 */
export default function TraceRemainder({
  result,
  trace
}: {
  result: WalletTraceResult
  trace: WalletTrace
}) {
  const navigate = useNavigate()
  const hidden = useIsAmountsHidden()
  const [confirming, setConfirming] = useState(false)
  const { report, monthLabel } = result
  const { difference, remainder, hints, impliedAnchor } = report
  const overshoot = isOvershoot(difference, remainder)
  const direction = difference > 0 ? 'درآمد' : 'هزینه'

  if (!difference) return null

  return (
    <Card id="trace-remainder" className="mb-0 flex flex-col gap-2 text-[0.82rem]">
      <CardTitle className="mb-0">
        {Math.abs(remainder) < 1 ? 'بستن اختلاف' : 'اختلافی که علتش پیدا نشد'}
      </CardTitle>
      {overshoot ? (
        <p className={textClass}>
          موردهای بالا روی هم از اختلاف بیشترند و بعضی‌شان همدیگر را خنثی می‌کنند؛ پس نمی‌شود گفت چه
          مقدارش بی‌علت مانده. اول موردهای بزرگ را درست کن و صفحه را دوباره باز کن.
        </p>
      ) : Math.abs(remainder) >= 1 ? (
        <>
          <p className={textClass}>
            <MoneyText amount={Math.abs(remainder)} /> از اختلاف را هیچ رکورد یا تغییری توضیح
            نمی‌دهد. معمولاً یعنی «موجودی اول دوره» با واقعیت نمی‌خواند، یا پولی بیرون از اپ جابه‌جا
            شده.
          </p>
          {hints.length ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-muted">
              {hints.map((hint, index) => (
                <li key={`${hint.record?.id ?? index}`} className="flex items-start gap-2">
                  <span className="flex-1 leading-[1.8]">
                    {maskAmountsInText(hint.text, hidden)}
                  </span>
                  {hint.record ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className={buttonClass}
                      onClick={() =>
                        hint.record && navigate(recordFocusPath(hint.record.type, hint.record.id))
                      }
                    >
                      دیدن
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
          {impliedAnchor !== null ? (
            <p className={textClass}>
              اگر «موجودی اول دوره» ماه شروع اشتباه باشد، با <MoneyText amount={impliedAnchor} />{' '}
              اختلاف صفر می‌شود (الان <MoneyText amount={impliedAnchor - remainder} /> است).
            </p>
          ) : null}
        </>
      ) : null}
      <p className={textClass}>
        اگر علت را پیدا کردی و درست کردی، این صفحه را دوباره باز کن. اگر نشد یا برایت مهم نبود،
        اختلاف را با یک رکورد «اصلاح موجودی» ببند. موجودی هیچ حسابی عوض نمی‌شود.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={buttonClass}
          onClick={() => useNavigationStore.getState().onTabChange('opening-balances')}
        >
          رفتن به موجودی اول دوره‌ها
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={buttonClass}
          disabled={trace.posting}
          loading={trace.posting}
          onClick={() => setConfirming(true)}
        >
          ثبت {direction} اصلاح موجودی
        </Button>
      </div>
      <ConfirmActionModal
        open={confirming}
        title="ثبت اصلاح موجودی"
        message={maskAmountsInText(
          `یک ${direction} «اصلاح موجودی» به مبلغ ${formatMoney(
            Math.abs(difference)
          )} برای ${monthLabel} ثبت می‌شود و اختلاف صفر می‌شود. موجودی هیچ حسابی عوض نمی‌شود، ولی این مبلغ در ${direction} همین ماه و گزارش‌ها هم شمرده می‌شود. هر وقت خواستی می‌توانی آن رکورد را پاک کنی.`,
          hidden
        )}
        confirmLabel="ثبت رکورد اصلاح"
        confirming={trace.posting}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void trace.postCorrection().then(done => done && setConfirming(false))
        }}
      />
    </Card>
  )
}
