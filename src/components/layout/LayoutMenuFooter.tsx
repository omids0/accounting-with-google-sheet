import { version as APP_VERSION } from '../../../package.json'
import { appMenuFooterClass } from '../ui/layoutStyles'

/** One muted line at the bottom of the menu: app name · version · active sheet. */
export default function LayoutMenuFooter({ sheetName }: { sheetName: string }) {
  const parts = ['حساب کتاب', `نسخه ${APP_VERSION}`]

  if (sheetName) parts.push(`شیت: ${sheetName}`)

  return <p className={appMenuFooterClass}>{parts.join(' · ')}</p>
}
