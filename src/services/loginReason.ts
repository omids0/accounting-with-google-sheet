/** Why the login page is shown; undefined is a plain sign-in (first visit or after sign-out). */
export type LoginReason = 'expired'

interface LoginReasonInput {
  /** A Google session is still stored on this device. */
  hasStoredSession: boolean
  /** A spreadsheet is set up, so this device holds the user's data. */
  hasSpreadsheet: boolean
  /** The stored session predates drive.file; the login page explains that case itself. */
  needsScopeUpgrade: boolean
}

/**
 * Signing out wipes the stored session, so a session that is still here when the
 * login page shows means its token expired and could not be renewed.
 */
export function resolveLoginReason({
  hasStoredSession,
  hasSpreadsheet,
  needsScopeUpgrade
}: LoginReasonInput): LoginReason | undefined {
  if (!hasStoredSession || !hasSpreadsheet || needsScopeUpgrade) return undefined

  return 'expired'
}
