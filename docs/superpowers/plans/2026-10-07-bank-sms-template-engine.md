# Bank SMS Template Engine (Step 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure TypeScript engine that turns a sample bank SMS into a template and recognises later SMS against saved templates.

**Architecture:** Four small modules under `src/services/`, plus one type module:

- `bankSmsText`: normalises and tokenises SMS text, and holds the bank-like prefilter.
- `bankSmsGuess`: guesses a template from a sample and validates it.
- `bankSmsMatch`: compiles a template to a regex, picks the account by card/account reference, and returns a match result.
- `bankSmsAmount`: converts rial and toman.

The engine has no I/O, React, Sheets or Capacitor code. Later steps (template editor, native plugin, review queue) build on these exact signatures.

**Tech Stack:** TypeScript 5 (`lib: ES2020`), vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-07-bank-sms-transactions-design.md` (Unit 1)

## Global Constraints

- Work on the existing branch `feature/ACCT-0/ACCT-0/bank-sms-transactions`. The spec commit is already on it.
- Every `*.ts` file stays at or below **300 lines** (Husky pre-commit check).
- `tsconfig` lib is **ES2020**. Do not use `Array.prototype.findLastIndex`, `Array.prototype.at` or other ES2022+ APIs.
- Import shared types from `'../types'`. Reuse `normalizeDigits` (`src/utils/normalizeDigits.ts`) and `parseNumeric` (`src/utils/parseNumeric.ts`). Do not re-implement them.
- Compiled template regexes may use only syntax that Java's `java.util.regex` also accepts: no lookbehind, no `\p{}`, no `u` / `v` / `d` flags.
- Templates never store digits from the sample. Every digit run becomes a slot.
- Commit message first line must match `<type>/ACCT-0/ACCT-0/<description>`, for example `feature/ACCT-0/ACCT-0/Add bank SMS text normaliser`. End the body with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not change any config, Husky hook, ESLint or Prettier file. If a hook fails, stop and report.
- Run `npm run format` on touched files before committing, so the hook does not re-stage them.

## Review Focus

1. **Persian digits:** An incoming SMS has Persian digits while the sample had Latin digits, or the other way round. It must still match (Task 2 fixture `melli-debit` uses Persian digits in `next`).
2. **Trailing ad line:** The bank adds or removes an ad line at the end. It must still match (Task 3 `mellat-debit` `next` adds a line; `saman-debit` `next` drops `لغو11`).
3. **Two cards at the same bank:** Identical template text. The masked card digits must pick the right account (Task 3 «uses the masked reference…»).
4. **Account saved without a card or account number:** The SMS still matches instead of being rejected (Task 3 fixture loop uses accounts with no numbers).
5. **OTP and chat SMS with numbers:** They must not count as bank-like and must not enter the queue (Task 1 `isBankLike` tests).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/types/bankSms.ts` (create) | Template, slot, issue and match-result types |
| `src/types/index.ts` (modify, append) | Re-export the new types |
| `src/services/bankSmsText.ts` (create) | `normalizeSmsText`, `tokenizeSms`, `BANK_SMS_KEYWORDS`, `isBankLike` |
| `src/services/bankSmsGuess.ts` (create) | `guessTemplate`, `validateTemplateParts` |
| `src/services/bankSmsMatch.ts` (create) | `compileTemplate`, `refDigits`, `accountMatchesRef`, `matchSms` |
| `src/services/bankSmsAmount.ts` (create) | `toAppCurrency` |
| `src/services/bankSmsFixtures.ts` (create) | Synthetic SMS fixtures used by the tests |
| `src/services/bankSms*.test.ts` (create) | vitest suites, one per module |

---

### Task 1: Types and text normalisation/tokenising

**Files:**
- Create: `src/types/bankSms.ts`
- Modify: `src/types/index.ts` (append at end of file, after the `'./vehicles'` export block)
- Create: `src/services/bankSmsText.ts`
- Test: `src/services/bankSmsText.test.ts`

**Interfaces:**
- Consumes: `normalizeDigits(text: string): string` from `src/utils/normalizeDigits.ts`
- Produces:
  - `normalizeSmsText(text: string): string`
  - `type SmsNumberKind = 'date' | 'time' | 'ref' | 'amount'`
  - `type SmsToken = { kind: 'text'; value: string } | { kind: 'number'; value: string; numberKind: SmsNumberKind }`
  - `tokenizeSms(normalized: string): SmsToken[]`
  - `BANK_SMS_KEYWORDS: string[]`
  - `isBankLike(raw: string): boolean`
  - all types in `src/types/bankSms.ts`, re-exported from `src/types`

