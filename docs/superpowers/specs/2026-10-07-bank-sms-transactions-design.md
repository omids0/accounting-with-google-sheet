# Bank SMS Transactions (ثبت از پیامک بانکی) — Design

Date: 2026-10-07
Branch: `feature/ACCT-0/ACCT-0/bank-sms-transactions`

## Goal

On the Android build, read incoming bank SMS, recognise which wallet account they belong
to, and offer them as income/expense entries in a review queue. On confirmation the app
writes the record to Google Sheets and updates the account balance. The web/PWA build
keeps working unchanged; only template editing is available there.

## Decisions (agreed in brainstorming)

| Topic | Decision |
|-------|----------|
| Automation | Review queue. Nothing is written to Sheets until the user confirms. |
| Balance | Set to the SMS «مانده» when present; otherwise add/subtract the amount. An older SMS never overrides a newer balance. |
| Recognition | Per-account templates built from sample SMS. Sender number is **not** used. |
| Template building | App guesses the role of each number; user corrects by tapping. |
| Unmatched bank-like SMS | Enter the queue as «ناشناخته» with «ساخت قالب» / «نادیده گرفتن». |
| Permissions | `RECEIVE_SMS` (live) **and** `READ_SMS` (catch-up + sample picker). |
| Old SMS | After saving a template, user picks a start date; default «از همین الان». Probable duplicates are flagged. |
| Own-account transfers | Auto-paired, shown as «انتقال داخلی», confirmed by user. No income/expense record. |
| Architecture | Approach A: native code only captures and stores raw SMS; all parsing lives in TypeScript. |

## Context in the current code

- `WalletAccount.balance` is a stored number (`src/services/wallet.ts`). Income/expense
  records have no account link. The reconcile formula
  (`موجودی اول + درآمد − هزینه = مانده محاسبه‌شده`) stays valid: SMS entries create normal
  records, and transfers create none.
- `createLinkedExpenseRecord` / `createLinkedIncomeRecord` (`src/services/paymentTransactions.ts`)
  write the records.
- `updateWalletAccount` writes the balance.
- `normalizeDigits` (`src/utils/normalizeDigits.ts`) normalises Persian/Arabic digits.
- Native side today: only `MainActivity extends BridgeActivity`. No custom plugin yet.
- APKs ship via GitHub Releases, so Google Play's SMS permission policy does not apply.

## Naming

| Concern | Value |
|---------|-------|
| Tab key | `bank-sms` |
| Title | `پیامک‌های بانکی` |
| Components | `src/components/bankSms/` |
| Services | `src/services/bankSms*.ts` |
| Types | `src/types/bankSms.ts` |
| Sheet | `قالب_پیامک` |
| Native plugin | `BankSms` (`android/app/src/main/java/com/omids0/accounting/banksms/`) |

## Unit 1 — Template engine (pure TypeScript)

No I/O. Everything is unit tested with vitest.

### Normalisation

`normalizeSmsText(text)`:

- `normalizeDigits`
- `ي→ی`, `ك→ک`
- remove `‌‎‏‪-‮`
- collapse all whitespace (including newlines) to one space
- trim

### Tokenising

`tokenizeSms(text)` splits normalised text into `text` and `number` tokens.

A number token is any of these:

- **Amount-like:** `\d[\d,٬]*` (an optional decimal part is ignored)
- **Masked reference:** `\d*[*xX.]+\d+`, for example `6104***1234` or `...1234`
- **Date:** `\d{2,4}/\d{1,2}/\d{1,2}`
- **Time:** `\d{1,2}:\d{2}(:\d{2})?`

A `+` or `-` sign stays in the text. This keeps the debit template («-») and the credit
template («+») distinct for banks that use signs.

### Template model (`src/types/bankSms.ts`)

