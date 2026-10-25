import { APP_NAME, IS_DEV_BUILD } from '../utils/appEnv'
import { APP_URL } from '../utils/appLinks'

/**
 * The page a friend opens: `invite.html` (public/, no sign-in) next to this build of the app.
 * The code rides in the hash, not the query: a query would make an installed PWA's service
 * worker answer with the app shell instead of that page. Empty when the build has no app URL.
 */
export function inviteLandingUrl(code?: string): string {
  if (!APP_URL) return ''

  return `${APP_URL.replace(/\/+$/, '')}/invite.html${code ? `#ref=${code}` : ''}`
}

/** One URL per line, so mail and chat apps keep it in one piece (same habit as buildingInvites). */
export function inviteMessage(url: string): string {
  return [
    IS_DEV_BUILD ? '(نسخهٔ آزمایشی اپ)' : '',
    `من برای ثبت درآمد و خرج و حساب‌وکتاب از اپ «${APP_NAME}» استفاده می‌کنم.`,
    'از این لینک می‌توانی نسخهٔ وب یا اندروید را بگیری و وارد شوی:',
    url
  ]
    .filter(line => line !== '')
    .join('\n')
}