- [ ] **Step 1: Create the types file**

`src/types/bankSms.ts`:

```ts
/** What a number in a bank SMS means. `ignore` covers dates, times and anything else. */
export type SmsSlotRole = 'amount' | 'balance' | 'accountRef' | 'ignore'

/** `debit` = money left the account (expense side); `credit` = money arrived. */
export type SmsDirection = 'debit' | 'credit'

export type SmsAmountUnit = 'rial' | 'toman'

/**
 * A template is the sample SMS with every number replaced by a typed slot,
 * so no amount or card digit from the sample is ever stored.
 */
export type SmsTemplatePart = { kind: 'text'; value: string } | { kind: 'slot'; role: SmsSlotRole }

export interface SmsTemplate {
  id: string
  createdAt: string
  accountId: string
  direction: SmsDirection
  unit: SmsAmountUnit
  parts: SmsTemplatePart[]
}

export type SmsTemplateIssue =
  | 'amount-missing'
  | 'amount-multiple'
  | 'balance-multiple'
  | 'accountRef-multiple'

export interface SmsParsedValues {
  direction: SmsDirection
  unit: SmsAmountUnit
  /** In the SMS's own unit; convert with `toAppCurrency` before storing. */
  amount: number
  balance: number | null
}

export interface SmsMatchCandidate {
  templateId: string
  accountId: string
}

export type SmsMatchResult =
  | ({ kind: 'matched' } & SmsMatchCandidate & SmsParsedValues)
  | ({ kind: 'ambiguous'; candidates: SmsMatchCandidate[] } & SmsParsedValues)
  | { kind: 'unknown' }
  | { kind: 'irrelevant' }
```

- [ ] **Step 2: Re-export the types**

Append to the end of `src/types/index.ts`:

```ts

export type {
  SmsSlotRole,
  SmsDirection,
  SmsAmountUnit,
  SmsTemplatePart,
  SmsTemplate,
  SmsTemplateIssue,
  SmsParsedValues,
  SmsMatchCandidate,
  SmsMatchResult
} from './bankSms'
```

- [ ] **Step 3: Write the failing test**

`src/services/bankSmsText.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { isBankLike, normalizeSmsText, tokenizeSms } from './bankSmsText'

describe('normalizeSmsText', () => {
  it('turns Persian digits, Arabic letters, invisible marks and newlines into one shape', () => {
    expect(normalizeSmsText('بانك ملي\u200c\n\n مانده:۱۲۳\u200f  ريال ')).toBe('بانک ملی مانده:123 ریال')
  })
})

describe('tokenizeSms', () => {
  const numbers = (text: string) =>
    tokenizeSms(normalizeSmsText(text)).flatMap(token =>
      token.kind === 'number' ? [[token.numberKind, token.value]] : []
    )

  it('labels amounts, masked references, dates and times', () => {
    expect(numbers('برداشت:1,250,000 حساب:4567***1234 1405/07/15 14:32')).toEqual([
      ['amount', '1,250,000'],
      ['ref', '4567***1234'],
      ['date', '1405/07/15'],
      ['time', '14:32']
    ])
  })

  it('reads dotted, leading-masked and dashed references as one token', () => {
    expect(numbers('از 1234...5678 کارت ***9876 حساب 205.8000.1234567.1 شبا 0101-234-567')).toEqual(
      [
        ['ref', '1234...5678'],
        ['ref', '***9876'],
        ['ref', '205.8000.1234567.1'],
        ['ref', '0101-234-567']
      ]
    )
  })

  it('keeps the Persian thousands separator inside one amount', () => {
    expect(numbers('مبلغ ۷۵۰٬۰۰۰ ریال')).toEqual([['amount', '750٬000']])
  })

  it('keeps a +/- sign in the text, not in the number', () => {
    const tokens = tokenizeSms('مبلغ: 2,000,000- مانده')

    expect(tokens[1]).toEqual({ kind: 'number', value: '2,000,000', numberKind: 'amount' })
    expect(tokens[2]).toEqual({ kind: 'text', value: '- مانده' })
  })
})

describe('isBankLike', () => {
  it('accepts a money message', () => {
    expect(isBankLike('بانک ملت\nبرداشت:1,250,000\nمانده:8,430,000')).toBe(true)
  })

  it('rejects chat and one-time-password messages', () => {
    expect(isBankLike('سلام ساعت 1500 میام')).toBe(false)
    expect(isBankLike('کد ورود شما: 48213')).toBe(false)
  })

  it('rejects a keyword without a three-digit number', () => {
    expect(isBankLike('مانده حساب خود را بررسی کنید')).toBe(false)
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/services/bankSmsText.test.ts`
Expected: FAIL. Vitest reports it cannot resolve `./bankSmsText`.

