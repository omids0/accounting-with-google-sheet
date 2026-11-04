import { create } from 'zustand'

interface SmsQuickStore {
  /** The pending SMS the quick sheet is open for (`null` = closed). */
  id: string | null
  open: (id: string) => void
  close: () => void
}

/** The notification's «ثبت سریع»: set by the launch handler, read by the lazy sheet in `Layout`. */
export const useSmsQuickStore = create<SmsQuickStore>(set => ({
  id: null,
  open: id => set({ id }),
  close: () => set({ id: null })
}))
