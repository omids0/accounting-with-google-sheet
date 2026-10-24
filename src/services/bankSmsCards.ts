import { normalizeSmsText, tokenizeSms } from './bankSmsText'

/**
 * Card / account digits found in a bank SMS without any template (round 11, Step 6): a whole
 * number, or the visible tail of a masked one («6219***1100», «6219…1100», «***1100»).
 */
export interface CardToken {
  /** The whole number, or the visible tail of a masked one. */
  digits: string
  masked: boolean
  /** The visible start of a masked number («6219» of «6219***1100»); '' when none shows. */
  head?: string
}

/** An unmasked number must be this long to count as a card or account (an amount is shorter). */
const MIN_FULL_DIGITS = 8

/** The shortest tail a masked number needs to be compared by. */
const MIN_TAIL_DIGITS = 4

/** The digits of a saved card / account / IBAN; '' when too few to compare by. */
export function savedCardDigits(value: string | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '')

  return digits.length >= MIN_TAIL_DIGITS ? digits : ''
}

/** «6219 8610 1234 1100» is one card; the ellipsis sign is three dots. */
function prepare(body: string): string {
  return normalizeSmsText(body)
    .replace(/…/g, '...')
    .replace(/\b(\d{4}) (\d{4}) (\d{4}) (\d{4})\b/g, '$1$2$3$4')
}

/** Every card-like number in the SMS, in reading order. */
export function smsCardTokens(body: string): CardToken[] {
  const found: CardToken[] = []

  for (const token of tokenizeSms(prepare(body))) {
    if (token.kind !== 'number') continue

    if (token.numberKind === 'ref') {
      const masked = /[*xX]|\.{2,}/.test(token.value)
      const digits = masked
        ? token.value.match(/(\d+)$/)?.[1] ?? ''
        : token.value.replace(/\D/g, '')

      if (digits.length >= (masked ? MIN_TAIL_DIGITS : MIN_FULL_DIGITS)) {
        found.push(
          masked
            ? { digits, masked, head: token.value.match(/^(\d+)[*xX.]/)?.[1] ?? '' }
            : { digits, masked }
        )
      }
    } else if (token.numberKind === 'amount' && /^\d+$/.test(token.value)) {
      if (token.value.length >= MIN_FULL_DIGITS) found.push({ digits: token.value, masked: false })
    }
  }

  return found
}

/** The saved number (digits only) ends the same way the SMS number does. */
export function cardTokenMatches(token: CardToken, saved: string): boolean {
  if (saved.length < MIN_TAIL_DIGITS) return false

  // An unmasked SMS number is compared only with a whole saved number, never a last-4 stub.
  if (!token.masked && saved.length < MIN_FULL_DIGITS) return false

  if (!(saved.endsWith(token.digits) || token.digits.endsWith(saved))) return false

  // «6104***5678» is not «5022…5678»: a visible start has to agree when the saved number is whole.
  const head = token.head ?? ''

  return !head || saved.length < head.length + token.digits.length || saved.startsWith(head)
}

export function anyCardMatches(tokens: CardToken[], saved: string[]): boolean {
  return tokens.some(token => saved.some(card => cardTokenMatches(token, card)))
}
