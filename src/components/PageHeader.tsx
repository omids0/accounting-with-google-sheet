import PageSearchInput from './PageSearchInput';

interface PageHeaderProps {
  title: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export default function PageHeader({
  title,
  search,
  onSearchChange,
  searchPlaceholder,
}: PageHeaderProps) {
  return (
    <div className="card-header-row page-header-row">
      <h2 className="page-header-title">{title}</h2>
      <PageSearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
      />
    </div>
  );
}
