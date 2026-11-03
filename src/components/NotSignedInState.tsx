import type { AppIconName } from './AppIcon'
import EmptyState from './EmptyState'

/**
 * What a page shows when the session is gone. The app renders the login page before any
 * module page, so this is only a fallback and has no sign-in button of its own.
 */
export default function NotSignedInState({ icon }: { icon: AppIconName }) {
  return <EmptyState icon={icon} message="ابتدا با گوگل وارد شوید" />
}
