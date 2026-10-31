import { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'

import IntegrityAccountRow from './IntegrityAccountRow'
import IntegrityFindingRow from './IntegrityFindingRow'
import { useWalletIntegrity } from './useWalletIntegrity'
import type { IntegrityReport } from '../../../services/integrityTypes'
import { isConfigured } from '../../../services/settings'
import { cn } from '../../../utils/cn'
import { toPersianDigits } from '../../../utils/normalizeDigits'
import CalmBlock from '../../CalmBlock'
import EmptyState from '../../EmptyState'
import { RecordListSkeleton } from '../../skeleton'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import { calmListClass } from '../../ui/calmListStyles'
import Card, { CardTitle } from '../../ui/Card'
import { listModulePageClass } from '../../ui/featureCardStyles'

const lineClass = 'm-0 text-[0.82rem] leading-[1.9] text-muted'

const count = (value: number) => toPersianDigits(String(value))

/** Findings the account list already shows (one row per account), not listed twice. */
const ACCOUNT_KINDS = new Set(['balance-mismatch', 'no-history'])

const othersOf = (report: IntegrityReport) =>
  report.findings.filter(item => !ACCOUNT_KINDS.has(item.kind))

function verdictOf(report: IntegrityReport): string {
  const others = othersOf(report)
  const problems = others.filter(item => item.severity === 'problem').length

  if (!report.mismatched && !others.length) {
    return 'همه‌چیز می‌خواند؛ موجودی هر حساب با گردشش برابر است و مورد دیگری پیدا نشد.'
  }
  if (!report.mismatched && !problems) {
    return 'موجودی همهٔ حساب‌ها با گردششان برابر است؛ فقط چند مورد برای اطلاع هست.'
  }

  return `${count(report.mismatched)} حساب با گردشش نمی‌خواند و ${count(
    problems
  )} مورد احتمالاً اشتباه پیدا شد.`
}

/** `/wallet/integrity` — «بررسی یکپارچگی»: is every balance what its history adds up to? */
export default function WalletIntegrityPage() {
  const navigate = useNavigate()
  const { state, reload, fix, fixingId } = useWalletIntegrity()
  const report = state.status === 'ready' ? state.report : null
  // The accounts that disagree come first; the rest keep the wallet's order.
  const accounts = useMemo(
    () =>
      report
        ? [...report.accounts].sort((a, b) => Number(!!b.difference) - Number(!!a.difference))
        : [],
    [report]
  )

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!isConfigured()) {
    return <EmptyState icon="wallet" message="ابتدا با گوگل وارد شوید" />
  }
  if (state.status === 'loading') return <RecordListSkeleton />
  if (state.status === 'error' || !report) {
    return (
      <EmptyState
        icon="wallet"
        message="خواندن اطلاعات انجام نشد"
        action={{ label: 'تلاش دوباره', icon: 'refresh', onClick: reload }}
      />
    )
  }
  if (!accounts.length) {
    return (
      <EmptyState
        icon="wallet"
        message="حسابی برای بررسی نیست"
        description="بعد از ساختن حساب در کیف پول، این‌جا موجودی هر حساب با گردشش مقایسه می‌شود."
        action={{ label: 'بازگشت به کیف پول', icon: 'back', onClick: () => navigate('/wallet') }}
      />
    )
  }

  const others = othersOf(report)
  const bad = !report.clean && (report.mismatched > 0 || others.some(f => f.severity === 'problem'))

  return (
    <div className={listModulePageClass}>
      <Card className="mb-0">
        <CardTitle>بررسی یکپارچگی</CardTitle>
        <p className={lineClass}>
          <strong>ثبت‌شده:</strong> موجودی‌ای که روی کارت حساب نوشته شده.
        </p>
        <p className={lineClass}>
          <strong>گردش:</strong> موجودی اولیه + جمع همهٔ تغییرهای «گردش حساب» (انتقال‌ها هم داخل
          آن‌اند).
        </p>
        <p className={cn(lineClass, 'mt-2')}>
          این صفحه فقط می‌خواند و چیزی را عوض نمی‌کند؛ هر اصلاحی فقط با تأیید خودت و به‌صورت یک ردیف
          جدا و دیدنی ثبت می‌شود.
        </p>
      </Card>
      <Alert variant={bad ? 'warning' : 'success'} className="mb-0" aria-live="polite">
        {verdictOf(report)}
      </Alert>
      <CalmBlock
        title="حساب‌ها"
        badge={report.mismatched ? `· ${count(report.mismatched)} ناهمخوان` : null}
      >
        <ul className={calmListClass}>
          {accounts.map(check => (
            <IntegrityAccountRow
              key={check.accountId}
              check={check}
              fixing={fixingId === check.accountId}
              onFix={fix}
            />
          ))}
        </ul>
      </CalmBlock>
      {others.length ? (
        <CalmBlock title="موردهای دیگر" badge={`· ${count(others.length)}`}>
          <ul className={calmListClass}>
            {others.map(finding => (
              <IntegrityFindingRow key={finding.id} finding={finding} />
            ))}
          </ul>
        </CalmBlock>
      ) : null}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="min-h-11 self-start"
        onClick={reload}
      >
        بررسی دوباره
      </Button>
    </div>
  )
}