```ts
export type SmsSlotRole = 'amount' | 'balance' | 'accountRef' | 'ignore'
export type SmsDirection = 'debit' | 'credit'
export type SmsAmountUnit = 'rial' | 'toman'

export type SmsTemplatePart = { kind: 'text'; value: string } | { kind: 'slot'; role: SmsSlotRole }

export interface SmsTemplate {
  id: string
  createdAt: string
  accountId: string
  direction: SmsDirection
  unit: SmsAmountUnit
  parts: SmsTemplatePart[]
}
```

The template stores no digits from the sample. Every number becomes a slot. This is
how amounts and card numbers stay out of the sheet.

### Role guessing

`guessTemplate(text)` returns `{ parts, direction, unit }`. The rules look at the text
in the ~15 characters before each number:

- Date or time token → `ignore`.
- Masked or dotted token → `accountRef`.
- Otherwise, the keyword nearest the number in the preceding ~20 characters decides:
  - `مانده|موجودی` → `balance`
  - `کارت|حساب|شماره` (with ≥4 digits) → `accountRef`
  - `مبلغ|برداشت|واریز|خرید|انتقال|پرداخت|کسر|سود` → `amount`
- An unlabelled run of 10 or more digits with no separators → `accountRef`.
- If still no amount was found, the first remaining unmasked number → `amount`.
- Each role is used once. A second candidate for the same role becomes `ignore`.
- Anything else → `ignore`.

Direction:

- `برداشت|خرید|انتقال از|پرداخت|کسر`, or a `-` before the amount → `debit`.
- `واریز|انتقال به|سود|+` → `credit`.

Unit: «تومان» → `toman`. Otherwise `rial`.

### Validation

A template must have exactly one `amount`, at most one `balance` and at most one
`accountRef`.

### Compiling and matching

`compileTemplate(template)` builds one regex:

- Literal text is escaped. Any whitespace inside a literal becomes `\s*`.
- `amount` / `balance` → `([\d,٬]+)`
- `accountRef` → `([\d*xX.]+)`
- `ignore` → `[\d/:,٬.*xX-]+`
- Anchored at the start. **Everything after the last captured (non-`ignore`) slot is
  optional.** Banks often append ad lines and dates, and the match must survive them.
- The one exception is a `+` or `-` sign directly after that slot. It stays required,
  because it is what separates the debit template from the credit template.
- The account reference is compared with the card number, the account number and the
  IBAN digits.

The regex uses only syntax that Java also supports, which keeps approach B possible
later.

`matchSms(text, templates, accounts)` returns one of:

- `{ kind: 'matched', templateId, accountId, direction, amount, balance? }`
  - Amounts are parsed with `parseNumeric`.
- `{ kind: 'ambiguous', candidates }`
  - Several accounts fit and the account reference cannot decide.
- `{ kind: 'unknown' }`
  - Passes the bank-like prefilter but matches no template.
- `{ kind: 'irrelevant' }`

### Account resolution

Two accounts at the same bank produce identical templates. When the matched template
has an `accountRef`, its visible trailing digits must equal the end of the account's
`cardNumber` or `accountNumber` (digits only, at least the last 4). Every matching
template is tried, and the first one whose account reference fits wins. If several
templates match and none can be decided by the reference, the result is `ambiguous`.

### Unit conversion

`toAppCurrency(value, unit, appCurrency)`:

- `rial → toman`: ÷10
- `toman → rial`: ×10
- If the app currency is `usd` or `eur`, the feature is disabled with an explanatory
  message.

### Prefilter

`isBankLike(text)`: three or more consecutive digits **and** one of
`مبلغ|ریال|تومان|مانده|موجودی|برداشت|واریز|خرید|انتقال`.

The Java receiver uses the same keyword list. A vitest reads the Java source and asserts
the two lists are equal. This follows the same precedent as the GoogleAuth scopes test.

## Unit 2 — Template storage and editor

### Sheet `قالب_پیامک`

Columns: `شناسه`, `زمان ثبت`, `شناسه حساب`, `نوع` (`برداشت`/`واریز`), `واحد`, `الگو`
(`parts` as JSON).

