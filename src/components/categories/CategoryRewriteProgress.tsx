import type { RewriteProgress } from '../../services/categoryRewrite'
import { formatPersianNumber } from '../../utils/formatMoney'
import ProgressBar from '../ProgressBar'
import { categoryProgressClass } from '../ui/categoryPageStyles'

/** «به‌روزرسانی رکوردها… ۱۲ از ۳۱» while a rename or merge rewrites rows. */
export default function CategoryRewriteProgress({
  progress
}: {
  progress: RewriteProgress | null
}) {
  if (!progress?.total) return null

  const percent = Math.round((progress.done / progress.total) * 100)

  return (
    <div className={categoryProgressClass} role="status" aria-live="polite">
      <span>
        {`به‌روزرسانی رکوردها… ${formatPersianNumber(progress.done)} از ${formatPersianNumber(
          progress.total
        )}`}
      </span>
      <ProgressBar
        value={percent}
        showLabel={false}
        shimmer={false}
        aria-label="پیشرفت به‌روزرسانی رکوردها"
      />
    </div>
  )
}
