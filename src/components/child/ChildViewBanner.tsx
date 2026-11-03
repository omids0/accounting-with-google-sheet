import { getChild } from '../../services/childrenRegistry'
import { getSettings } from '../../services/settings'
import AppIcon from '../AppIcon'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

/** The child's name as this device keeps it; «فرزند» when the registry has no record. */
export function activeChildName(): string {
  return getChild(getSettings()?.spreadsheetId ?? '')?.name ?? 'فرزند'
}

/** On top of every child page: the parent only looks, nothing here changes the child's account. */
export default function ChildViewBanner() {
  return (
    <Card className={guideCardClass} role="note">
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="eye" size={20} />
      </span>
      <span className={guideCardTextClass}>
        <span className={guideCardTitleClass}>{`نمای فقط‌خواندنی حساب ${activeChildName()}`}</span>
      </span>
    </Card>
  )
}
