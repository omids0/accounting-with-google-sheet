import { APP_NAME, APP_VERSION_LABEL } from '../../utils/appEnv'
import { appMenuFooterClass } from '../ui/layoutStyles'

/** One muted line at the bottom of the menu: app name · version · active sheet. */
export default function LayoutMenuFooter({ sheetName }: { sheetName: string }) {
  const parts = [APP_NAME, `نسخه ${APP_VERSION_LABEL}`]

  if (sheetName) parts.push(`شیت: ${sheetName}`)

  return <p className={appMenuFooterClass}>{parts.join(' · ')}</p>
}
