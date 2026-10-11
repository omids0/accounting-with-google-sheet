# Wallet Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let income/expense records name an account without moving its balance, and give
every wallet account a detail page that lists its balance history.

**Architecture:** A new `walletApply` field on income/expense records gates `walletEffectOf`.
A new sheet tab «گردش حساب» gets one row per balance change. `applyWalletChanges` requires a
`LedgerContext`, so every record-driven move is logged. SMS «مانده» moves and manual edits log
through the same service. A new route `/wallet/:accountId` reads the ledger.

**Tech Stack:** React 18, TypeScript, react-router, react-hook-form, vitest, Google Sheets via
the existing local store and outbox (`services/sheets.ts`).

**Spec:** `docs/superpowers/specs/2026-10-11-wallet-ledger-design.md`

## Global Constraints

- Every staged source file must stay at or under 300 lines.
- UI copy is Persian. Exact strings:
  - Column «اثر بر موجودی».
  - Tab «گردش حساب».
  - Checkbox «موجودی حساب هم به‌روز شود».
  - Hint «موجودی از پیامک جدیدتر به‌روز شده است».
  - Badge «بدون اثر».
  - Empty state «هنوز گردشی ثبت نشده».
- `walletApply` values: `''` and `'بله'` mean yes; `'خیر'` means no.
- Ledger sources: `ثبت` · `ویرایش` · `حذف` · `پیامک` · `اصلاح دستی` · `موجودی اولیه`.
- A ledger failure never fails the save that caused it.
- Commit messages: `<type>/ACCT-0/ACCT-0/<description>`.
- Do not change config, hooks or lint rules.

## Review Focus

1. **Flag off, then delete or edit the record.** The balance must not move. Test in Task 1
   (`walletEffectOf`) and Task 3 (`applyWalletChanges` with toggles).
2. **Records stored before this change (`walletApply` column missing or empty).** They must
   behave exactly as today. Test in Task 1.
3. **Vehicle expense re-save** (delete old record + create new one). It must not apply an amount
   when the old record had the flag off. Test in Task 3 (`deleteLinkedRecord` returns `''`).
4. **Path `/wallet/opening-balances`.** It must still open the opening-balances page and must not
   be treated as an account id. Test in Task 6 (`getTabFromPath`).
5. **Ledger write fails** (offline or sheet error). The record and the balance stay saved, and the
   user sees a warning. Covered by `.catch` at callers in Task 3; asserted in Task 3's test that
   `applyWalletChanges` resolves when the ledger append throws.

---

### Task 1: `walletApply` field and effect gate

**Files:**
- Modify: `src/components/form/fieldUtils.ts`, `src/components/form/index.ts`
- Modify: `src/services/recordWallet.ts`
- Modify: `src/services/settings.ts` (wrap forms with `withWalletApplyField`)
- Create: `src/services/migrateWalletApplyColumn.ts`
- Modify: `src/services/sheetSyncLifecycle.ts`, `src/services/spreadsheetSetup.ts`,
  `src/services/sheetSyncLifecycle.test.ts` (mock the new migration)
- Test: `src/services/recordWallet.test.ts`

**Produces:** `WALLET_APPLY_FIELD_ID = 'walletApply'`, `WALLET_APPLY_FIELD_LABEL = 'اثر بر موجودی'`,
`WALLET_APPLY_YES = 'بله'`, `WALLET_APPLY_NO = 'خیر'`, `withWalletApplyField(forms)`,
`isWalletApplied(values): boolean`.

- [ ] Step 1: Add tests to `recordWallet.test.ts`:

```ts
it('has no effect when the record opted out of moving the balance', () => {
  expect(walletEffectOf('expense', { amount: '100', walletAccount: 'a', walletApply: 'خیر' })).toBeNull()
})

it('keeps the effect for legacy rows and explicit yes', () => {
  expect(walletEffectOf('expense', { amount: '100', walletAccount: 'a', walletApply: '' })).toEqual({ accountId: 'a', delta: -100 })
  expect(walletEffectOf('income', { amount: '100', walletAccount: 'a', walletApply: 'بله' })).toEqual({ accountId: 'a', delta: 100 })
})
```

- [ ] Step 2: Run `npx vitest run src/services/recordWallet.test.ts`. Expect FAIL on the opt-out case.
- [ ] Step 3: In `fieldUtils.ts`:
  - Add the constants and `isWalletApplied(values)`, which returns
    `String(values[WALLET_APPLY_FIELD_ID] ?? '').trim() !== WALLET_APPLY_NO`.
  - Add `createWalletApplyField()`: type `select`, `required: false`, options `[بله, خیر]`.
  - Add `withWalletApplyField`, mirroring `withWalletAccountField`.
  - Insert `WALLET_APPLY_FIELD_ID` after `WALLET_ACCOUNT_FIELD_ID` in `STANDARD_FIELD_ORDER`.
  - In `walletEffectOf`, return `null` when `!isWalletApplied(values)`.
  - In `settings.ts`, wrap both form lists as `withWalletApplyField(withWalletAccountField(...))`.