- [ ] **Step 5: Implement**

`src/services/bankSmsText.ts`:

```ts
import { normalizeDigits } from '../utils/normalizeDigits'

/** ZWNJ/ZWJ, bidi marks and isolates, BOM — invisible but they break literal matching. */
const INVISIBLE_CHARS = /[\u200c\u200d\u200e\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g

/**
 * Bring an SMS into one canonical shape before tokenising or matching:
 * ASCII digits, Persian «ی»/«ک», no invisible marks, single spaces.
 */
export function normalizeSmsText(text: string): string {
  return normalizeDigits(text)
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(INVISIBLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export type SmsNumberKind = 'date' | 'time' | 'ref' | 'amount'

export type SmsToken =
  | { kind: 'text'; value: string }
  | { kind: 'number'; value: string; numberKind: SmsNumberKind }

/** Order matters: the first alternative that matches at a position wins. */
const NUMBER_PATTERNS: [SmsNumberKind, string][] = [
  ['date', String.raw`\d{2,4}[/-]\d{1,2}[/-]\d{1,2}`],
  ['time', String.raw`\d{1,2}:\d{2}(?::\d{2})?`],
  // Masked or dotted references: 6104***1234, 1234...5678, ***1234, 205.8000.1234567.1
  ['ref', String.raw`(?:[*xX]+|\.{2,})?\d+(?:(?:[*xX]+|\.+|-)\d+)+|(?:[*xX]+|\.{2,})\d+`],
  ['amount', String.raw`\d+(?:[,،٬]\d{3})*`]
]

const NUMBER_RE = new RegExp(NUMBER_PATTERNS.map(([, source]) => `(${source})`).join('|'), 'g')

/** Split already-normalised text into literal text and number tokens. */
export function tokenizeSms(normalized: string): SmsToken[] {
  const tokens: SmsToken[] = []
  let last = 0

  for (const match of normalized.matchAll(NUMBER_RE)) {
    const index = match.index ?? 0

    if (index > last) tokens.push({ kind: 'text', value: normalized.slice(last, index) })

    const group = match.slice(1).findIndex(value => value !== undefined)

    tokens.push({ kind: 'number', value: match[0], numberKind: NUMBER_PATTERNS[group][0] })
    last = index + match[0].length
  }

  if (last < normalized.length) tokens.push({ kind: 'text', value: normalized.slice(last) })

  return tokens
}

/** Keep equal to BANK_SMS_KEYWORDS in the native BankSmsReceiver (step 3 adds a test). */
export const BANK_SMS_KEYWORDS = [
  'مبلغ',
  'ریال',
  'تومان',
  'مانده',
  'موجودی',
  'برداشت',
  'واریز',
  'خرید',
  'انتقال'
]

/** Cheap prefilter: three or more digits plus one money keyword. */
export function isBankLike(raw: string): boolean {
  const text = normalizeSmsText(raw)

  return (
    /\d{3,}/.test(text.replace(/[,،٬]/g, '')) && BANK_SMS_KEYWORDS.some(word => text.includes(word))
  )
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/services/bankSmsText.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 7: Type-check, lint, format, commit**

```bash
npm run types
npx eslint --fix src/types/bankSms.ts src/types/index.ts src/services/bankSmsText.ts src/services/bankSmsText.test.ts
npx prettier --write src/types/bankSms.ts src/types/index.ts src/services/bankSmsText.ts src/services/bankSmsText.test.ts
git add src/types/bankSms.ts src/types/index.ts src/services/bankSmsText.ts src/services/bankSmsText.test.ts
git commit -F - <<'EOF'
feature/ACCT-0/ACCT-0/Add bank SMS types, text normaliser and tokenizer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 2: Template guessing and validation

