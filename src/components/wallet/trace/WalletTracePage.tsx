import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import TraceFindings from './TraceFindings'
import TraceRemainder from './TraceRemainder'
import TraceStoryCard from './TraceStory'
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
  const [showAll, setShowAll] = useState(false)

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

  const { story } = result.report
  // No difference left, or its cause named: the small differences around it are detail (and when
  // the difference is zero they cancel each other), not the first thing to read.
  const settled = Math.abs(result.report.difference) < 1
  const quiet = !!story?.exact || settled
  const collapsed = quiet && !showAll && result.report.findings.length > 0
  const count = result.report.findings.length.toLocaleString('fa-IR')

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
      {story ? <TraceStoryCard story={story} difference={result.report.difference} /> : null}
      {collapsed ? (
        <>
          <p className="m-0 text-[0.8rem] leading-[1.9] text-muted">
            {settled
              ? 'موردهایی هم هست که همدیگر را خنثی می‌کنند؛ لازم نیست نگاهشان کنی.'
              : 'موردهای کوچک‌تر دیگری هم هست که به‌احتمال زیاد ربطی به این اختلاف ندارند.'}
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="min-h-11 self-start"
            onClick={() => setShowAll(true)}
          >
            {settled ? 'دیدن موردهایی که همدیگر را خنثی می‌کنند' : 'دیدن موردهای کوچک‌تر'} ({count})
          </Button>
        </>
      ) : (
        <>
          <TraceFindings
            findings={result.report.findings}
            acked={trace.acked}
            onToggleAck={trace.toggleAck}
            minor={quiet}
          />
          <TraceTimeline report={result.report} />
          {quiet ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="min-h-11 self-start"
              onClick={() => setShowAll(false)}
            >
              پنهان کردن این موردها
            </Button>
          ) : null}
        </>
      )}
      <TraceRemainder result={result} trace={trace} />
    </div>
  )
}
