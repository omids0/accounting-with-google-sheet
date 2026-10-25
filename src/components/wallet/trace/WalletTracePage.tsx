import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import TraceFindings from './TraceFindings'
import TraceRemainder from './TraceRemainder'
import TraceSummary from './TraceSummary'
import TraceTimeline from './TraceTimeline'
import { useWalletTrace } from './useWalletTrace'
import { isConfigured } from '../../../services/settings'
import EmptyState from '../../EmptyState'
import { RecordListSkeleton } from '../../skeleton'
import Alert from '../../ui/Alert'
import Button from '../../ui/Button'
import { listModulePageClass } from '../../ui/featureCardStyles'

/** `/wallet/trace` — «ردیاب اختلاف»: why the wallet and the calculated balance disagree. */
export default function WalletTracePage() {
  const navigate = useNavigate()
  const trace = useWalletTrace()
  const { state } = trace

  // The wallet alert sits low on the page: arrive at the summary, not mid-page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!isConfigured()) {
    return <EmptyState icon="wallet" message="ابتدا با گوگل وارد شوید" />
  }

  if (state.status === 'loading') return <RecordListSkeleton />

  if (state.status === 'error') {
    return (
      <EmptyState
        icon="wallet"
        message="خواندن اطلاعات انجام نشد"
        action={{ label: 'تلاش دوباره', icon: 'refresh', onClick: trace.reload }}
      />
    )
  }

  const { result } = state

  if (!result.report.difference && !result.report.findings.length) {
    return (
      <EmptyState
        icon="wallet"
        message="اختلافی نیست"
        description="کیف پول و مانده محاسبه‌شده یکی‌اند و چیزی برای ردیابی نمانده."
        action={{ label: 'بازگشت به کیف پول', icon: 'back', onClick: () => navigate('/wallet') }}
      />
    )
  }

  return (
    <div className={listModulePageClass}>
      {result.ledgerFailed ? (
        <Alert variant="warning" className="mb-0 flex flex-col items-start gap-2">
          <span>گردش حساب‌ها خوانده نشد، پس فهرست علت‌ها ناقص است و درصد بالا قابل اتکا نیست.</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11"
            onClick={trace.reload}
          >
            تلاش دوباره
          </Button>
        </Alert>
      ) : null}
      <TraceSummary result={result} />
      <TraceFindings
        findings={result.report.findings}
        acked={trace.acked}
        onToggleAck={trace.toggleAck}
      />
      <TraceTimeline report={result.report} />
      <TraceRemainder result={result} trace={trace} />
    </div>
  )
}