**Files:**
- Create: `src/services/bankSmsFixtures.ts`
- Create: `src/services/bankSmsGuess.ts`
- Test: `src/services/bankSmsGuess.test.ts`

**Interfaces:**
- Consumes: `normalizeSmsText`, `tokenizeSms`, `SmsToken` (Task 1); `SmsAmountUnit`, `SmsDirection`, `SmsSlotRole`, `SmsTemplateIssue`, `SmsTemplatePart` from `'../types'`
- Produces:
  - `interface SmsTemplateGuess { parts: SmsTemplatePart[]; direction: SmsDirection; unit: SmsAmountUnit }`
  - `guessTemplate(raw: string): SmsTemplateGuess`
  - `validateTemplateParts(parts: SmsTemplatePart[]): SmsTemplateIssue[]` (empty array = valid)
  - Fixtures: `BANK_SMS_FIXTURES: BankSmsFixture[]` and `fixtureAccount(id, numbers?)`. Task 3 uses them.

- [ ] **Step 1: Add the fixtures**

`src/services/bankSmsFixtures.ts`:

```ts
import type { SmsDirection, SmsSlotRole, WalletAccount } from '../types'

/**
 * Synthetic bank SMS shaped like real Iranian bank messages. Card numbers,
 * amounts and balances are invented. Each fixture has a `sample` the template
 * is built from and a `next` message the template must recognise.
 */
export interface BankSmsFixture {
  bank: string
  sample: string
  next: string
  roles: Exclude<SmsSlotRole, 'ignore'>[]
  direction: SmsDirection
  expected: { amount: number; balance: number | null; accountRef: string }
}

export const BANK_SMS_FIXTURES: BankSmsFixture[] = [
  {
    bank: 'mellat-debit',
    sample: 'بانک ملت\nبرداشت:1,250,000\nحساب:4567***1234\nمانده:8,430,000\n0715-14:32',
    next: 'بانک ملت\nبرداشت:90,000\nحساب:4567***1234\nمانده:8,340,000\n0716-09:01\nاپ جدید همراه بانک',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'debit',
    expected: { amount: 90000, balance: 8340000, accountRef: '4567***1234' }
  },
  {
    bank: 'mellat-credit',
    sample: 'بانک ملت\nواریز:2,000,000\nحساب:4567***1234\nمانده:10,430,000\n0715-15:00',
    next: 'بانک ملت\nواریز:500,000\nحساب:4567***1234\nمانده:8,840,000\n0716-10:00',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'credit',
    expected: { amount: 500000, balance: 8840000, accountRef: '4567***1234' }
  },
  {
    bank: 'melli-debit',
    sample: 'بانك ملي ايران\nخريد:500,000\nاز:0101234567001\nمانده:3,200,000\n05/07/15_18:40',
    next: 'بانک ملی ایران\nخرید:۴۵,۰۰۰\nاز:0101234567001\nمانده:۳,۱۵۵,۰۰۰\n05/07/16_08:05',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'debit',
    expected: { amount: 45000, balance: 3155000, accountRef: '0101234567001' }
  },
  {
    bank: 'saman-debit',
    sample:
      'بانک سامان\nانتقال از 1234...5678\nمبلغ: 2,000,000-\nمانده: 15,000,000\n1405/07/15 10:20\nلغو11',
    next: 'بانک سامان\nانتقال از 1234...5678\nمبلغ: 300,000-\nمانده: 14,700,000\n1405/07/16 11:00',
    roles: ['accountRef', 'amount', 'balance'],
    direction: 'debit',
    expected: { amount: 300000, balance: 14700000, accountRef: '1234...5678' }
  },
  {
    bank: 'pasargad-credit',
    sample: 'پاسارگاد\n+3,000,000\nحساب 205.8000.1234567.1\nمانده 12,500,000\n1405/07/15',
    next: 'پاسارگاد\n+150,000\nحساب 205.8000.1234567.1\nمانده 12,650,000\n1405/07/16',
    roles: ['amount', 'accountRef', 'balance'],
    direction: 'credit',
    expected: { amount: 150000, balance: 12650000, accountRef: '205.8000.1234567.1' }
  },
  {
    bank: 'tejarat-credit',
    sample:
      'تجارت\nواریز به حساب ۱۲۳۴۵۶۷۸۹۰\nمبلغ ۷۵۰٬۰۰۰ ریال\nموجودی ۹٬۸۰۰٬۰۰۰\n۱۴۰۵/۰۷/۱۵ ۰۹:۱۲',
    next: 'تجارت\nواریز به حساب ۱۲۳۴۵۶۷۸۹۰\nمبلغ ۱٬۰۰۰٬۰۰۰ ریال\nموجودی ۱۰٬۸۰۰٬۰۰۰\n۱۴۰۵/۰۷/۱۶ ۱۰:۰۰',
    roles: ['accountRef', 'amount', 'balance'],
    direction: 'credit',
    expected: { amount: 1000000, balance: 10800000, accountRef: '1234567890' }
  },
  {
    bank: 'resalat-no-balance',
    sample: 'رسالت\nبرداشت از کارت ***9876\nمبلغ 120,000 تومان',
    next: 'رسالت\nبرداشت از کارت ***9876\nمبلغ 80,000 تومان',
    roles: ['accountRef', 'amount'],
    direction: 'debit',
    expected: { amount: 80000, balance: null, accountRef: '***9876' }
  }
]

type FixtureAccount = Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>

export function fixtureAccount(id: string, numbers: Partial<FixtureAccount> = {}): FixtureAccount {
  return { id, cardNumber: '', accountNumber: '', iban: '', ...numbers }
}
```

