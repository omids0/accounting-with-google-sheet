let running = 0

/**
 * A transfer moves two balances one after the other, so for a moment the wallet total is off by
 * the amount. Anything that records «the difference right now» must not look in that moment.
 */
export function isTransferInFlight(): boolean {
  return running > 0
}

export async function whileTransferring<T>(work: () => Promise<T>): Promise<T> {
  running += 1
  try {
    return await work()
  } finally {
    running -= 1
  }
}
