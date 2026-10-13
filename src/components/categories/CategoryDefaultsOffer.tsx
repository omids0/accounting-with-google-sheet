import { formatPersianNumber } from '../../utils/formatMoney'
import Button from '../ui/Button'
import { categoryOfferActionsClass, categoryOfferClass } from '../ui/categoryPageStyles'
import { nudgeLinkClass } from '../ui/nudgeStyles'

interface CategoryDefaultsOfferProps {
  missing: string[]
  busy: boolean
  onAdd: () => void
  onDismiss: () => void
}

/** One-time row for spreadsheets made before the round-6 defaults: append, never rename. */
export default function CategoryDefaultsOffer({
  missing,
  busy,
  onAdd,
  onDismiss
}: CategoryDefaultsOfferProps) {
  if (!missing.length) return null

  const preview = missing.slice(0, 4).join('، ')
  const more = missing.length > 4 ? ` و ${formatPersianNumber(missing.length - 4)} دسته دیگر` : ''

  return (
    <section className={categoryOfferClass} aria-label="دسته‌های پیشنهادی">
      <div>
        <b>دسته‌های پیشنهادی جدید را اضافه کنم؟</b>
        <p className="m-0 text-[0.76rem] text-muted">
          {`${preview}${more}. فقط دسته‌های نبود اضافه می‌شوند؛ نام دسته‌های فعلی عوض نمی‌شود.`}
        </p>
      </div>
      <div className={categoryOfferActionsClass}>
        <Button type="button" variant="primary" size="sm" disabled={busy} onClick={onAdd}>
          اضافه کن
        </Button>
        <button type="button" className={nudgeLinkClass} disabled={busy} onClick={onDismiss}>
          نه، ممنون
        </button>
      </div>
    </section>
  )
}
