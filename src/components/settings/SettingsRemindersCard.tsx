import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

type SettingsRemindersCardProps = {
  onOpenReminders: () => void
}

export default function SettingsRemindersCard({ onOpenReminders }: SettingsRemindersCardProps) {
  return (
    <Card>
      <CardTitle>یادآوری‌ها</CardTitle>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-muted)',
          marginBottom: '0.75rem'
        }}
      >
        اعلان اقساط، چک‌ها، بدهی‌ها، مواعد شخصی و جمع‌بندی شبانه را روشن یا خاموش کنید و ساعتشان را
        انتخاب کنید.
      </p>
      <Button type="button" variant="primary" size="sm" onClick={onOpenReminders}>
        مدیریت یادآوری‌ها
      </Button>
    </Card>
  )
}
