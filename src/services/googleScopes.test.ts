import { beforeEach, describe, expect, it } from 'vitest'

import {
  createSession,
  DRIVE_FILE_SCOPE,
  FULL_GOOGLE_OAUTH_SCOPE,
  GOOGLE_OAUTH_SCOPE,
  hasRequiredGoogleScopes,
  isTokenValid,
  NATIVE_GOOGLE_SCOPES,
  saveSession,
  sessionNeedsScopeUpgrade
} from './auth'
import capacitorConfig from '../../capacitor.config'

const SENSITIVE_OR_RESTRICTED = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive'
]

const scopesOf = (value: string) => value.split(/\s+/).filter(Boolean)

const profile = { email: 'a@example.com', name: 'A' }

describe('Google OAuth scopes', () => {
  it('asks the web flow for drive.file and nothing sensitive', () => {
    expect(DRIVE_FILE_SCOPE).toBe('https://www.googleapis.com/auth/drive.file')
    for (const scope of [GOOGLE_OAUTH_SCOPE, FULL_GOOGLE_OAUTH_SCOPE]) {
      expect(new Set(scopesOf(scope))).toEqual(
        new Set(['openid', 'email', 'profile', DRIVE_FILE_SCOPE])
      )
    }
  })

  it('asks the Android plugin for exactly the same scopes', () => {
    const native = (capacitorConfig.plugins?.GoogleAuth as { scopes: string[] }).scopes

    expect(native).toEqual(NATIVE_GOOGLE_SCOPES)
    expect(native.some(scope => SENSITIVE_OR_RESTRICTED.includes(scope))).toBe(false)
  })

  it('recognises a grant that includes drive.file', () => {
    expect(hasRequiredGoogleScopes(`email profile openid ${DRIVE_FILE_SCOPE}`)).toBe(true)
    expect(hasRequiredGoogleScopes(DRIVE_FILE_SCOPE)).toBe(true)
  })

  it('rejects grants without drive.file', () => {
    expect(hasRequiredGoogleScopes(undefined)).toBe(false)
    expect(hasRequiredGoogleScopes('')).toBe(false)
    expect(hasRequiredGoogleScopes('openid email profile')).toBe(false)
    expect(hasRequiredGoogleScopes(SENSITIVE_OR_RESTRICTED.slice(0, 2).join(' '))).toBe(false)
    expect(hasRequiredGoogleScopes(`${DRIVE_FILE_SCOPE}.extra`)).toBe(false)
  })
})

describe('sessions from before the drive.file switch', () => {
  beforeEach(() => localStorage.clear())

  it('treat a stored session without a scope as needing one new sign-in', () => {
    saveSession(createSession('old-token', profile))

    expect(sessionNeedsScopeUpgrade()).toBe(true)
    expect(isTokenValid()).toBe(false)
  })

  it('treat the old broad grant as needing one new sign-in', () => {
    saveSession(createSession('old-token', profile, 3600, SENSITIVE_OR_RESTRICTED.join(' ')))

    expect(sessionNeedsScopeUpgrade()).toBe(true)
  })

  it('accept a session signed in with drive.file', () => {
    saveSession(createSession('new-token', profile, 3600, GOOGLE_OAUTH_SCOPE))

    expect(sessionNeedsScopeUpgrade()).toBe(false)
    expect(isTokenValid()).toBe(true)
  })

  it('do not ask for an upgrade when nobody is signed in', () => {
    expect(sessionNeedsScopeUpgrade()).toBe(false)
  })
})
