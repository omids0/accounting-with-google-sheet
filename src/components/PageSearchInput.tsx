import AppIcon from './AppIcon';

interface PageSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function PageSearchInput({
  value,
  onChange,
  placeholder = 'جستجو...',
}: PageSearchInputProps) {
  return (
    <div className="page-search">
      <span className="page-search-icon" aria-hidden="true">
        <AppIcon name="search" size={15} strokeWidth={2} />
      </span>
      <input
        type="search"
        className="page-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="page-search-clear"
          onClick={() => onChange('')}
          aria-label="پاک کردن جستجو"
        >
          <AppIcon name="close" size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
