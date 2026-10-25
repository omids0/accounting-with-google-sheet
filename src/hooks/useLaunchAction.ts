import { App } from '@capacitor/app'
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate, type NavigateFunction } from 'react-router'

import { getPathForTab } from '../routes/paths'
import { isNativePlatform } from '../services/googleAuthNative'
import {
  buildSharedSmsState,
  launchTarget,
  parseLaunchUrl,
  type LaunchAction
} from '../services/launchAction'
import { pushWidgetSnapshot } from '../services/widgetNative'
import { getActiveWorkspaceType } from '../services/workspace'

function openAction(navigate: NavigateFunction, action: LaunchAction): void {
  const { tab, formType, smsText } = launchTarget(action, getActiveWorkspaceType())
  const path = getPathForTab(tab, { formType })

  if (smsText === undefined) navigate(path)
  else navigate(path, { state: buildSharedSmsState(smsText) })
}

/** The launch URL stays the same for the whole session; follow it only once. */
let nativeLaunchHandled = false

/**
 * Home-screen shortcuts, the web share target and native notifications. Runs in
 * the signed-in shell, so an action that arrives before sign-in (or the setup
 * wizard) waits in the URL and is followed once the app is ready.
 */
export function useLaunchAction(): void {
  const navigate = useNavigate()
  const { pathname, search, key } = useLocation()
  // useNavigate() changes identity on every route change; the effects must not re-run.
  const navigateRef = useRef(navigate)
  const handledKeyRef = useRef('')

  navigateRef.current = navigate

  // Web: shortcuts and the share target open the start URL with a query.
  useEffect(() => {
    if (pathname !== '/' || handledKeyRef.current === key) return

    const action = parseLaunchUrl(search)

    if (!action) return

    handledKeyRef.current = key
    // Strip the query first, so «بازگشت» and a reload do not repeat the action.
    navigateRef.current('/', { replace: true })
    openAction(navigateRef.current, action)
  }, [pathname, search, key])

  // APK: static shortcuts and notifications open `com.omids0.accounting://…`.
  useEffect(() => {
    if (!isNativePlatform()) return

    const follow = (url: string | undefined) => {
      const action = parseLaunchUrl(url)

      if (action) openAction(navigateRef.current, action)
    }

    if (!nativeLaunchHandled) {
      nativeLaunchHandled = true
      void App.getLaunchUrl()
        .then(launch => follow(launch?.url))
        .catch(() => {})
    }

    const urlOpen = App.addListener('appUrlOpen', event => follow(event.url))
    // The widget may show numbers from before the app was last closed.
    const resume = App.addListener('resume', () => pushWidgetSnapshot())

    pushWidgetSnapshot()

    return () => {
      void urlOpen.then(handle => handle.remove())
      void resume.then(handle => handle.remove())
    }
  }, [])
}
