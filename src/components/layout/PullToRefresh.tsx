import type { CSSProperties } from 'react'

import { runPageRefresh } from '../../hooks/usePageSpeedDial'
import { usePullToRefresh, type PullPhase } from '../../hooks/usePullToRefresh'
import {
  PULL_REFRESHING_HEIGHT,
  pullLabelClass,
  pullRowClass,
  pullSpinnerClass
} from '../ui/pullToRefreshStyles'

const LABELS: Record<PullPhase, string> = {
  idle: '',
  pulling: 'برای بروزرسانی بکش پایین',
  ready: 'رها کن تا بروزرسانی شود',
  refreshing: 'در حال بروزرسانی…'
}

interface PullToRefreshProps {
  /** The page has a «بروزرسانی» action; the gesture runs the same callback. */
  enabled: boolean
}

/** Spinner row above the page content for the pull-down-to-refresh gesture. */
export default function PullToRefresh({ enabled }: PullToRefreshProps) {
  const { distance, phase } = usePullToRefresh(enabled ? runPageRefresh : null)
  const height = phase === 'refreshing' ? PULL_REFRESHING_HEIGHT : distance

  return (
    <>
      <div className={pullRowClass(phase)} style={{ height }} aria-hidden>
        {phase !== 'idle' && (
          <>
            <span
              className={pullSpinnerClass(phase)}
              style={{ '--pull-turn': `${distance * 4}deg` } as CSSProperties}
            />
            <span className={pullLabelClass}>{LABELS[phase]}</span>
          </>
        )}
      </div>
      <span className="sr-only" role="status">
        {phase === 'refreshing' ? LABELS.refreshing : ''}
      </span>
    </>
  )
}