The sheet uses the existing row helpers and the sync outbox, and gets CSV import/export
like the other module sheets. Deleting a wallet account deletes its templates.

### Editor

`SmsTemplatesSection` sits inside `WalletFormModal`. It is shown for bank and other
account kinds, not for cash. It is a separate component so that `WalletFormModal` stays
under 300 lines.

- Lists the account's templates. Each template shows a direction and unit chip, plus
  delete.
- «افزودن پیامک نمونه» opens `SmsSampleEditor`. The sample comes from either:
  - a textarea (paste), or
  - «انتخاب از پیامک‌ها» (native only), which lists recent bank-like inbox SMS.
- The editor renders the tokens. Each number is a chip coloured by role. Tapping a chip
  cycles through مبلغ → مانده → شماره حساب/کارت → نادیده.
- Direction and unit are toggles, pre-set by the guesser.
- A live preview runs `matchSms` on the sample. It shows the parsed amount, the balance
  and whether the account was recognised.
- Save is disabled until validation passes.
- For a new account, templates are saved right after the account row is created.
- The same editor opens from a «ناشناخته» queue item, with an account picker added.

## Unit 3 — Native plugin `BankSms` (Android)

Kept thin, because Java can only be built in GitHub Actions.

### Manifest

- Permissions: `RECEIVE_SMS`, `READ_SMS`
- `BankSmsReceiver`:
  - action `android.provider.Telephony.SMS_RECEIVED`
  - `exported=true`
  - `android:permission="android.permission.BROADCAST_SMS"`

### Receiver

1. Join multipart PDUs.
2. Run `isBankLike`.
3. Append to the store.
4. Post a notification on channel `bank-sms`: «پیامک بانکی جدید — برای بررسی بزنید».
   - The text has no amount or account, because of lock-screen privacy.
   - Tapping it opens `MainActivity`.

### Store

- One file in `noBackupFilesDir`, AES-GCM encrypted with an Android Keystore key.
- Item: `{ id, sender, body, receivedAt, source: 'live' | 'inbox' }`.
- `id` = SHA-256 of `sender|receivedAt|body`.
- The store also keeps:
  - `handledIds`: ids already confirmed or dismissed, pruned after 120 days, so an inbox
    scan cannot bring them back.
  - `lastScanAt`.

### Plugin methods

- `checkPermissions` / `requestPermissions` (alias `sms`)
- `getPending() → { items }`
- `markHandled({ ids })` — removes the items and adds their ids to `handledIds`
- `scanInbox({ sinceMs }) → { added }` — queries `content://sms/inbox` with
  `date > since`, prefilters, skips known and handled ids, appends, then updates
  `lastScanAt`
- `listInbox({ limit }) → { items }` — recent bank-like SMS for the sample picker; these
  are not stored

### Registration

Call `registerPlugin(BankSmsPlugin.class)` in `MainActivity.onCreate` before
`super.onCreate`.

### TS wrapper

`src/services/bankSmsNative.ts` wraps the plugin with `registerPlugin('BankSms')`. On
web or iOS every method is a no-op.

## Unit 4 — Review queue

### Enabling the feature

A Settings card «ثبت از پیامک بانکی» appears on native only. Turning it on:

1. requests the `sms` permission
2. creates the `bank-sms` channel
3. stores `enabled` in `AppSettings`

Turning it off clears the native store.

### Loading the queue

On start and on resume, when the feature is enabled:

1. `scanInbox({ sinceMs: lastScanAt })`
2. `getPending()`
3. `matchSms` for each item
4. store the result in a small Zustand slice: `items` and `count`

A banner on the dashboard and wallet pages shows «N تراکنش پیامکی در انتظار بررسی». The
sidebar entry `پیامک‌های بانکی` under the wallet group shows the same count as a badge.

### `bank-sms` page

Cards are sorted by `receivedAt`. Each card shows the account, direction, amount,
balance and time, plus the raw text (collapsed).

