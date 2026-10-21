import { createContext, useContext } from 'react'

/**
 * True under a page the signed-in building role may only read (round 11): the card buttons,
 * paid switches, speed-dial writes and form submits of a shared list page hide or stop.
 * Everywhere else it stays false.
 */
export const ReadOnlyContext = createContext(false)

export function useReadOnly(): boolean {
  return useContext(ReadOnlyContext)
}
