import AppIcon from '../AppIcon'
import Card from '../ui/Card'
import {
  guideCardClass,
  guideCardIconClass,
  guideCardTextClass,
  guideCardTitleClass
} from '../ui/onboardingStyles'

/** On top of every shared page for a «ناظر»: they see everything and change nothing. */
export default function SharedViewerBanner() {
  return (
    <Card className={guideCardClass} role="note">
      <span className={guideCardIconClass} aria-hidden="true">
        <AppIcon name="lock" size={20} />
      </span>
      <span className={guideCardTextClass}>
        <span className={guideCardTitleClass}>شما ناظر هستید و فقط می‌بینید</span>
      </span>
    </Card>
  )
}
