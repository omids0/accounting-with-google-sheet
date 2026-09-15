import { create } from 'zustand'

const noop = () => {}

interface AppStore {
  requestReauth: () => void
  requestLogout: () => void
  spreadsheetKey: number
  bumpSpreadsheetKey: () => void
  registerHandlers: (handlers: { onReauth: () => void; onLogout: () => void }) => void
  updateAvailable: boolean
  updatePromptDismissed: boolean
  updateApplying: boolean
  setUpdateAvailable: (available: boolean) => void
  dismissUpdatePrompt: () => void
  resetUpdatePrompt: () => void
  setUpdateApplying: (applying: boolean) => void
  applyAppUpdate: () => void
  registerAppUpdateApply: (apply: () => void) => void
}

export const useAppStore = create<AppStore>(set => ({
  requestReauth: noop,
  requestLogout: noop,
  spreadsheetKey: 0,
  bumpSpreadsheetKey: () => set(state => ({ spreadsheetKey: state.spreadsheetKey + 1 })),
  registerHandlers: ({ onReauth, onLogout }) => {
    set({ requestReauth: onReauth, requestLogout: onLogout })
  },
  updateAvailable: false,
  updatePromptDismissed: false,
  updateApplying: false,
  setUpdateAvailable: available => set({ updateAvailable: available }),
  dismissUpdatePrompt: () => set({ updatePromptDismissed: true }),
  resetUpdatePrompt: () => set({ updatePromptDismissed: false }),
  setUpdateApplying: applying => set({ updateApplying: applying }),
  applyAppUpdate: noop,
  registerAppUpdateApply: apply => set({ applyAppUpdate: apply })
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
