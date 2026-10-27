import { getAccessToken } from './auth'
import { authWorkerUrl, postJson } from './authWorker'
import { ensureFreshAccessToken } from './tokenRefresh'
import { IS_DEV_ENV } from '../utils/appEnv'
import { clearPendingInviteRef, getPendingInviteRef, isInviteCode } from '../utils/inviteRef'

/** Invites are counted by the same worker that renews sessions; no worker, no invite numbers. */
export const isInviteBackendConfigured = (): boolean => !!authWorkerUrl()

/** Dev copies write to their own counters, so a test invitation never changes the real number. */
const inviteEnv = () => (IS_DEV_ENV ? 'dev' : 'prod')

export interface InviteInfo {
  code: string
  count: number
}

/** The signed-in person's code and how many people signed in with it. Throws when unreachable. */
export async function fetchInviteInfo(): Promise<InviteInfo> {
  if (!(await ensureFreshAccessToken())) throw new Error('نشست منقضی شده')

  const response = await postJson('/invite/stats', {
    accessToken: getAccessToken(),
    env: inviteEnv()
  })

  const data = (await response.json().catch(() => ({}))) as { code?: unknown; count?: unknown }

  if (!response.ok || !isInviteCode(data.code) || typeof data.count !== 'number') {
    throw new Error('آمار دعوت دریافت نشد')
  }

  return { code: data.code, count: data.count }
}

/**
 * Counts this sign-in for whoever invited the person, once. Never throws and never delays the
 * sign-in. A code the worker has seen (counted, already known, own code, invalid) is dropped;
 * after a network or server failure it stays for the next sign-in.
 */
export async function claimPendingInvite(accessToken: string): Promise<void> {
  const ref = getPendingInviteRef()

  if (!ref || !isInviteBackendConfigured()) return

  try {
    const response = await postJson(
      '/invite/claim',
      { accessToken, ref, env: inviteEnv() },
      // The account-switch path reloads the page right after sign-in.
      true
    )

    if (response.ok || response.status === 400) clearPendingInviteRef()
  } catch {
    /* offline or timeout: try again at the next sign-in */
  }
}
