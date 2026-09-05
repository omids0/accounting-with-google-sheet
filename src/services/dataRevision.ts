import { create } from 'zustand'

interface DataRevisionStore {
  revision: number
  bump: () => void
}

const useDataRevisionStore = create<DataRevisionStore>(set => ({
  revision: 0,
  bump: () => set(state => ({ revision: state.revision + 1 }))
}))

export function getDataRevision(): number {
  return useDataRevisionStore.getState().revision
}

export function bumpDataRevision(): void {
  useDataRevisionStore.getState().bump()
}

export function subscribeDataRevision(listener: () => void): () => void {
  return useDataRevisionStore.subscribe((state, prevState) => {
    if (state.revision !== prevState.revision) {
      listener()
    }
  })
}

export function useDataRevision(): number {
  return useDataRevisionStore(state => state.revision)
}
