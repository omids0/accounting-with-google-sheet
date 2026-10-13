import { useNavigate } from 'react-router'

import { SETTINGS_ACTIVITY_PATH } from '../../routes/paths'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formHintClass } from '../ui/formStyles'

/** Entry to «فعالیت» (round 8): who changed what, on any spreadsheet. */
export default function SettingsActivityCard() {
  const navigate = useNavigate()

  return (
    <Card>
      <p className={formHintClass}>
        هر ثبت، ویرایش، حذف و پرداخت با نام ثبت‌کننده، زمان و دستگاه. روی شیتی که با دیگران در
        Google Drive به اشتراک گذاشته‌ای، می‌بینی هر کس چه کرده.
      </p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="self-start"
        onClick={() => navigate(SETTINGS_ACTIVITY_PATH)}
      >
        دیدن فعالیت‌ها
      </Button>
    </Card>
  )
}
