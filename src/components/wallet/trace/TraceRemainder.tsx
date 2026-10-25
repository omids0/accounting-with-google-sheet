import { useState } from 'react'
import { useNavigate } from 'react-router'

import type { WalletTrace } from './useWalletTrace'
import { recordFocusPath } from '../../../routes/recordPaths'
import type { WalletTraceResult } from '../../../services/walletTraceLoad'
import { useNavigationStore } from '../../../stores/navigationStore'
import { formatMoney } from '../../../utils/formatMoney'
import ConfirmActionModal from '../../ConfirmActionModal'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'

/**
 * What no trace in the data explains, with guesses by amount, the opening balance that would
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
  const [confirming, setConfirming] = useState(false)
  const { report, monthLabel } = result
  const { difference, remainder, hints, impliedAnchor } = report

  if (!difference) return null

  return (
    <Card className="mb-0 flex flex-col gap-2 text-[0.8rem]">
      <CardTitle className="mb-0">
        {Math.abs(remainder) < 1 ? 'بستن اختلاف' : 'بدون ردّ در داده‌ها'}
      </CardTitle>
      {Math.abs(remainder) >= 1 ? (
        <>
          <p className="m-0 leading-[1.8] text-muted">
            <MoneyText amount={Math.abs(remainder)} /> از اختلاف را هیچ رکورد یا گردشی توضیح
            نمی‌دهد. معمولاً یعنی «موجودی اول» ماه شروع محاسبه با واقعیت نمی‌خواند، یا پولی خارج از
            اپ جابه‌جا شده.
          </p>
          {hints.length ? (
            <ul className="m-0 flex list-none flex-col gap-1 p-0 text-muted">
              {hints.map(hint => (
                <li key={hint.text} className="flex items-start justify-between gap-2">
                  <span className="leading-[1.7]">{hint.text}</span>
                  {hint.record ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
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
            <p className="m-0 leading-[1.8] text-muted">
              اگر مشکل از «موجودی اول» ماه شروع باشد، با <MoneyText amount={impliedAnchor} /> اختلاف
              صفر می‌شود (الان <MoneyText amount={impliedAnchor - remainder} /> است).
            </p>
          ) : null}
        </>
      ) : null}
      <p className="m-0 leading-[1.8] text-muted">
        اگر علت را پیدا کردی و درست کردی، این صفحه را دوباره باز کن. اگر نشد یا برایت مهم نبود،
        اختلاف را با یک رکورد «اصلاح موجودی» ببند؛ موجودی هیچ حسابی عوض نمی‌شود.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => useNavigationStore.getState().onTabChange('opening-balances')}
        >
          موجودی اول دوره‌ها
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={trace.posting}
          loading={trace.posting}
          onClick={() => setConfirming(true)}
        >
          ثبت {difference > 0 ? 'درآمد' : 'هزینه'} اصلاح موجودی
        </Button>
      </div>
      <ConfirmActionModal
        open={confirming}
        title="ثبت اصلاح موجودی"
        message={`یک ${difference > 0 ? 'درآمد' : 'هزینه'} «اصلاح موجودی» به مبلغ ${formatMoney(
          Math.abs(difference)
        )} برای ${monthLabel} ثبت می‌شود و اختلاف صفر می‌شود. این فقط عدد را برابر می‌کند و علت‌ها حل نمی‌شوند.`}
        confirmLabel="ثبت کن"
        confirming={trace.posting}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          void trace.postCorrection().then(done => done && setConfirming(false))
        }}
      />
    </Card>
  )
}
