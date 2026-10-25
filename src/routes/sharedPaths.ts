import type { Tab } from '../components/layout/types'

/** The pages of the shared account («حساب مشترک»), one per bottom-nav tab. */
export const SHARED_TAB_PATHS: Partial<Record<Tab, string>> = {
  'shared-home': '/shared',
  'shared-records': '/shared/records',
  'shared-settle': '/shared/settle',
  'shared-members': '/shared/members'
}
