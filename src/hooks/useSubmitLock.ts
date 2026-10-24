import { useRef } from 'react'

/**
 * One submit at a time. `run` starts the task at once (so `event.preventDefault()` still
 * works) and ignores every further call until the task, and the promise it returns, settles.
 * Three clicks in the same tick therefore save once, even before `saving` state re-renders.
 */
export function createSubmitLock() {
  let busy = false

  return async function run<T>(task: () => T | Promise<T>): Promise<T | undefined> {
    if (busy) return undefined
    busy = true
    try {
      return await task()
    } finally {
      busy = false
    }
  }
}

export function useSubmitLock() {
  const lockRef = useRef<ReturnType<typeof createSubmitLock>>()

  lockRef.current ??= createSubmitLock()

  return lockRef.current
}
