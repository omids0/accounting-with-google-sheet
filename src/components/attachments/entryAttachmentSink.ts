import { create } from 'zustand'

interface EntryAttachmentSink {
  /** Adds files to the «پیوست» of the entry form that is open; null when none is. */
  add: ((files: File[]) => Promise<void>) | null
  /** Free slots left in that «پیوست» field. */
  remaining: number
}

/**
 * The entry form owns its attachment drafts, three components above the «ریز اقلام» field. The
 * field registers itself here so «اسکن فاکتور» can attach the photo it read, without threading the
 * drafts through the field components in between.
 */
export const useEntryAttachmentSink = create<EntryAttachmentSink>(() => ({
  add: null,
  remaining: 0
}))
