import { clearSharedLinkFailures, readSharedLinks } from '../services/sharedLinkPrefs'
import { isSharedWorkspace } from '../services/workspace'

/**
 * Sends the copies of personal records still waiting for the shared account. Called by
 * `useBridgeDrain` on start, back online, back in focus and after a switch of workspace; cheap
 * when nothing waits (the runner loads only then). A task that failed for access waits until this
 * device reaches the file again: the shared account open here (or its tick panel read) proves it.
 */
export function drainSharedLinks(): void {
  if (isSharedWorkspace()) clearSharedLinkFailures()
  if (!readSharedLinks().some(task => !task.failed)) return

  void import('../services/sharedLink').then(({ runSharedLinks }) => runSharedLinks())
}
