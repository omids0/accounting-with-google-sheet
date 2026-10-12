import { useActiveSpreadsheetName } from '../../hooks/useActiveSpreadsheetName'
import { cn } from '../../utils/cn'
import { appMenuFooterTextClass } from '../ui/layoutStyles'

/** Second footer line of the drawer: which spreadsheet the app is reading and writing. */
export default function LayoutMenuSheetName() {
  const name = useActiveSpreadsheetName()

  if (!name) return null

  return (
    <p className={cn(appMenuFooterTextClass, 'mt-0.5 truncate font-normal')}>شیت فعال: {name}</p>
  )
}
