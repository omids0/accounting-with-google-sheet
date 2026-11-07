import AppIcon, { type AppIconName } from '../AppIcon'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

/**
 * On top of every shared page for a «ناظر»: they see everything and change nothing. A parent's
 * view of a child's account shows the same banner with its own icon and text.
 */
export default function SharedViewerBanner({
  icon = 'lock',
  text = 'شما ناظر هستید و فقط می‌بینید'
}: {
  icon?: AppIconName
  text?: string
}) {
  return (
    <Card className={guideCardClass} role="note">
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name={icon} size={20} />
      </span>
      <span className={guideCardTextClass}>
        <span className={guideCardTitleClass}>{text}</span>
      </span>
    </Card>
  )
}
