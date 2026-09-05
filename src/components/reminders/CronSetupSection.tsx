import { AccordionCollapse } from '../AccordionCollapse'
import Button from '../ui/Button'
import Card from '../ui/Card'

interface CronSetupSectionProps {
  showSetup: boolean
  onToggle: () => void
}

export default function CronSetupSection({ showSetup, onToggle }: CronSetupSectionProps) {
  return (
    <Card>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onToggle}
        style={{ width: '100%' }}
      >
        {showSetup ? 'بستن راهنمای cron رایگان' : 'راه‌اندازی cron رایگان (Google Apps Script)'}
      </Button>
      <AccordionCollapse open={showSetup}>
        <div
          style={{
            marginTop: '0.75rem',
            fontSize: '0.85rem',
            color: 'var(--color-text-muted)'
          }}
        >
          <p style={{ marginBottom: '0.75rem' }}>
            <strong>cron سبک</strong> یعنی یک job زمان‌بندی‌شده که مثلاً هر ۱۵ دقیقه اجرا می‌شود،
            اقساط را از همین Google Sheet می‌خواند و نوتیf می‌فرستد — بدون سرور پولی.
          </p>
          <ol
            style={{
              margin: 0,
              paddingInlineStart: '1.2rem',
              display: 'grid',
              gap: '0.5rem'
            }}
          >
            <li>
              کلید VAPID بسازید: <code dir="ltr">npx @pushforge/builder vapid</code>
            </li>
            <li>
              Public Key را در <code dir="ltr">VITE_VAPID_PUBLIC_KEY</code> قرار دهید و اپ را
              rebuild کنید.
            </li>
            <li>
              Cloudflare Worker رایگان را از پوشه <code dir="ltr">workers/reminder-push</code>{' '}
              deploy کنید (راهنما در همان پوشه).
            </li>
            <li>
              در Google Sheet → Extensions → Apps Script فایل{' '}
              <code dir="ltr">scripts/google-apps-script/RemindersCron.gs</code> را paste کنید.
            </li>
            <li>
              Script Properties: <code dir="ltr">PUSH_WORKER_URL</code> و{' '}
              <code dir="ltr">PUSH_WORKER_SECRET</code>
            </li>
            <li>
              Trigger بسازید: تابع <code dir="ltr">runReminderCron</code> — Every 15 minutes
            </li>
          </ol>
          <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            همهٔ سرویس‌ها رایگان‌اند: Google Sheets + Apps Script + Cloudflare Free.
          </p>
        </div>
      </AccordionCollapse>
    </Card>
  )
}