- [ ] Step 4: Create `migrateWalletApplyColumn.ts`. It is a copy of `migrateWalletAccountColumn.ts`
  with storage key `accounting_wallet_apply_column_migration_v1` and label
  `WALLET_APPLY_FIELD_LABEL`. Chain it after `migrateWalletAccountColumn` in
  `sheetSyncLifecycle.ts:186` and `spreadsheetSetup.ts:184`. Mock it in `sheetSyncLifecycle.test.ts`.
- [ ] Step 5: Run `npx vitest run src/services`. Expect PASS.
- [ ] Step 6: Commit: `feature/ACCT-0/ACCT-0/Add a per-record switch for moving the wallet balance`.

### Task 2: Ledger service and tab

**Files:**
- Create: `src/services/walletLedger.ts`, `src/services/walletLedger.test.ts`
- Modify: `src/services/moduleSheetSpecs.ts`, `src/services/sheetSyncSheetNames.ts`

**Produces:**

```ts
export const WALLET_LEDGER_SHEET = 'گردش حساب'
export const WALLET_LEDGER_HEADERS = ['شناسه','زمان ثبت','شناسه حساب','تاریخ','مبلغ','موجودی بعد','عنوان','منبع','شناسه رکورد','اثر']
export type LedgerSource = 'ثبت' | 'ویرایش' | 'حذف' | 'پیامک' | 'اصلاح دستی' | 'موجودی اولیه'
export interface LedgerContext { title: string; date: string; source: LedgerSource; recordId?: string }
export interface LedgerEntry extends LedgerContext { id: string; createdAt: string; accountId: string; delta: number; balanceAfter: number; applied: boolean }
export function ledgerEntry(accountId: string, delta: number, balanceAfter: number, context: LedgerContext, applied?: boolean): LedgerEntry
export function ledgerRow(entry: LedgerEntry): string[]
export function rowToLedgerEntry(row: string[]): LedgerEntry
export async function appendLedgerEntries(spreadsheetId: string, entries: LedgerEntry[]): Promise<void>
export async function fetchLedger(spreadsheetId: string, accountId: string): Promise<LedgerEntry[]>
```

- [ ] Step 1: Write tests:
  - `ledgerRow` and `rowToLedgerEntry` round-trip, including `applied: false` ↔ `'خیر'`.
  - `fetchLedger` with rows seeded through the test sheet store (the same helper as
    `dashboard.realtime.test.ts`, `setSheetAllRows`) returns only one account's rows, newest
    first by row order. Rows are appended, so a later row is newer.
- [ ] Step 2: Run the tests. Expect FAIL (module missing).
- [ ] Step 3: Implement:
  - `appendLedgerEntries` calls `ensureSheetWithHeaders`, then `appendSheetRow` for each entry
    (same API as `wallet.ts`).
  - `createdAt` uses `new Date().toLocaleString('fa-IR')`, like other tabs.
  - `fetchLedger` returns rows with `row[2] === accountId`, reversed.
  - Register the tab in `MODULE_SHEET_SPECS` and `STATIC_SHEETS`.
- [ ] Step 4: Run the tests. Expect PASS.
- [ ] Step 5: Commit: `feature/ACCT-0/ACCT-0/Add the wallet ledger tab and service`.

### Task 3: Log record-driven balance moves

**Files:**
- Modify: `src/services/recordWallet.ts`, `src/services/entryWallet.ts`,
  `src/components/records/recordsMutations.ts`, `src/services/paymentTransactions.ts`,
  `src/services/vehicleExpenses.ts`, `src/services/bankSmsApply.ts` (`settleSmsFromEntry` only)
- Test: `src/services/recordWallet.test.ts`

**Consumes:** `LedgerContext`, `ledgerEntry`, `appendLedgerEntries` (Task 2), `isWalletApplied` (Task 1).
**Produces:**
- `applyWalletChanges(spreadsheetId, before, after, context: LedgerContext): Promise<void>`
- `recordLedgerContext(values, source, recordId?): LedgerContext`, built from `values.title` and `values.date`
- `logUnappliedRecord(spreadsheetId, type, values, recordId?): Promise<void>`

