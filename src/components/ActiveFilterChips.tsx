import AppIcon from './AppIcon';

export interface FilterChip {
  id: string;
  label: string;
  onRemove?: () => void;
}

export default function ActiveFilterChips({
  chips,
  onChipClick,
}: {
  chips: FilterChip[];
  onChipClick?: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="active-filter-chips" role="list" aria-label="فیلترهای فعال">
      {chips.map((chip) => (
        <span key={chip.id} className="active-filter-chip" role="listitem">
          <button
            type="button"
            className={`active-filter-chip__main${onChipClick ? ' active-filter-chip__main--clickable' : ''}`}
            onClick={onChipClick}
            disabled={!onChipClick}
            aria-label={`ویرایش فیلتر ${chip.label}`}
          >
            {chip.label}
          </button>
          {chip.onRemove && (
            <button
              type="button"
              className="active-filter-chip__remove"
              onClick={chip.onRemove}
              aria-label={`حذف فیلتر ${chip.label}`}
            >
              <AppIcon name="close" size={12} strokeWidth={2.4} />
            </button>
          )}
        </span>
      ))}
    </div>
  );
}
