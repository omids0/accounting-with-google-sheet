import { useNavigate } from 'react-router'

import { SETTINGS_CATEGORIES_PATH } from '../../routes/paths'
import Button from '../ui/Button'
import Card from '../ui/Card'
import { formHintClass } from '../ui/formStyles'

/** Entry to «دسته‌ها» (round 6, D1). */
export default function SettingsCategoriesCard() {
  const navigate = useNavigate()

  return (
    <Card>
      <p className={formHintClass}>
        دسته‌های هزینه، درآمد، بدهی، طلب و یادآوری‌ها: ترتیب، زیردسته‌ها، بودجه، تغییر نام، ادغام و
        حذف. تغییر نام و ادغام، رکوردهای ثبت‌شده را هم به‌روز می‌کند.
      </p>
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="self-start"
        onClick={() => navigate(SETTINGS_CATEGORIES_PATH)}
      >
        مدیریت دسته‌ها
      </Button>
    </Card>
  )
}