- [ ] **Step 2: Write the failing test**

`src/services/bankSmsGuess.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { BANK_SMS_FIXTURES } from './bankSmsFixtures'
import { guessTemplate, validateTemplateParts } from './bankSmsGuess'
import type { SmsTemplatePart } from '../types'

const capturedRoles = (parts: SmsTemplatePart[]) =>
  parts.flatMap(part => (part.kind === 'slot' && part.role !== 'ignore' ? [part.role] : []))

describe('guessTemplate', () => {
  it.each(BANK_SMS_FIXTURES)('guesses roles and direction for $bank', fixture => {
    const guess = guessTemplate(fixture.sample)

    expect(capturedRoles(guess.parts)).toEqual(fixture.roles)
    expect(guess.direction).toBe(fixture.direction)
  })

  it.each(BANK_SMS_FIXTURES)('stores no digit from the $bank sample', fixture => {
    expect(JSON.stringify(guessTemplate(fixture.sample).parts)).not.toMatch(/\d/)
  })

  it('reads the unit from «تومان», otherwise rial', () => {
    expect(guessTemplate('برداشت 1,000 تومان').unit).toBe('toman')
    expect(guessTemplate('برداشت 1,000 ریال').unit).toBe('rial')
  })

  it('falls back to the first unlabelled amount when no keyword names one', () => {
    expect(capturedRoles(guessTemplate('بانک آینده 250,000 مانده 900,000').parts)).toEqual([
      'amount',
      'balance'
    ])
  })

  it('keeps only the first of two balances', () => {
    expect(capturedRoles(guessTemplate('برداشت 10,000 مانده 50,000 موجودی 60,000').parts)).toEqual([
      'amount',
      'balance'
    ])
  })
})

describe('validateTemplateParts', () => {
  const slot = (role: 'amount' | 'balance' | 'accountRef' | 'ignore'): SmsTemplatePart => ({
    kind: 'slot',
    role
  })

  it('accepts one amount with optional balance and reference', () => {
    expect(validateTemplateParts([slot('amount'), slot('balance'), slot('accountRef')])).toEqual([])
  })

  it('names every problem', () => {
    expect(validateTemplateParts([slot('ignore')])).toEqual(['amount-missing'])
    expect(
      validateTemplateParts([
        slot('amount'),
        slot('amount'),
        slot('balance'),
        slot('balance'),
        slot('accountRef'),
        slot('accountRef')
      ])
    ).toEqual(['amount-multiple', 'balance-multiple', 'accountRef-multiple'])
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run src/services/bankSmsGuess.test.ts`
Expected: FAIL. Vitest reports it cannot resolve `./bankSmsGuess`.

- [ ] **Step 4: Implement**

`src/services/bankSmsGuess.ts`:

