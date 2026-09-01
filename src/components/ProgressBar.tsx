import type { CSSProperties } from 'react';
import { useAnimatedProgress } from '../hooks/useAnimatedProgress';
import { formatPersianNumber } from '../utils/formatMoney';

type ProgressBarVariant = 'default' | 'complete' | 'success';

interface ProgressBarProps {
  value: number;
  variant?: ProgressBarVariant;
  showLabel?: boolean;
  animateIndex?: number;
  animated?: boolean;
  className?: string;
  'aria-label'?: string;
}

export default function ProgressBar({
  value,
  variant = 'default',
  showLabel = true,
  animateIndex = 0,
  animated = true,
  className = '',
  'aria-label': ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const animatedValue = useAnimatedProgress(clamped, 750, animated);
  const displayPct = Math.round(animatedValue);

  const style = {
    '--progress-delay': `${Math.min(animateIndex, 10) * 0.07}s`,
  } as CSSProperties;

  return (
    <div
      className={`progress-bar progress-bar--${variant}${animated ? '' : ' progress-bar--static'}${className ? ` ${className}` : ''}`}
      style={style}
    >
      <div className="progress-bar__meta">
        <div
          className="progress-bar__track"
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={ariaLabel}
        >
          <div className="progress-bar__fill" style={{ width: `${animatedValue}%` }}>
            <span className="progress-bar__shine" aria-hidden="true" />
            <span className="progress-bar__glow" aria-hidden="true" />
          </div>
        </div>
        {showLabel ? (
          <span className="progress-bar__label numeric" aria-hidden="true">
            {formatPersianNumber(displayPct, { useGrouping: false })}٪
          </span>
        ) : null}
      </div>
    </div>
  );
}