- [ ] Step 1: Tests, with `./wallet` and `./walletLedger` mocked through `vi.mock`:
  - Create `(null, expense a 100)` on a balance of 500 updates to 400 and appends one entry:
    `delta -100`, `balanceAfter 400`, source `ثبت`.
  - Edit on→off (`before` effect, `after` null) appends `+100`, source `ویرایش`.
  - Edit off→on appends `-100`.
  - If `appendLedgerEntries` rejects, `applyWalletChanges` still resolves and the balance
    update happened.
- [ ] Step 2: Run. Expect FAIL.
- [ ] Step 3: Implement:
  - In `applyWalletChanges`, collect an entry per updated account. After the loop, call
    `appendLedgerEntries(...).catch(() => showError('موجودی به‌روز شد ولی گردش حساب ثبت نشد'))`.
    Import `showError` from the toast util that `DataEntryForm` uses.
  - `logUnappliedRecord` writes one `applied: false` entry with delta 0 and the current balance,
    only when the record names an account and `!isWalletApplied`. Errors are swallowed the same way.
- [ ] Step 4: Update the callers:
  - `settleEntryWallet`: `applyWalletChanges(id, null, effect, recordLedgerContext(values, 'ثبت', recordId))`,
    then `logUnappliedRecord`. Add a `recordId` parameter. `DataEntryForm` passes the id it
    generated; `createManualVehicleExpense` already returns it.
  - `recordsMutations`: edit uses source `ویرایش` with `editingRecord.id`; delete uses `حذف`.
  - `deleteLinkedRecord`:
    - Uses source `حذف`.
    - Returns `walletEffectOf(...)?.accountId ?? ''`, so an opted-out record never carries its
      account into an applied re-create.
  - `createVehicleExpense`: source `ثبت` with the new `recordId`.
  - `settleSmsFromEntry`: takes the context and passes it to `applyWalletChanges`.
- [ ] Step 5: Run `npm run types` and `npx vitest run src/services`. Expect PASS.
- [ ] Step 6: Commit: `feature/ACCT-0/ACCT-0/Log every record-driven wallet balance change`.

### Task 4: SMS and linked-record paths keep the account

**Files:**
- Modify: `src/services/entryWallet.ts` (`prepareEntryValues`), `src/services/bankSmsApply.ts`,
  `src/services/paymentTransactions.ts` (`LinkedRecordParams.walletApply`)
- Modify: `src/services/vehicleExpenseActions.ts`, `src/hooks/useVehicleExpenseEntry.ts`,
  `src/components/records/recordsMutations.ts` (pass `walletApply` with `walletAccount`)
- Test: `src/services/entryWallet.test.ts`

- [ ] Step 1: Change the test "drops the account when a newer «مانده» already includes the SMS".
  It now expects `{ ...values, walletApply: 'خیر' }`, and `walletAccount` stays `'acc'`.
- [ ] Step 2: Run. Expect FAIL.
- [ ] Step 3: Implement:
  - `prepareEntryValues` sets `WALLET_APPLY_FIELD_ID: WALLET_APPLY_NO` instead of clearing the
    account.
  - `confirmSmsEntry` always passes `walletAccount: entry.result.accountId`, plus `walletApply`
    set to `'خیر'` when `smsAlreadyInBalance`.
  - `createLinked*Record` writes `[WALLET_APPLY_FIELD_ID]: params.walletApply ?? ''`.
  - `VehicleExpenseInput` gets `walletApply?: string`, threaded through `createManualVehicleExpense`,
    `upsertManualVehicleExpenseMeta`, `buildVehicleExpenseInput` and the vehicle branch of
    `recordsMutations`.
  - `applyBalance(spreadsheetId, entry, context)` logs `next.balance - account.balance` with
    source `پیامک` when it is not 0. The title is the record title or `پیامک <account title>`,
    and the date is `smsRecordDate(...)`. When `confirmSmsEntry` creates a record, it logs an
    `applied: false` entry if the flag is `خیر`.
- [ ] Step 4: Run `npm run types` and `npx vitest run src/services`. Expect PASS.
- [ ] Step 5: Commit: `feature/ACCT-0/ACCT-0/Keep the SMS account on records and log SMS balance moves`.

### Task 5: Manual balance edits

**Files:**
- Modify: `src/components/wallet/useWalletMutations.ts`

- [ ] Step 1:
  - In `handleBalanceSave`, after `updateWalletAccount`, call
    `appendLedgerEntries(id, [ledgerEntry(account.id, next - account.balance, next, manualContext())])`
    and catch the warning.
  - `manualContext()` returns title `اصلاح دستی موجودی`, date `getTodayIso()`, source `اصلاح دستی`.
  - Do the same in the edit-form branch when `payload.balance !== editingAccount.balance`.
  - After `createWalletAccount` with a non-zero balance, log `موجودی اولیه`.
  - If the file goes over 300 lines, move the three log calls into
    `components/wallet/walletLedgerLog.ts`.
