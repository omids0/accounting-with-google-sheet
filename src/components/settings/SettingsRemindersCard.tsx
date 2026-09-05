type SettingsRemindersCardProps = {
  onOpenReminders: () => void
}

export default function SettingsRemindersCard({ onOpenReminders }: SettingsRemindersCardProps) {
  return (
    <div className="card">
      <h2 className="card-title">یادآوری‌ها</h2>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          marginBottom: '0.75rem'
        }}
      >
        یادآوری اقساط و سایر موارد را با نوتیف PWA مدیریت کنید.
      </p>
      <button type="button" className="btn btn-primary btn-sm" onClick={onOpenReminders}>
        مدیریت یادآوری‌ها
      </button>
    </div>
  )
}
