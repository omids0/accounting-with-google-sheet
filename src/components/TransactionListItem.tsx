import type { CSSProperties, ReactNode } from 'react';

type TransactionTone = 'income' | 'expense' | 'neutral';

interface TransactionListItemProps {
  title: string;
  meta?: ReactNode;
  children?: ReactNode;
  tone?: TransactionTone;
  index?: number;
  className?: string;
}

export default function TransactionListItem({
  title,
  meta,
  children,
  tone = 'neutral',
  index = 0,
  className = '',
}: TransactionListItemProps) {
  const style: CSSProperties = {
    animationDelay: `${Math.min(index, 12) * 0.04}s`,
  };

  return (
    <div
      className={`record-item record-item--interactive record-item--${tone}${
        className ? ` ${className}` : ''
      }`}
      style={style}
    >
      <span className="record-item-accent" aria-hidden="true" />
      <div className="record-item-main">
        <div className="record-item-title">{title}</div>
        {meta ? <div className="record-item-meta">{meta}</div> : null}
      </div>
      {children}
    </div>
  );
}