- [ ] Step 2: Run `npm run types` and `npm run lint`. Expect clean.
- [ ] Step 3: Commit: `feature/ACCT-0/ACCT-0/Log manual wallet balance edits`.

### Task 6: Checkbox in the entry and edit forms

**Files:**
- Create: `src/components/form/CheckboxField.tsx`
- Modify: `src/components/form/FieldInput.tsx`, `src/components/form/index.ts`
- Modify: `src/components/dataEntry/StandardEntryFormFields.tsx`,
  `src/components/records/RecordsEditFormModal.tsx`, `src/components/DataEntryForm.tsx` (initial
  unchecked plus hint for an SMS already in the balance)

- [ ] Step 1:
  - `CheckboxField({ checked, onChange, label, hint?, disabled? })` renders
    `<label className="checkbox-row flex items-center gap-2">`, a native checkbox and an optional
    muted hint line.
  - `FieldInput` has a branch for `WALLET_APPLY_FIELD_ID`. It renders `CheckboxField` with
    `checked={value !== 'خیر'}` and maps to `'بله'` / `'خیر'`. Label: «موجودی حساب هم به‌روز شود».
  - Both forms skip the field while `values.walletAccount` is empty.
  - `DataEntryForm`: when `bankSms` and `smsAlreadyInBalance(bankSms, prefill.walletAccount)`, the
    initial value is `'خیر'` and the hint is shown.
- [ ] Step 2: Run `npm run types`, `npm run lint` and `npm test`. Expect clean.
- [ ] Step 3: Commit: `feature/ACCT-0/ACCT-0/Ask whether the account balance should move when saving`.

### Task 7: Account detail page

**Files:**
- Modify: `src/components/layout/types.ts` (Tab `wallet-account-detail`, title «گردش حساب»)
- Modify: `src/routes/paths.ts` (`walletAccountId` option, path, regex after the exact-path check)
- Modify: `src/components/layout/useLayoutNavigation.ts` (back to `wallet`, title from `location.state.title`)
- Create: `src/routes/WalletAccountDetailRoute.tsx`
- Modify: `src/routes/AppRoutes.tsx`, `src/routes/lazyPages.ts`
- Create: `src/components/wallet/WalletAccountDetailPage.tsx`, `src/components/wallet/useWalletLedger.ts`,
  `src/components/wallet/WalletLedgerItem.tsx`
- Modify: `src/components/wallet/WalletAccountCard.tsx`, `src/components/wallet/WalletPage.tsx`
- Test: `src/routes/paths.test.ts` (create if missing)

- [ ] Step 1: Tests:
  - `getTabFromPath('/wallet/abc')` returns `'wallet-account-detail'`.
  - `getTabFromPath('/wallet/opening-balances')` returns `'opening-balances'`.
  - `getPathForTab('wallet-account-detail', { walletAccountId: 'a b' })` returns `'/wallet/a%20b'`.
- [ ] Step 2: Run. Expect FAIL.
- [ ] Step 3: Implement the routing. Then build the page:
  - Header card with the current balance (`MoneyDisplay`).
  - List of `WalletLedgerItem`: date, title, source badge, signed amount (inflow/outflow colors as
    in `TransactionListItem`), «موجودی بعد». Muted with a «بدون اثر» badge when `!applied`.
  - Skeleton while loading, `EmptyState` when empty.
- [ ] Step 4: Change `WalletAccountCard`:
  - The body `onClick` calls a new `onOpen` prop.
  - The expand button keeps `onToggleExpand`.
  - `WalletPage` passes
    `onOpen={() => navigate(getPathForTab('wallet-account-detail', { walletAccountId: account.id }), { state: { title: account.title } })}`.
- [ ] Step 5: Run `npm run types`, `npm run lint`, `npm test` and `npm run lines`. Expect clean.
- [ ] Step 6: Commit: `feature/ACCT-0/ACCT-0/Add the wallet account history page`.

### Task 8: About page and final checks

**Files:**
- Modify: the wallet group in `src/components/about/aboutFeatureGroups*.ts`, and `APP_VERSION` in
  `src/components/about/AboutPage.tsx`

- [ ] Step 1: Add the two features to About in Persian: the balance checkbox, and «گردش حساب»
  opened by tapping an account card. Bump the minor version of `APP_VERSION`.
- [ ] Step 2: Run `npm run types`, `npm run lint`, `npm test` and `npm run build`. All pass.
- [ ] Step 3: Commit: `feature/ACCT-0/ACCT-0/Describe wallet history on About`.
- [ ] Step 4: Push the branch and give the compare link.
