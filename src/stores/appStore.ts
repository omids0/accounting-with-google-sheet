import { create } from 'zustand'

const noop = () => {}

interface AppStore {
  requestReauth: () => void
  requestLogout: () => void
  spreadsheetKey: number
  bumpSpreadsheetKey: () => void
  registerHandlers: (handlers: { onReauth: () => void; onLogout: () => void }) => void
}

export const useAppStore = create<AppStore>(set => ({
  requestReauth: noop,
  requestLogout: noop,
  spreadsheetKey: 0,
  bumpSpreadsheetKey: () => set(state => ({ spreadsheetKey: state.spreadsheetKey + 1 })),
  registerHandlers: ({ onReauth, onLogout }) => {
    set({ requestReauth: onReauth, requestLogout: onLogout })
  }
}))

export function requestReauth(): void {
  useAppStore.getState().requestReauth()
}

export function requestLogout(): void {
  useAppStore.getState().requestLogout()
}

export function bumpSpreadsheetKey(): void {
  useAppStore.getState().bumpSpreadsheetKey()
}
