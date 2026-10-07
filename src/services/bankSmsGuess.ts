import { findSameShapeTemplate, learnedKeywords, type SmsRoleKeywords } from './bankSmsLearn'
import { normalizeSmsText, tokenizeSms, type SmsToken } from './bankSmsText'
import type {
  SmsAmountUnit,
  SmsDirection,
  SmsSlotRole,
  SmsTemplate,
  SmsTemplateIssue,
  SmsTemplatePart
} from '../types'

export interface SmsTemplateGuess {
  parts: SmsTemplatePart[]
  direction: SmsDirection
  unit: SmsAmountUnit
}

/** The keyword closest to a number decides its role. */
const ROLE_KEYWORDS: SmsRoleKeywords = [
  ['balance', ['مانده', 'موجودی']],
  ['accountRef', ['کارت', 'حساب', 'شماره']],
  ['amount', ['مبلغ', 'برداشت', 'واریز', 'خرید', 'انتقال', 'پرداخت', 'کسر', 'سود']]
]

/** How far back from a number its label is searched. */
const LABEL_WINDOW = 20

const DEBIT_WORDS = ['برداشت', 'خرید', 'انتقال از', 'پرداخت', 'کسر']

const CREDIT_WORDS = ['واریز', 'انتقال به', 'سود', 'دریافت']

function keywordRole(label: string, keywords: SmsRoleKeywords): SmsSlotRole | null {
  const window = label.slice(-LABEL_WINDOW)
  let best: { role: SmsSlotRole; at: number } | null = null

  for (const [role, words] of keywordList(keywords)) {
    for (const word of words) {
      const at = window.lastIndexOf(word)

      if (at >= 0 && (!best || at > best.at)) best = { role, at }
    }
  }

  return best?.role ?? null
}

function keywordList(keywords: SmsRoleKeywords): SmsRoleKeywords {
  return keywords.length ? [...keywords, ...ROLE_KEYWORDS] : ROLE_KEYWORDS
}

function guessRole(
  token: Extract<SmsToken, { kind: 'number' }>,
  label: string,
  keywords: SmsRoleKeywords
): SmsSlotRole {
  if (token.numberKind === 'ref') return 'accountRef'
  if (token.numberKind !== 'amount') return 'ignore'

  const role = keywordRole(label, keywords)

  if (role === 'accountRef')
    return token.value.replace(/\D/g, '').length >= 4 ? 'accountRef' : 'ignore'
  if (role) return role

  // Unlabelled 10+ digit runs without separators are card or account numbers, not money.
  return /^\d{10,}$/.test(token.value) ? 'accountRef' : 'ignore'
}

function firstIndexOf(text: string, words: string[]): number {
  return Math.min(
    ...words.map(word => {
      const at = text.indexOf(word)

      return at < 0 ? Infinity : at
    })
  )
}

function guessDirection(tokens: SmsToken[], amountIndex: number, text: string): SmsDirection {
  const before = tokens[amountIndex - 1]
  const after = tokens[amountIndex + 1]
  const signBefore = before?.kind === 'text' ? before.value.trimEnd().slice(-1) : ''
  const signAfter = after?.kind === 'text' ? after.value.trimStart().charAt(0) : ''

  if (signBefore === '+' || signAfter === '+') return 'credit'
  if (signBefore === '-' || signAfter === '-') return 'debit'

  return firstIndexOf(text, CREDIT_WORDS) < firstIndexOf(text, DEBIT_WORDS) ? 'credit' : 'debit'
}

/**
 * First guess at a template from one sample SMS; the user corrects it in the editor.
 * `learned` = templates already saved: a sample with the same text skeleton reuses
 * one of them outright, and their labels extend the keyword lists.
 */
export function guessTemplate(raw: string, learned: SmsTemplate[] = []): SmsTemplateGuess {
  const keywords = learnedKeywords(learned)
  const text = normalizeSmsText(raw)
  const tokens = tokenizeSms(text)
  const roles: (SmsSlotRole | null)[] = tokens.map(() => null)
  const taken = new Set<SmsSlotRole>()
  let label = ''

  tokens.forEach((token, index) => {
    if (token.kind === 'text') {
      label = token.value

      return
    }

    let role = guessRole(token, label, keywords)

    if (role !== 'ignore' && taken.has(role)) role = 'ignore'
    if (role !== 'ignore') taken.add(role)

    roles[index] = role
    label = ''
  })

  if (!taken.has('amount')) {
    const fallback = tokens.findIndex(
      (token, index) =>
        token.kind === 'number' && token.numberKind === 'amount' && roles[index] === 'ignore'
    )

    if (fallback >= 0) roles[fallback] = 'amount'
  }

  const parts: SmsTemplatePart[] = tokens.map((token, index) =>
    token.kind === 'text'
      ? { kind: 'text', value: token.value }
      : { kind: 'slot', role: roles[index] ?? 'ignore' }
  )

  const known = findSameShapeTemplate(parts, learned)

  if (known)
    return {
      parts: known.parts.map(part => ({ ...part })),
      direction: known.direction,
      unit: known.unit
    }

  const amountIndex = roles.indexOf('amount')

  return {
    parts,
    direction: amountIndex >= 0 ? guessDirection(tokens, amountIndex, text) : 'debit',
    unit: text.includes('تومان') ? 'toman' : 'rial'
  }
}

/** Empty list = the template can be saved. */
export function validateTemplateParts(parts: SmsTemplatePart[]): SmsTemplateIssue[] {
  const count = (role: SmsSlotRole) =>
    parts.filter(part => part.kind === 'slot' && part.role === role).length

  const issues: SmsTemplateIssue[] = []
  const amounts = count('amount')

  if (amounts === 0) issues.push('amount-missing')
  if (amounts > 1) issues.push('amount-multiple')
  if (count('balance') > 1) issues.push('balance-multiple')
  if (count('accountRef') > 1) issues.push('accountRef-multiple')

  return issues
}
