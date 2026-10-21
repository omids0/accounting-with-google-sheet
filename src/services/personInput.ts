import type { Counterparty } from '../types'
import { normalizeDigits } from '../utils/normalizeDigits'

export type PersonFields = Omit<Counterparty, 'id' | 'createdAt'>

/** Name, phone and card of a person as the building forms collect them. */
export interface PersonInput {
  name: string
  phone: string
  card: string
}

export const EMPTY_PERSON: PersonInput = { name: '', phone: '', card: '' }

export function blankPerson(): PersonFields {
  return {
    firstName: '',
    lastName: '',
    birthDate: '',
    address: '',
    location: null,
    phones: [],
    accounts: [],
    note: ''
  }
}

/** «احمدی» = last name only; «علی احمدی» = first name «علی». */
export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean)

  return { firstName: parts.slice(0, -1).join(' '), lastName: parts.at(-1) ?? '' }
}

/** The person with the entered name, phone and card laid over what they already had. */
export function applyPersonInput<T extends PersonFields>(person: T, input: PersonInput): T {
  const name = input.name.trim()
  const phone = normalizeDigits(input.phone).trim()
  const card = normalizeDigits(input.card).replace(/\D/g, '')

  return {
    ...person,
    ...(name ? { ...splitName(name), placeholder: false } : {}),
    phones: phone ? [{ number: phone }] : person.phones,
    accounts: card
      ? [{ bankName: '', accountNumber: card }, ...person.accounts.filter(a => a.bankName)]
      : person.accounts
  }
}
