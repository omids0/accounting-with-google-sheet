interface GoogleTokenResponse {
  access_token?: string
  expires_in?: number
  /** Space-separated scopes the user actually granted. */
  scope?: string
  error?: string
  error_description?: string
}

interface GoogleTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string; hint?: string }): void
}

interface GoogleCodeResponse {
  /** One-time authorization code, traded for tokens by workers/auth-refresh. */
  code?: string
  scope?: string
  error?: string
  error_description?: string
}

interface GoogleCodeClient {
  requestCode(): void
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient(config: {
          client_id: string
          scope: string
          callback: (response: GoogleTokenResponse) => void
          error_callback?: (error: { type: string }) => void
          hint?: string
          prompt?: string
          include_granted_scopes?: boolean
        }): GoogleTokenClient
        initCodeClient?(config: {
          client_id: string
          scope: string
          ux_mode?: 'popup' | 'redirect'
          callback: (response: GoogleCodeResponse) => void
          error_callback?: (error: { type: string }) => void
          include_granted_scopes?: boolean
        }): GoogleCodeClient
        revoke?(accessToken: string, done?: () => void): void
      }
    }
    /** Present only after googlePicker.ts loads it on demand (see google-picker.d.ts). */
    picker?: GooglePickerNamespace
  }
  gapi?: GoogleApiLoader
}
