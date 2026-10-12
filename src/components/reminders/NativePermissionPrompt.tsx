import Alert from '../ui/Alert'
import Button from '../ui/Button'

interface NativePermissionPromptProps {
  denied: boolean
  requesting: boolean
  onGrant: () => void
  onDismiss: () => void
}

export default function NativePermissionPrompt({
  denied,
  requesting,
  onGrant,
  onDismiss
}: NativePermissionPromptProps) {
  return (
    <Alert variant="warning">
      <p style={{ margin: 0 }}>
        برای روشن‌کردن این یادآوری، اپ باید اجازهٔ نمایش اعلان روی این گوشی را داشته باشد.
      </p>
      {denied && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem' }}>
          اگر پنجرهٔ اجازه باز نشد، از تنظیمات گوشی بخش اعلان‌های این برنامه را روشن کنید و دوباره
          ذخیره بزنید.
        </p>
      )}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onGrant}
          disabled={requesting}
          loading={requesting}
        >
          اجازه بده و ذخیره کن
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onDismiss}>
          بعداً
        </Button>
      </div>
    </Alert>
  )
}
