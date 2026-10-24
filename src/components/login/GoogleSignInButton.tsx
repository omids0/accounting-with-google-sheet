import Button from '../ui/Button'
import { googleSignInBtnClass, loginFooterNoteClass } from '../ui/loginStyles'
import Spinner from '../ui/Spinner'

interface GoogleSignInButtonProps {
  onClick: () => void
  /** Google's sign-in script is loaded, so a click can open its popup. */
  ready: boolean
  /** The script has not loaded for a long time (or the browser is offline): a click retries. */
  stalled?: boolean
  /** A sign-in is under way after the click. */
  loading: boolean
}

function GoogleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.837 0 5.402 1.191 7.207 3.093l5.657-5.657C33.64 10.053 29.082 8 24 8 12.955 8 4 16.955 4 28s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.837 0 5.402 1.191 7.207 3.093l5.657-5.657C33.64 10.053 29.082 8 24 8 16.318 8 9.656 13.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 39.091 26.715 40 24 40c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 43.556 16.227 48 24 48z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C42.022 35.026 44 30.638 44 28c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

/**
 * The label is always visible. While Google's script is still downloading the
 * button is disabled with a small spinner in place of the logo, so the screen
 * never shows an empty box; once a sign-in is under way it shows the busy dots. If the
 * script never arrives the button turns clickable again and says so, because a button
 * that stays disabled for ever would lock the user out.
 */
export default function GoogleSignInButton({
  onClick,
  ready,
  stalled = false,
  loading
}: GoogleSignInButtonProps) {
  const waiting = !ready && !stalled

  return (
    <>
      <Button
        variant="primary"
        className={googleSignInBtnClass}
        onClick={onClick}
        disabled={waiting}
        loading={loading}
        aria-busy={waiting || undefined}
      >
        {waiting ? <Spinner size="sm" decorative /> : <GoogleLogo />}
        ورود با Google
      </Button>
      {!ready && stalled && (
        <p className={loginFooterNoteClass} role="status">
          {typeof navigator !== 'undefined' && navigator.onLine === false
            ? 'اینترنت قطع است؛ بعد از وصل شدن دوباره تلاش کنید'
            : 'بارگذاری Google ناموفق بود؛ دوباره تلاش'}
        </p>
      )}
    </>
  )
}
