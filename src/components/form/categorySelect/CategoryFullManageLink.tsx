import { Link } from 'react-router'

import AppIcon from '../../AppIcon'
import { categorySelectFooterBtnClass, categorySelectFooterClass } from '../../ui/formControlStyles'

/** «مدیریت کامل»: from the quick-add sheet to the settings category page. */
export default function CategoryFullManageLink({
  to,
  onNavigate
}: {
  to: string
  onNavigate: () => void
}) {
  return (
    <div className={categorySelectFooterClass}>
      <Link to={to} className={categorySelectFooterBtnClass} onClick={onNavigate}>
        <AppIcon name="settings" size={15} />
        مدیریت کامل: بودجه، ادغام و ترتیب
      </Link>
    </div>
  )
}