- **Matched card:**
  - Fields: title (default `{account title} — پیامک`), category and subcategory
    (`FormModal`-style fields; suggestion = the last category used for the same
    template, kept in `localStorage`).
  - Actions: «ثبت» and «نادیده».
- **Probable duplicate:** An income/expense record exists with the same amount within ±1
  day of the SMS. The card gets a badge «احتمالاً تکراری» and a third action
  «فقط به‌روزرسانی موجودی».
- **Transfer pair:** A `debit` in account A and a `credit` in account B (A ≠ B) with equal
  converted amounts within 10 minutes. The two items become one card «انتقال داخلی
  A ← B» with «تأیید انتقال» and «جدا کردن».
- **Ambiguous card:** The user picks the account, and the card becomes a matched card.
- **Unknown card:** «ساخت قالب» (opens `SmsSampleEditor` with the text and an account
  picker; the item is re-matched after saving) and «نادیده».

### Confirm effects

`src/services/bankSmsApply.ts`:

1. **Record** (not for a transfer or for «فقط موجودی»): call `createLinked{Expense,Income}Record`
   with:
   - the converted amount
   - `date` = Jalali date of `receivedAt`
   - the chosen category
   - `note: 'ثبت از پیامک'`
2. **Balance**, per account. A new wallet column `زمان مانده پیامک` (`smsBalanceAt`, ISO) is
   appended last in `WALLET_HEADERS`.
   - If `receivedAt < smsBalanceAt`: no change. A newer «مانده» already includes this
     transaction.
   - Otherwise, if the SMS has a balance: `balance = converted balance` and
     `smsBalanceAt = receivedAt`.
   - Otherwise: `balance ± amount`. `smsBalanceAt` is not moved, because deltas commute.
3. `markHandled([id])` (both ids for a pair), then refresh the queue and call
   `notifySpreadsheetDataChanged`.

A failed Sheets write leaves the item in the queue and uses `handleSheetError`.

### Old SMS

After a template is saved for an account that had none, a dialog asks for the start
date. The options are: از همین الان (default), ۷ روز، ۳۰ روز، تاریخ دلخواه. The app then
calls `scanInbox({ sinceMs })`. Overlap is safe because ids are deduplicated.

## Error handling and privacy

- **Permission denied:** The Settings card shows the state and a «اجازه دادن» button. No
  crashes or loops.
- **Play Protect:** It may warn about SMS permissions when the APK is installed. About
  documents this.
- **Raw SMS text:** It exists only in the encrypted native store and in memory. It is
  never written to Sheets.
- **Notifications:** They contain no financial data.
- **App lock:** The queue page is behind the existing app lock like every other page.

## Testing

- **vitest**, with anonymised fixtures for the main banks (ملت، ملی، صادرات، سامان،
  پاسارگاد، تجارت، رسالت) and debit/credit pairs. The fixtures cover:
  - normalisation and tokenising
  - role guessing
  - compiling and matching, including trailing ad text
  - account resolution between two cards at the same bank
  - ambiguous and unknown results
  - unit conversion
  - the balance anchor rule, including out-of-order SMS
  - transfer pairing
  - duplicate detection
  - the prefilter list matching the Java list
- **Native:** checked by hand on a device with the APK from GitHub Actions. The steps are
  listed in the plan.

## Delivery steps (each step is its own PR)

1. Template engine (Unit 1) and its tests.
2. Template sheet and editor in the wallet form (Unit 2), paste only. This works on the
   web too, so real bank SMS can be tested before any native work.
3. Native plugin, the Settings card and the notification (Unit 3).
4. Review queue, confirm effects, transfers, duplicates and old-SMS scan (Unit 4).
5. About page update and `APP_VERSION` bump.

## Out of scope

- `NotificationListenerService` for bank apps that only push
- Precise notifications (approach B)
- Category rules beyond «last used for this template»
- Copying a template between accounts
