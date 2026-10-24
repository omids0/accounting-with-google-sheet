import { createCounterparty } from './counterparties'
import { applyPersonInput, blankPerson, EMPTY_PERSON, type PersonInput } from './personInput'
import type { Counterparty } from '../types'
import { normalizeDigits } from '../utils/normalizeDigits'

/** What the light «شخص جدید» form of a building collects: a name, a phone, for owners a card. */
export type QuickPersonInput = Partial<PersonInput>

/**
 * A building manager adds a resident by name; nothing else is required. A card is optional but,
 * once started, must be whole (16 digits) like the fund accounts' cards.
 */
export function quickPersonError(input: QuickPersonInput): string | null {
  if (!(input.name ?? '').trim()) return 'نام را بنویس'

  const card = normalizeDigits(input.card ?? '').replace(/\D/g, '')

  if (card && card.length !== 16) return 'شمارهٔ کارت ۱۶ رقم است؛ یا کامل بنویس یا خالی بگذار'

  return null
}

/**
 * Saves the person the same way the setup journey's «مالک و ساکنان» step does: the full name goes
 * through `splitName` into the counterparty's name fields («علی احمدی» = first «علی», last «احمدی»),
 * the phone and the card into the usual lists. No second storage.
 */
export async function createQuickPerson(
  spreadsheetId: string,
  input: QuickPersonInput
): Promise<Counterparty> {
  const problem = quickPersonError(input)

  if (problem) throw new Error(problem)

  return createCounterparty(
    spreadsheetId,
    applyPersonInput(blankPerson(), { ...EMPTY_PERSON, ...input })
  )
}
