# Wallet Ledger and Optional Balance Update — Design

Date: 2026-10-11
Branch: `feature/ACCT-0/ACCT-0/wallet-ledger`

## Goal

1. When an income/expense names a wallet account, the user chooses whether the account
   balance also moves. Default: it moves (today's behavior).
2. Each wallet account gets a detail page that lists its balance history: date, title,
   signed amount, source and the balance after each change.

## Decisions

| Topic | Decision |
|-------|----------|
| History source | New sheet tab «گردش حساب». Every balance change appends one row with the exact balance after it. History starts when this ships; older changes are not reconstructed. |
| Per-record flag | New standard income/expense field `walletApply`, column «اثر بر موجودی». Values: `''` (legacy rows) = yes, `'بله'` = yes, `'خیر'` = no. |
| Flag off | The record keeps its account. `walletEffectOf` returns `null`, so later edit/delete never undoes an amount that was never applied. One ledger row with `اثر = خیر` and delta 0 is written at creation. |
| Manual edits | Balance edits from the wallet card or account form are logged as «اصلاح دستی». A new account with a non-zero balance is logged as «موجودی اولیه». |
| SMS «مانده» | Balance moves from the SMS rule are logged as «پیامک», with the record id when a record exists. |
| Ledger failure | Never fails the save. A toast warns, like the existing "رکورد ذخیره شد ولی موجودی حساب به‌روز نشد". |
| Order | The list is ordered by write time (`زمان ثبت`), newest first, because «موجودی بعد» is a running value in write order. The record date is shown on each row. |
| Archive | The ledger tab is not part of the yearly archive sweep in this change. |

## Context in the current code

- `applyWalletChanges(spreadsheetId, before, after)` (`services/recordWallet.ts:46`) is the
  single path for record-driven balance moves: entry form (`services/entryWallet.ts`),
  record edit/delete (`components/records/recordsMutations.ts`), linked-record delete
  (`services/paymentTransactions.ts`), vehicle expenses and SMS entries saved through the form.
- SMS «مانده» moves bypass it: `applyBalance` in `services/bankSmsApply.ts:38`, used by
  `confirmSmsEntry`, `confirmSmsTransfer` and `settleSmsFromEntry`.
- Manual moves: `handleBalanceSave` and the account edit form in
  `components/wallet/useWalletMutations.ts`.
- `prepareEntryValues` (`services/entryWallet.ts:35`) and `confirmSmsEntry` clear
  `walletAccount` when a newer SMS «مانده» already includes the SMS. With the flag they keep
  the account and set `walletApply = 'خیر'` instead.
- Sheet tabs are registered in `MODULE_SHEET_SPECS` (`services/moduleSheetSpecs.ts`) and
  `STATIC_SHEETS` (`services/sheetSyncSheetNames.ts`). Columns are added to existing form
  tabs by a one-time migration like `services/migrateWalletAccountColumn.ts`.
- Wallet cards (`components/wallet/WalletAccountCard.tsx:53-68`) toggle an inline balance
  editor when the body is clicked. Detail pages follow `routes/VehicleDetailRoute.tsx`.

## Data

### Tab «گردش حساب»

`WALLET_LEDGER_SHEET = 'گردش حساب'`, headers:

| # | Header | Value |
|---|--------|-------|
| 0 | شناسه | uuid |
| 1 | زمان ثبت | write time, same format as other tabs |
| 2 | شناسه حساب | wallet account id |
| 3 | تاریخ | record date, SMS date, or today |
| 4 | مبلغ | signed delta (`0` when `اثر = خیر`) |
| 5 | موجودی بعد | balance after this row |
| 6 | عنوان | record title, or a fixed label |
| 7 | منبع | `ثبت` · `ویرایش` · `حذف` · `پیامک` · `اصلاح دستی` · `موجودی اولیه` |
| 8 | شناسه رکورد | record id, or empty |
| 9 | اثر | `بله` · `خیر` |

### Field `walletApply`

- `WALLET_APPLY_FIELD_ID = 'walletApply'`, label «اثر بر موجودی», type `select`, not required,
  options `بله` / `خیر`.
- Added to income/expense forms by `withWalletApplyField`, the same way as
  `withWalletAccountField`, and placed right after `walletAccount` in `STANDARD_FIELD_ORDER`.
- `migrateWalletApplyColumn` appends the header to existing income/expense tabs. It runs
  wherever `migrateWalletAccountColumn` runs.

## Service: `services/walletLedger.ts`

```ts
type LedgerSource = 'ثبت' | 'ویرایش' | 'حذف' | 'پیامک' | 'اصلاح دستی' | 'موجودی اولیه'

interface LedgerContext {
  title: string
  date: string
  source: LedgerSource
  recordId?: string
}

interface LedgerEntry extends LedgerContext {
  id: string
  createdAt: string
  accountId: string
  delta: number
  balanceAfter: number
  applied: boolean
}

fetchLedger(spreadsheetId, accountId): Promise<LedgerEntry[]>   // newest first
appendLedgerEntries(spreadsheetId, entries): Promise<void>
buildLedgerEntries(changes, balancesAfter, context): LedgerEntry[] // pure, unit-tested
```

## Write paths

- **`applyWalletChanges(spreadsheetId, before, after, context)`.** `context` is required, so
  no caller can move a balance without a ledger row. After each `updateWalletAccount` it
  appends one row per changed account.
- **Entry form, flag off.** `settleEntryWallet` appends the single `اثر = خیر` row.
- **Record edit.** Source `ویرایش`. `netWalletChanges` already covers both toggles: on→off
  undoes the old amount, off→on applies the new one.
- **Record delete.** Source `حذف`.
- **`applyBalance` (SMS).** Takes a context and logs `next.balance - account.balance` when it
  is not 0.
- **`useWalletMutations`.** `handleBalanceSave` and the edit form log `اصلاح دستی` with
  delta `new - old`. `createWalletAccount` with a non-zero balance logs `موجودی اولیه`.
- **Failures.** A failed ledger append is caught at the caller and shown as a warning toast.
  The balance and the record stay saved.

## UI

### Entry and edit form

- New shared `components/form/CheckboxField.tsx` (label row with a native checkbox, the same
  look as the existing `checkbox-row`).
- `StandardEntryFormFields` renders it under «حساب» only when an account is selected. Label:
  «موجودی حساب هم به‌روز شود». Default: checked.
- From an SMS whose amount is already in a newer «مانده», the box starts unchecked with a
  short hint: «موجودی از پیامک جدیدتر به‌روز شده است».
- The records edit form shows the same checkbox.

### Account detail page

- Route `/wallet/:accountId` with tab `wallet-account-detail`, wired the same way as
  `vehicle-detail` (`layout/types.ts`, `routes/paths.ts`, `useLayoutNavigation.ts`,
  `AppRoutes.tsx`). The header shows the account title and back returns to `/wallet`.
- `routes/WalletAccountDetailRoute.tsx` loads the account and shows a not-found state with a
  back button when the id is unknown.
- `components/wallet/WalletAccountDetailPage.tsx`, with a `useWalletLedger` hook:
  - Top: current balance and the account's short details.
  - List rows: date, title, source badge, signed amount (green +, red −), «موجودی بعد».
  - `اثر = خیر` rows are muted and carry a «بدون اثر» badge.
  - Empty state: «هنوز گردشی ثبت نشده».
  - No filters in this change.

### Wallet card

- Clicking the card body opens the detail page.
- The existing expand button toggles the inline balance editor.

## About page

Update the wallet group in `aboutFeatureGroups*.ts` (checkbox and account history) and bump
`APP_VERSION`.

## Testing (vitest)

- `walletEffectOf` returns `null` for `walletApply = 'خیر'` and an effect for `''` / `'بله'`.
- `buildLedgerEntries` computes signed deltas and balance-after per account.
- `applyWalletChanges` on edit with the flag toggled on→off and off→on.
- `prepareEntryValues` keeps the account and sets `walletApply = 'خیر'` when the SMS is
  already in the balance.
- `fetchLedger` filters by account and sorts newest first.

## Out of scope

- Reconstructing history from before this change.
- Filters and search on the detail page.
- Archiving the ledger tab by year.
