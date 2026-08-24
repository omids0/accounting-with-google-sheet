import AppIcon from './AppIcon';

type CardDeleteButtonProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export default function CardDeleteButton({
  onClick,
  disabled = false,
  ariaLabel = 'حذف',
}: CardDeleteButtonProps) {
  return (
    <button
      type="button"
      className="card-action-btn card-delete-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="trash" size={16} strokeWidth={2} />
    </button>
  );
}