```ts
import { normalizeSmsText, tokenizeSms, type SmsToken } from './bankSmsText'
import type {
  SmsAmountUnit,
  SmsDirection,
  SmsSlotRole,
  SmsTemplateIssue,
  SmsTemplatePart
} from '../types'

export interface SmsTemplateGuess {
  parts: SmsTemplatePart[]
  direction: SmsDirection
  unit: SmsAmountUnit
}

/** The keyword closest to a number decides its role. */
const ROLE_KEYWORDS: [SmsSlotRole, string[]][] = [
  ['balance', ['مانده', 'موجودی']],
  ['accountRef', ['کارت', 'حساب', 'شماره']],
  ['amount', ['مبلغ', 'برداشت', 'واریز', 'خرید', 'انتقال', 'پرداخت', 'کسر', 'سود']]
]

/** How far back from a number its label is searched. */
const LABEL_WINDOW = 20

const DEBIT_WORDS = ['برداشت', 'خرید', 'انتقال از', 'پرداخت', 'کسر']

const CREDIT_WORDS = ['واریز', 'انتقال به', 'سود', 'دریافت']

function keywordRole(label: string): SmsSlotRole | null {
  const window = label.slice(-LABEL_WINDOW)
  let best: { role: SmsSlotRole; at: number } | null = null

  for (const [role, words] of ROLE_KEYWORDS) {
    for (const word of words) {
      const at = window.lastIndexOf(word)

      if (at >= 0 && (!best || at > best.at)) best = { role, at }
    }
  }

  return best?.role ?? null
}

function guessRole(token: Extract<SmsToken, { kind: 'number' }>, label: string): SmsSlotRole {
  if (token.numberKind === 'ref') return 'accountRef'
  if (token.numberKind !== 'amount') return 'ignore'

  const role = keywordRole(label)

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

/** First guess at a template from one sample SMS; the user corrects it in the editor. */
export function guessTemplate(raw: string): SmsTemplateGuess {
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

    let role = guessRole(token, label)

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
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/services/bankSmsGuess.test.ts`
Expected: PASS, 19 tests (7 fixtures × 2 `it.each` + 3 + 2).

- [ ] **Step 6: Type-check, lint, format, commit**

```bash
npm run types
npx eslint --fix src/services/bankSmsFixtures.ts src/services/bankSmsGuess.ts src/services/bankSmsGuess.test.ts
npx prettier --write src/services/bankSmsFixtures.ts src/services/bankSmsGuess.ts src/services/bankSmsGuess.test.ts
git add src/services/bankSmsFixtures.ts src/services/bankSmsGuess.ts src/services/bankSmsGuess.test.ts
git commit -F - <<'EOF'
feature/ACCT-0/ACCT-0/Guess bank SMS templates from a sample message

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 3: Compile templates and match SMS to accounts

**Files:**
- Create: `src/services/bankSmsMatch.ts`
- Test: `src/services/bankSmsMatch.test.ts`

**Interfaces:**
- Consumes: `isBankLike`, `normalizeSmsText` (Task 1); `guessTemplate` and the fixtures (Task 2, tests only); `parseNumeric` from `src/utils/parseNumeric.ts`; types from `'../types'`
- Produces:
  - `interface CompiledSmsTemplate { regex: RegExp; roles: ('amount' | 'balance' | 'accountRef')[] }`
  - `compileTemplate(parts: SmsTemplatePart[]): CompiledSmsTemplate`
  - `refDigits(ref: string): string` (returns `''` when fewer than 4 visible digits)
  - `accountMatchesRef(account: Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>, ref: string | null): boolean | null`
  - `matchSms(raw: string, templates: SmsTemplate[], accounts: Pick<WalletAccount, 'id' | 'cardNumber' | 'accountNumber' | 'iban'>[]): SmsMatchResult`
  - Amounts in the result are in the SMS's own unit. Convert them with Task 4.

**Matching rules (from the spec):**

- The regex is anchored at the start.
- Text after the last captured slot is optional, except a `+` or `-` sign directly after that slot.
- When several templates match, the one with the most literal characters is preferred.
- The account reference must fit the account's card, account or IBAN digits.
- If the account has no number saved, or the SMS has no reference, the reference cannot decide. In that case:
  - exactly one account → `matched`
  - several accounts → `ambiguous`
- If every matching template is rejected by the reference → `unknown`.
- If nothing matches → `unknown` when `isBankLike`, otherwise `irrelevant`.

- [ ] **Step 1: Write the failing test**

`src/services/bankSmsMatch.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { BANK_SMS_FIXTURES, fixtureAccount } from './bankSmsFixtures'
import { guessTemplate } from './bankSmsGuess'
import { accountMatchesRef, compileTemplate, matchSms, refDigits } from './bankSmsMatch'
import { normalizeSmsText } from './bankSmsText'
import type { SmsTemplate } from '../types'

