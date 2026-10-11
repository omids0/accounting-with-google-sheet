/** Router state that opens the entry form pre-filled, and goes back after saving. */
export interface EntryDraft {
  formType: 'income' | 'expense'
  prefill: Record<string, string | number>
}

const STATE_KEY = 'entryDraft'

export function buildEntryDraftState(
  formType: EntryDraft['formType'],
  prefill: EntryDraft['prefill']
): Record<typeof STATE_KEY, EntryDraft> {
  return { [STATE_KEY]: { formType, prefill } }
}

export function readEntryDraft(state: unknown): EntryDraft | null {
  const draft = (state as Record<string, EntryDraft> | null)?.[STATE_KEY]

  return draft?.formType && draft.prefill ? draft : null
}
