import { isBankLike, normalizeSmsText } from './bankSmsText'
import type {
  SmsMatchCandidate,
  SmsMatchResult,
  SmsParsedValues,
  SmsSlotRole,
  SmsTemplate,
  SmsTemplatePart,
  WalletAccount
} from '../types'
import { parseNumeric } from '../utils/parseNumeric'

type CapturedRole = Exclude<SmsSlotRole, 'ignore'>

export interface CompiledSmsTemplate {
  regex: RegExp
  /** Role of each capture group, in order. */
  roles: CapturedRole[]
}

/** Only syntax Java's java.util.regex also accepts, so the native side could reuse it later. */
const SLOT_PATTERNS: Record<SmsSlotRole, string> = {
  amount: String.raw`([\d,،٬]+)`,
  balance: String.raw`([\d,،٬]+)`,
  accountRef: String.raw`([\d*xX.\-]+)`,
  ignore: String.raw`[\d/:,،٬.*xX\-]+`
}

const OPTIONAL_SPACE = String.raw`\s*`

function literalPattern(value: string): string {
  const trimmed = value.trim()

  if (!trimmed) return OPTIONAL_SPACE

  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&').replace(/ /g, OPTIONAL_SPACE)

  return OPTIONAL_SPACE + escaped + OPTIONAL_SPACE
}

function lastCapturedIndex(parts: SmsTemplatePart[]): number {
  for (let index = parts.length - 1; index >= 0; index--) {
    const part = parts[index]

    if (part.kind === 'slot' && part.role !== 'ignore') return index
  }

  return -1
}

/**
 * Anchored at the start. Everything after the last captured slot is optional
 * (banks append ad lines and dates), except a `+`/`-` sign right after it,
 * which is what tells a debit template from a credit one for some banks.
 */
export function compileTemplate(parts: SmsTemplatePart[]): CompiledSmsTemplate {
  const end = lastCapturedIndex(parts)
  const roles: CapturedRole[] = []
  let source = '^'

  for (const part of parts.slice(0, end + 1)) {
    if (part.kind === 'text') {
      source += literalPattern(part.value)
      continue
    }

    source += SLOT_PATTERNS[part.role]

    if (part.role !== 'ignore') roles.push(part.role)
  }

  const next = parts[end + 1]
  const sign = next?.kind === 'text' ? next.value.trimStart().charAt(0) : ''

  if (sign === '+' || sign === '-') source += OPTIONAL_SPACE + '\\' + sign

  return { regex: new RegExp(source), roles }
}

interface TemplateHit {
  template: SmsTemplate
  values: SmsParsedValues
  accountRef: string | null
  literalLength: number
}

function runTemplate(template: SmsTemplate, text: string): TemplateHit | null {
  const { regex, roles } = compileTemplate(template.parts)
  const match = text.match(regex)

  if (!match) return null

  const captured = (role: CapturedRole) => {
    const index = roles.indexOf(role)

    return index < 0 ? null : match[index + 1]
  }

  const balance = captured('balance')

  return {
    template,
    values: {
      direction: template.direction,
      unit: template.unit,
      amount: parseNumeric(captured('amount')),
      balance: balance === null ? null : parseNumeric(balance)
    },
    accountRef: captured('accountRef'),
    literalLength: template.parts.reduce(
      (sum, part) => sum + (part.kind === 'text' ? part.value.trim().length : 0),
      0
    )
  }
}

type RefAccount = Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>

/** Visible digits a reference can be compared by; '' when fewer than 4. */
export function refDigits(ref: string): string {
  const masked = /[*xX]|\.{2,}/.test(ref)
  const digits = masked ? ref.match(/(\d+)$/)?.[1] ?? '' : ref.replace(/\D/g, '')

  return digits.length >= 4 ? digits : ''
}

/**
 * `null` = cannot decide: the SMS has no usable reference, or the account
 * has no card/account/IBAN number saved to compare with.
 */
export function accountMatchesRef(account: RefAccount, ref: string | null): boolean | null {
  const digits = ref ? refDigits(ref) : ''
  const known = [account.cardNumber, account.accountNumber, account.iban]
    .map(value => value.replace(/\D/g, ''))
    .filter(value => value.length >= 4)

  if (!digits || !known.length) return null

  return known.some(value => value.endsWith(digits) || digits.endsWith(value))
}

function toCandidate(hit: TemplateHit): SmsMatchCandidate {
  return { templateId: hit.template.id, accountId: hit.template.accountId }
}

/** Recognise one SMS against all saved templates. */
export function matchSms(
  raw: string,
  templates: SmsTemplate[],
  accounts: RefAccount[]
): SmsMatchResult {
  const text = normalizeSmsText(raw)
  const accountById = new Map(accounts.map(account => [account.id, account]))

  const hits = templates
    .map(template => runTemplate(template, text))
    .filter((hit): hit is TemplateHit => hit !== null && accountById.has(hit.template.accountId))
    .sort((a, b) => b.literalLength - a.literalLength)

  if (!hits.length) return { kind: isBankLike(text) ? 'unknown' : 'irrelevant' }

  const verdicts = hits.map(hit => ({
    hit,
    fits: accountMatchesRef(accountById.get(hit.template.accountId) as RefAccount, hit.accountRef)
  }))

  const confirmed = verdicts.filter(v => v.fits === true).map(v => v.hit)
  const pool = confirmed.length ? confirmed : verdicts.filter(v => v.fits === null).map(v => v.hit)

  if (!pool.length) return { kind: 'unknown' }

  const perAccount = [...new Map(pool.map(hit => [hit.template.accountId, hit])).values()]

  if (perAccount.length === 1) {
    return { kind: 'matched', ...toCandidate(perAccount[0]), ...perAccount[0].values }
  }

  return { kind: 'ambiguous', candidates: perAccount.map(toCandidate), ...perAccount[0].values }
}
