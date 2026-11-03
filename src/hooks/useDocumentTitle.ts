import { useEffect } from 'react'

import { APP_NAME } from '../utils/appEnv'

/**
 * The tab / history / screen-reader title follows the page: «کیف پول · حساب کتاب».
 * Back to the plain app name when the owner unmounts (the signed-in shell goes away).
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME

    return () => {
      document.title = APP_NAME
    }
  }, [title])
}
