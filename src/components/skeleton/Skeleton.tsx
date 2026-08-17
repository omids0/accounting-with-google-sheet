import type { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'rect' | 'circle';
  style?: CSSProperties;
}

export function Skeleton({
  width,
  height,
  className = '',
  variant = 'text',
  style,
}: SkeletonProps) {
  return (
    <span
      className={`skeleton skeleton--${variant} ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}