function templateFrom(sample: string, id: string, accountId: string): SmsTemplate {
  return { id, createdAt: '', accountId, ...guessTemplate(sample) }
}

const MELLAT = BANK_SMS_FIXTURES[0]

describe('compileTemplate', () => {
  it('does not require text after the last captured slot', () => {
    const { regex } = compileTemplate(guessTemplate(MELLAT.sample).parts)

    expect(normalizeSmsText('بانک ملت برداشت:1 حساب:4567***1234 مانده:2')).toMatch(regex)
    expect(normalizeSmsText(MELLAT.next)).toMatch(regex)
  })

  it('requires a sign that directly follows the last captured slot', () => {
    const { regex } = compileTemplate([
      { kind: 'text', value: 'سامان ' },
      { kind: 'slot', role: 'amount' },
      { kind: 'text', value: '- ریال' }
    ])

    expect('سامان 5,000-').toMatch(regex)
    expect('سامان 5,000+').not.toMatch(regex)
  })

  it('reports capture roles in order', () => {
    expect(compileTemplate(guessTemplate(MELLAT.sample).parts).roles).toEqual([
      'amount',
      'accountRef',
      'balance'
    ])
  })
})

describe('matchSms — every fixture bank', () => {
  it.each(BANK_SMS_FIXTURES)('recognises the next $bank message', fixture => {
    const template = templateFrom(fixture.sample, 't1', 'acc1')
    const result = matchSms(fixture.next, [template], [fixtureAccount('acc1')])

    expect(result).toMatchObject({
      kind: 'matched',
      templateId: 't1',
      accountId: 'acc1',
      direction: fixture.direction,
      amount: fixture.expected.amount,
      balance: fixture.expected.balance
    })
  })
})

describe('matchSms — choosing the account', () => {
  const mellatA = templateFrom(MELLAT.sample, 'tA', 'accA')
  const mellatB = templateFrom(MELLAT.sample, 'tB', 'accB')
  const accounts = [
    fixtureAccount('accA', { cardNumber: '6104 3378 0000 1234' }),
    fixtureAccount('accB', { cardNumber: '6104337800009999' })
  ]

  it('uses the masked reference to tell two same-bank accounts apart', () => {
    const other = MELLAT.next.replace('4567***1234', '4567***9999')

    expect(matchSms(MELLAT.next, [mellatA, mellatB], accounts)).toMatchObject({ accountId: 'accA' })
    expect(matchSms(other, [mellatA, mellatB], accounts)).toMatchObject({ accountId: 'accB' })
  })

  it('is ambiguous when the reference cannot decide', () => {
    const blank = [fixtureAccount('accA'), fixtureAccount('accB')]

    expect(matchSms(MELLAT.next, [mellatA, mellatB], blank)).toMatchObject({
      kind: 'ambiguous',
      candidates: [
        { templateId: 'tA', accountId: 'accA' },
        { templateId: 'tB', accountId: 'accB' }
      ],
      amount: 90000
    })
  })

  it('is unknown when the reference belongs to no saved account', () => {
    const stranger = MELLAT.next.replace('4567***1234', '4567***5555')

    expect(matchSms(stranger, [mellatA, mellatB], accounts)).toEqual({ kind: 'unknown' })
  })

  it('ignores templates whose account was deleted', () => {
    expect(matchSms(MELLAT.next, [mellatA], [])).toEqual({ kind: 'unknown' })
  })

  it('does not let a debit template read a credit message', () => {
    const credit = BANK_SMS_FIXTURES[1]

    expect(matchSms(credit.next, [mellatA], accounts)).toEqual({ kind: 'unknown' })
  })

  it('returns irrelevant for a non-bank message', () => {
    expect(matchSms('سلام، ساعت 1500 میام', [mellatA], accounts)).toEqual({ kind: 'irrelevant' })
  })
})

