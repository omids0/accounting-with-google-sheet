import { useState } from 'react'

import ReconcileCorrectionModal from './ReconcileCorrectionModal'
import type { ReconcileWizard } from './useReconcileWizard'
import { FIRST_RECONCILE_DAYS, smsDayLabel } from '../../../services/bankSmsReconcile'
import { cn } from '../../../utils/cn'
import { formatPersianNumber } from '../../../utils/formatMoney'
import MoneyText from '../../MoneyText'
import Button from '../../ui/Button'
import Card, { CardTitle } from '../../ui/Card'

const rowClass = 'flex items-baseline justify-between gap-3 py-1 text-[0.82rem]'
const valueClass = 'font-numeric font-bold tabular-nums'

/** Part 1: «از آخرین تطبیق (<date>) تا الان», counts and the live difference. */
export function ReconcileSummary({ wizard }: { wizard: ReconcileWizard }) {
  const { view, entry } = wizard
  const difference = view?.result?.difference ?? 0
  const since = entry?.at ? smsDayLabel(Date.parse(entry.at)) : null

  return (
    <Card className="mb-0">
      <CardTitle>
        {since
          ? `از آخرین تطبیق (${since}) تا الان`
          : `در ${formatPersianNumber(FIRST_RECONCILE_DAYS)} روز گذشته`}
      </CardTitle>
      <div className={rowClass}>
        <span>پیامک‌های بانک</span>
        <span className={valueClass}>{formatPersianNumber(view?.smsCount ?? 0)}</span>
      </div>
      <div className={rowClass}>
        <span>تراکنش‌های اپ روی این حساب</span>
        <span className={valueClass}>{formatPersianNumber(view?.recordCount ?? 0)}</span>
      </div>
      <div className={cn(rowClass, difference ? 'text-danger' : 'text-success')} aria-live="polite">
        <span>اختلاف</span>
        <span className={valueClass}>
          {view?.result ? (
            <>
              <MoneyText amount={Math.abs(difference)} />
              {difference ? ` ${difference > 0 ? 'بیشتر' : 'کمتر'} در اپ` : ''}
            </>
          ) : (
            '—'
          )}
        </span>
      </div>
    </Card>
  )
}

/** Part 4: «هنوز N اختلاف» with the correction record, or «✓ … یکی شد». */
export function ReconcileFooter({ wizard }: { wizard: ReconcileWizard }) {
  const [correcting, setCorrecting] = useState(false)
  const result = wizard.view?.result

  if (!result) {
    return (
      <Card className="mb-0 text-[0.8rem] text-muted">
        برای این حساب پیامکی با «مانده» پیدا نشد؛ اول قالب پیامک این بانک را در «پیامک‌های بانکی»
        بساز.
      </Card>
    )
  }

  if (!result.difference) {
    return (
      <Card className="mb-0 font-bold text-success" role="status">
        ✓ موجودی اپ و بانک یکی شد
      </Card>
    )
  }

  return (
    <Card className="mb-0 flex flex-col gap-2 text-[0.8rem]">
      <strong className="text-danger">
        هنوز <MoneyText amount={Math.abs(result.difference)} /> اختلاف
      </strong>
      <p className="m-0 leading-[1.7] text-muted">
        پیامک‌های بالا را ثبت کن یا حساب تراکنش‌های بدون پیامک را درست کن. اگر باز هم ماند، یک رکورد
        اصلاحی با دستهٔ دلخواهت (مثلاً «کارمزد») ثبت می‌شود؛ موجودی حساب مستقیم عوض نمی‌شود.
      </p>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="self-start"
        disabled={wizard.busyKey !== null}
        onClick={() => setCorrecting(true)}
      >
        تنظیم دستی موجودی
      </Button>
      {correcting ? (
        <ReconcileCorrectionModal
          open
          difference={result.difference}
          saving={wizard.busyKey === 'correct'}
          onClose={() => setCorrecting(false)}
          onSubmit={options => {
            void wizard.correct(options).then(done => done && setCorrecting(false))
          }}
        />
      ) : null}
    </Card>
  )
}
