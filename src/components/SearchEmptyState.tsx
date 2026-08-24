import AppIcon from './AppIcon';

export default function SearchEmptyState() {
  return (
    <div className="empty-state">
      <div className="icon">
        <AppIcon name="search" />
      </div>
      <p>نتیجه‌ای یافت نشد</p>
    </div>
  );
}
