import { getChild } from '../../services/childrenRegistry'
import { getSettings } from '../../services/settings'
import SharedViewerBanner from '../shared/SharedViewerBanner'

/** The child's name as this device keeps it; «فرزند» when the registry has no record. */
export function activeChildName(): string {
  return getChild(getSettings()?.spreadsheetId ?? '')?.name ?? 'فرزند'
}

/** On top of every child page: the parent only looks, nothing here changes the child's account. */
export default function ChildViewBanner() {
  return <SharedViewerBanner icon="eye" text={`نمای فقط‌خواندنی حساب ${activeChildName()}`} />
}
