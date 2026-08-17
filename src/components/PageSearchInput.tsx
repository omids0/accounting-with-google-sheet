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
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
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
          ×
        </button>
      )}
    </div>
  );
}
