import AppIcon from './AppIcon';

type CardEditButtonProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export default function CardEditButton({
  onClick,
  disabled = false,
  ariaLabel = 'ویرایش',
}: CardEditButtonProps) {
  return (
    <button
      type="button"
      className="card-action-btn card-edit-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <AppIcon name="edit" size={16} strokeWidth={2} />
    </button>
  );
}
