import Alert from './ui/Alert'
import Button from './ui/Button'
import { useAppUpdateCheck } from '../hooks/useAppUpdateCheck'

export default function UpdateBanner() {
  const { update, dismiss } = useAppUpdateCheck()

  if (!update) return null

  return (
    <Alert
      variant="info"
      style={{ margin: 'var(--space-page)', marginBottom: 0 }}
      aria-live="polite"
    >
      <p style={{ marginBottom: '0.5rem' }}>
        نسخهٔ {update.versionName} آمادهٔ نصب است. پس از دانلود، روی فایل بزنید تا به‌روزرسانی شود.
      </p>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          variant="primary"
          size="sm"
          type="button"
          onClick={() => window.open(update.apkUrl, '_blank')}
        >
          دانلود نسخهٔ جدید
        </Button>
        <Button variant="secondary" size="sm" type="button" onClick={dismiss}>
          بعداً
        </Button>
      </div>
    </Alert>
  )
}
