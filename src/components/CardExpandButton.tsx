import AppIcon from './AppIcon';

type CardExpandButtonProps = {
  expanded: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export default function CardExpandButton({
  expanded,
  onClick,
  disabled = false,
  ariaLabel = 'نمایش جزئیات',
}: CardExpandButtonProps) {
  return (
    <button
      type="button"
      className={`card-action-btn card-expand-btn${expanded ? ' card-expand-btn--expanded' : ''}`}
      onClick={onClick}
      disabled={disabled}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="chevron-down" size={16} strokeWidth={2} />
    </button>
  );
}