describe('account references', () => {
  it('reads visible digits', () => {
    expect(refDigits('4567***1234')).toBe('1234')
    expect(refDigits('1234...5678')).toBe('5678')
    expect(refDigits('205.8000.1234567.1')).toBe('20580001234567' + '1')
    expect(refDigits('***12')).toBe('')
  })

  it('compares against card, account number and IBAN suffixes', () => {
    const account = fixtureAccount('a', { iban: 'IR12 0170 0000 0010 1234 5670 01' })

    expect(accountMatchesRef(account, '0101234567001')).toBe(true)
    expect(accountMatchesRef(account, '***9999')).toBe(false)
    expect(accountMatchesRef(account, null)).toBe(null)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/bankSmsMatch.test.ts`
Expected: FAIL. Vitest reports it cannot resolve `./bankSmsMatch`.

- [ ] **Step 3: Implement**

`src/services/bankSmsMatch.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/services/bankSmsMatch.test.ts`
Expected: PASS, 18 tests.

- [ ] **Step 5: Type-check, lint, format, commit**

```bash
npm run types
npx eslint --fix src/services/bankSmsMatch.ts src/services/bankSmsMatch.test.ts
npx prettier --write src/services/bankSmsMatch.ts src/services/bankSmsMatch.test.ts
git add src/services/bankSmsMatch.ts src/services/bankSmsMatch.test.ts
git commit -F - <<'EOF'
feature/ACCT-0/ACCT-0/Match bank SMS against templates and pick the account

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 4: Currency conversion and full gate

**Files:**
- Create: `src/services/bankSmsAmount.ts`
- Test: `src/services/bankSmsAmount.test.ts`

**Interfaces:**
- Consumes: `CurrencyUnit`, `SmsAmountUnit` from `'../types'`
- Produces: `toAppCurrency(value: number, unit: SmsAmountUnit, appCurrency: CurrencyUnit): number | null`. It returns `null` for `usd` / `eur`.

- [ ] **Step 1: Write the failing test**

`src/services/bankSmsAmount.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { toAppCurrency } from './bankSmsAmount'

describe('toAppCurrency', () => {
  it('converts between rial and toman', () => {
    expect(toAppCurrency(1_250_000, 'rial', 'toman')).toBe(125_000)
    expect(toAppCurrency(125_000, 'toman', 'rial')).toBe(1_250_000)
    expect(toAppCurrency(5_000, 'rial', 'rial')).toBe(5_000)
  })

  it('refuses foreign app currencies', () => {
    expect(toAppCurrency(1_000, 'rial', 'usd')).toBeNull()
    expect(toAppCurrency(1_000, 'toman', 'eur')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/services/bankSmsAmount.test.ts`
Expected: FAIL. Vitest reports it cannot resolve `./bankSmsAmount`.

- [ ] **Step 3: Implement**

`src/services/bankSmsAmount.ts`:

```ts
import type { CurrencyUnit, SmsAmountUnit } from '../types'

/**
 * Convert an SMS amount into the app's currency unit.
 * `null` = the app runs in usd/eur, where bank SMS amounts cannot be used.
 */
export function toAppCurrency(
  value: number,
  unit: SmsAmountUnit,
  appCurrency: CurrencyUnit
): number | null {
  if (appCurrency !== 'rial' && appCurrency !== 'toman') return null
  if (unit === appCurrency) return value

  return unit === 'rial' ? value / 10 : value * 10
}
```

- [ ] **Step 4: Run the whole suite and the gates**

```bash
npm test
npm run types
npm run lint
npm run lines
```

Expected:

- All vitest suites pass, including the 47 new tests.
- No type errors.
- No ESLint errors.
- Line check passes.

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/services/bankSmsAmount.ts src/services/bankSmsAmount.test.ts
git add src/services/bankSmsAmount.ts src/services/bankSmsAmount.test.ts
git commit -F - <<'EOF'
feature/ACCT-0/ACCT-0/Convert bank SMS amounts to the app currency

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 6: Push and hand over the merge link**

```bash
npm run build
git push -u origin feature/ACCT-0/ACCT-0/bank-sms-transactions
```

Merge link: `https://github.com/omids0/accounting-with-google-sheet/compare/main...feature/ACCT-0/ACCT-0/bank-sms-transactions?expand=1`

---

## Out of scope for this step

- The `قالب_پیامک` sheet, the editor UI, native code, the review queue and About (steps 2–5).
- The test that compares `BANK_SMS_KEYWORDS` with the Java list. It arrives with the Java receiver in step 3.
