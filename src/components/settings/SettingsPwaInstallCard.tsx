import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card, { CardTitle } from '../ui/Card'

type SettingsPwaInstallCardProps = {
  isInstalled: boolean
  canInstall: boolean
  isIos: boolean
  showIosHint: boolean
  onInstall: () => void
  onDismissIosHint: () => void
}

export default function SettingsPwaInstallCard({
  isInstalled,
  canInstall,
  isIos,
  showIosHint,
  onInstall,
  onDismissIosHint
}: SettingsPwaInstallCardProps) {
  return (
    <Card>
      <CardTitle>نصب اپ</CardTitle>
      {isInstalled ? (
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          اپ روی این دستگاه نصب شده است.
        </p>
      ) : (
        <>
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-text-muted)',
              marginBottom: '0.75rem'
            }}
          >
            با نصب اپ، دسترسی سریع‌تر از صفحهٔ اصلی گوشی یا دسکتاپ دارید.
          </p>
          {(canInstall || isIos) && (
            <Button variant="primary" size="sm" type="button" onClick={onInstall}>
              نصب اپ روی دستگاه
            </Button>
          )}
          {!canInstall && !isIos && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              اگر دکمهٔ بالا نیست، از منوی مرورگر (⋮) گزینه «Install app» یا آیکون نصب در نوار آدرس
              را بزنید.
            </p>
          )}
          {showIosHint && (
            <Alert variant="info" style={{ marginTop: '0.75rem' }}>
              <p style={{ marginBottom: '0.5rem' }}>
                در Safari: دکمهٔ Share (□↑) → «Add to Home Screen»
              </p>
              <Button variant="secondary" size="sm" type="button" onClick={onDismissIosHint}>
                متوجه شدم
              </Button>
            </Alert>
          )}
        </>
      )}
    </Card>
  )
}
