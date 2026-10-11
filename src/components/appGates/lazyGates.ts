import { lazy } from 'react'

/**
 * Start-up screens only one of which is ever shown; kept out of the main chunk so
 * a signed-in user does not download the login and unlock code.
 */
export const LazyConfigNotice = lazy(() => import('./ConfigNotice'))

export const LazyLoginPage = lazy(() => import('../LoginPage'))

export const LazySpreadsheetSetupPanel = lazy(() => import('../SpreadsheetSetupPanel'))

export const LazyUnlockScreen = lazy(() => import('../UnlockScreen'))
