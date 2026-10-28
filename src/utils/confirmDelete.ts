/**
 * The one delete question of the app: «X حذف شود؟». `confirmDelete` opens it (`ConfirmDeleteHost`,
 * mounted once in `main.tsx`) and resolves with the answer, or null when the user backed out (the
 * «انصراف» button, ✕, the backdrop or Escape). Follow-up questions (attachments, shares, shared
 * copy) are separate dialogs asked after this one.
 */
export type ConfirmDeleteOptions = {
  /** What goes, as the undo toast names it: «طلب «علی»». The title reads «… حذف شود؟». */
  label: string
  /** What disappears with it, in a sentence. */
  message: string
  /** An extra choice, e.g. «رکوردهای مالی مرتبط هم حذف شوند». */
  checkbox?: { label: string; defaultChecked?: boolean }
  /**
   * For a question that is not a delete («‹نام› بایگانی شود؟»): the whole title, the confirm button
   * and the tone. Without it the dialog is the delete question.
   */
  wording?: { title: string; confirmLabel: string; tone?: 'default' | 'danger' }
}

export type ConfirmDeleteResult = {
  /** The checkbox, when the question had one; false otherwise. */
  checked: boolean
}

export type ConfirmDeleteRequest = ConfirmDeleteOptions & {
  /** Tells one question from the next. */
  id: number
  resolve: (result: ConfirmDeleteResult | null) => void
}

let current: ConfirmDeleteRequest | null = null
let nextId = 0
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach(listener => listener())
}

export function subscribeConfirmDelete(listener: () => void): () => void {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export function getConfirmDeleteRequest(): ConfirmDeleteRequest | null {
  return current
}

/** «‹label› حذف شود؟» — never the bare «حذف شود؟». */
export function confirmDeleteTitle(label: string): string {
  const name = label.trim()

  return `${name || 'این مورد'} حذف شود؟`
}

/** The body of a delete that goes into the undo window: what goes, and that it can be brought back. */
export function undoableDeleteMessage(what: string): string {
  return `${what} پاک می‌شود. تا چند ثانیه بعد از حذف می‌توانی «بازگردانی» را بزنی.`
}

export function confirmDelete(options: ConfirmDeleteOptions): Promise<ConfirmDeleteResult | null> {
  // A newer question replaces an open one: the older delete is called off.
  current?.resolve(null)

  return new Promise(resolve => {
    current = { ...options, id: ++nextId, resolve }
    emit()
  })
}

/** Closes the open question with `result` (null = backed out). */
export function answerConfirmDelete(result: ConfirmDeleteResult | null): void {
  const request = current

  if (!request) return

  current = null
  emit()
  request.resolve(result)
}
