import type { ReactElement } from 'react'

import { IS_DEV_ENV } from '../../utils/appEnv'
import { devEnvBadgeClass, devEnvTitleRowClass } from '../ui/layoutStyles'

/**
 * The page title, with a tiny «dev» pill beside it on a develop build and on the local dev
 * server. In production it renders the title untouched.
 */
export default function DevEnvBadge({ children }: { children: ReactElement }) {
  if (!IS_DEV_ENV) return children

  return (
    <div className={devEnvTitleRowClass}>
      {children}
      <span className={devEnvBadgeClass} title="نسخهٔ توسعه (dev)" data-testid="dev-env-badge">
        dev
      </span>
    </div>
  )
}
