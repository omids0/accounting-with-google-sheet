import { create } from 'zustand'

/**
 * Whether the «کدام بماند؟» sheet may show. The conflicts themselves live in
 * the outbox (`listRowConflicts`); this only remembers a dismissal: the sheet
 * stays closed until another conflict arrives or the sync details reopen it.
 */
interface ConflictStore {
  /** Conflict count when the user closed the sheet; 0 = not dismissed. */
  dismissedAt: number
  dismiss: (count: number) => void
  reopen: () => void
}

export const useConflictStore = create<ConflictStore>(set => ({
  dismissedAt: 0,
  dismiss: count => set({ dismissedAt: count }),
  reopen: () => set({ dismissedAt: 0 })
}))
