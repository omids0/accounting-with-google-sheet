import { readSharedLinks } from '../services/sharedLinkPrefs'

/**
 * Sends the copies of personal records still waiting for the shared account. Called by
 * `useBridgeDrain` on start, back online, back in focus and after a switch of workspace; cheap
 * when nothing waits (the runner loads only then). A failed task waits for the user to cancel it.
 */
export function drainSharedLinks(): void {
  if (!readSharedLinks().some(task => !task.failed)) return

  void import('../services/sharedLink').then(({ runSharedLinks }) => runSharedLinks())
}
