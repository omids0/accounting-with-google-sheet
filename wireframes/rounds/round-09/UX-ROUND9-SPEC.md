# UX Round 9 — Implementation Spec (polish after the user test)

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers.

Rounds 1–8 precede this and must be **merged** first (this round touches the round-7 attachments, the round-7.5 line items and counterparties, and the round-8 writer column). Six findings from a user test; nothing else. Wireframes: `round9-details-modals.html` (Steps 2, 3), `round9-treasury-settle.html` (Steps 4, 5, 6). Step 1 has no wireframe (code-only). Index: `index.html`.

The spec is written step by step with exact names on purpose. Follow the steps in order; each step ends with a check and a commit. Do not start the next step while the current one fails a check.

## Project rules (mandatory)

- 300-line hard limit per staged file (`npm run lines`); when a file you touch would pass 300, move a piece into a new file next to it.
- Reuse before create. Everything you need exists; each step says what to reuse.
- No tooling/config changes (`vite.config.ts`, `scripts/`, `tools/`, hooks, ESLint, Prettier, tsconfig, `package.json` scripts, size-limit). **No new dependencies.**
- Commands that must pass before every commit: `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run lines`, `npx size-limit`. Prettier only on the files you changed, never on folders.
- New localStorage keys: per spreadsheet and in `ACCOUNT_KEYS` in `src/services/localDataWipe.ts`.
- Update About (`src/components/about/aboutFeatureGroups*.ts`) and `aboutChangelog.ts` (max 3 items). Bump `version` in `package.json` and the two root lines in `package-lock.json` (this round ships as **2.6.0**).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per step; branch `feature/ACCT-0/ACCT-0/ux-round-9` off `main`; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...feature/ACCT-0/ACCT-0/ux-round-9?expand=1`.
- Commit messages end with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verify visually with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md` (mobile 390×844, desktop 1440×900), light and dark; screenshots in the scratchpad `shots/r9/`.

## What the user reported (summary)

1. Modals and sheets are translucent; the page shows through and looks messy. → **Opaque panels, plain dark backdrop.**
2. In the bank-SMS template sheet, the account dropdown is clipped under the sheet edge. → **Dropdown lists render in a portal.**
3. Tapping a record does nothing; after attaching a receipt there is nowhere to see it. → **Record detail sheet** with fields, attachments gallery, line items, actions.
4. The vault («صندوقچه») never says whether a holding gained or lost. → **Profit/loss** with weighted-average cost.
5. Line items need a unit price («فی»); the items total must **not** block saving.
6. «تسویه شد» on debts (and receivables, checks, installments) creates a record silently, never asks for the account, and never notices that the bank SMS for that payment was already recorded. → **Settle sheet** with date, account, balance effect, and a duplicate check.

## Facts about the code you will touch (read first)

- Modal styles live in `src/components/ui/modalStyles.ts` (`formModalBackdropClass`, `formModalPanelClass`, `formModalHeaderClass`, `formModalActionsClass`, `formModalPanelSideClass`, `formModalBackdropPanelClass`). Consumers: `FormModal.tsx`, `ConfirmActionModal.tsx`, `ConfirmDeleteModal.tsx`, `FilterModal.tsx`, `form/PickerSheet.tsx`, `form/categorySelect/CategorySelectSheet.tsx`, `attachments/AttachmentViewerSheet.tsx`, `counterparties/CounterpartyDetailModal.tsx`, `settings/backup/RestoreBackupModal.tsx`, `vehicles/VehicleItemDeleteModal.tsx`. Other blurred surfaces: `ui/speedDialStyles.ts` (backdrop line 13, menu ring line 68), `ui/sidebarMenuStyles.ts` (drawer backdrop line 9), `ui/datePickerStyles.ts` (lines 80, 90, 113). Theme tokens: `--color-overlay` (light `rgba(15,23,42,0.45)`, dark `rgba(0,0,0,0.7)`) and `--color-overlay-light` in `src/styles/theme.css`. `src/styles/base.css` line 164 already disables `backdrop-filter` on native.
- The custom dropdown is `src/components/form/Select.tsx` + `useSelectListbox.ts` (`rootRef`, `triggerRef`, `listboxRef`, `listboxId`, outside-click check on `rootRef.contains`). Built on it: `FormSelect.tsx`, `WalletAccountSelect.tsx`, `FieldInput.tsx`, `vehicleExpenses/VehicleSelect.tsx`, `nudges/NudgeToast.tsx`. The modal panel has `overflow-hidden` and its body `overflow-y-auto`, which clips the absolutely positioned list. Focus trap: `src/hooks/useFocusTrap.ts` (`openTraps` stack; Tab handling checks `container.contains(active)`). Modal Escape handling: `useModalLock` (round 4) — the top overlay only.
- Records list row: `src/components/records/RecordsListRow.tsx` renders `TransactionListItem` (`src/components/TransactionListItem.tsx`, props `title`, `titleAddon`, `meta`, `detail`, `children`). Edit: `RecordsEditFormModal.tsx` via `useRecordsFormActions`; delete: `useRecordsDelete.ts`; recurring: `useRecordRecurring.ts`; attachments: `attachments/AttachmentViewerSheet.tsx` (`open, onClose, title, sheetName, entityId, fileIds`), `AttachmentBadge.tsx`, `AttachmentField.tsx`. `SheetRecord` (`src/services/sheetsRecords.ts`) has `values`, `attachments`, `writer`; `StoredRecord` adds `formId/formType/formName`. Deep link: `/records?record=<id>` (round 6) and `?highlight=` (`useHighlightParam.ts`). Desktop list: `DataTable` (`src/components/table/DataTable.tsx`, row `onClick` support — check; add if missing).
- Vault: `VaultTransaction { assetType, action ('buy'|'sell'), quantity, unitPrice, transactionDate, createdAt }`, `VaultHolding { assetType, asset, netQuantity, currentUnitPrice, totalValue, transactions }` in `src/types/entities.ts`; `computeHoldings`, `totalsByClass` (`VaultClassTotal { assetClass, label, total, holdings }`) in `src/services/treasuryHoldings.ts`; cards `treasury/TreasuryHoldingCard.tsx` (header shows quantity, price, «ارزش کل»), list `TreasuryHoldingList.tsx` (class sections), table `TreasuryHoldingTable.tsx`, stats in `TreasuryPageContent.tsx` (`StatCard`), module report in `reports/moduleReportData.ts` (`case 'treasury'`), PDF/CSV in `services/treasury.ts` (`exportTreasuryCsv/Pdf`). Hidden mode: amounts go through `MoneyText`/`MoneyDisplay`, already masked.
- Line items: `src/utils/lineItems.ts` (`LineItem { name, amount, note? }`, stored as `{n,a,q}`), `src/components/dataEntry/LineItemSheet.tsx`, `EntryLineItemsField.tsx`, `useLineItemsEditor.ts` (`amountFollowsItems`, `remainder`, `OTHER_ITEM_NAME`), rule `lineItemsMismatch` + `LINE_ITEMS_BLOCKED_HINT` in `src/components/form/entryFieldRules.ts`, used by `DataEntryForm.tsx` (line ~99) and `records/RecordsEditFormModal.tsx` (line ~135). Report: `src/services/lineItemsReport.ts` derives `unitPrice` from `parseItemQuantity(note)`.
- Settlement today: `toggleDangPaid(spreadsheetId, dang, paid)` in `services/dang.ts`, `toggleCheckPaid(spreadsheetId, check, paid)` in `services/checks.ts`, `toggleInstallmentPayment(spreadsheetId, plan, paymentIndex, paid)` in `services/installmentsCrud.ts`, `addReceivablePayment(spreadsheetId, receivable, payment)` in `services/receivablesCrud.ts`. All call `createLinkedExpenseRecord` / `createLinkedIncomeRecord` (`services/paymentTransactions.ts`, `LinkedRecordParams { title, amount, category?, subCategory?, note?, date?, walletAccount?, walletApply? }`) — the account params exist but no caller passes them, and **the caller must move the balance itself**: the entry form does it with `settleEntryWallet(spreadsheetId, type, values, undefined, recordId)` in `services/entryWallet.ts` (uses `walletEffectOf`, `applyWalletChanges`, `logUnappliedRecord`). Unpaying deletes the linked record through `deleteLinkedExpenseRecord/IncomeRecord`. UI hooks: `hooks/usePaidItemActions.ts` (`togglePaid` option; used by dang, checks), `installments/useInstallmentPaymentActions.ts` (`handleTogglePayment`), `receivables/useReceivablePaymentActions.ts` (`handleAddPayment`). Vehicle expenses (`services/vehicleExpenseActions.ts`) already pass an account — only the duplicate check applies there.
- Duplicate helpers: `services/recordDuplicates.ts` (`LedgerEntry`, `DuplicateCandidate { type, amount, date, category? }`, `DuplicateRule { dayTolerance, sameCategory?, createdWithinMs?, nowMs? }`, `matchesDuplicate`, `findRecentEntryDuplicate`, `createdAgoLabel`), `services/recordLedger.ts` (`loadRecordLedger`, `recordToLedgerEntry`). Bank-SMS records carry the note `SMS_RECORD_NOTE = 'ثبت از پیامک'` (`services/bankSmsApply.ts`).
- Account picker: `form/WalletAccountSelect.tsx` (`value`, `onChange(accountId)`), with «بدون حساب (موجودی تغییر نمی‌کند)». Balance switch labels: `WALLET_APPLY_YES/NO` in `form/fieldUtils.ts`.

## Step 1 — Opaque modals and sheets (code only)

Files: `src/components/ui/modalStyles.ts`, `ui/speedDialStyles.ts`, `ui/sidebarMenuStyles.ts`, `ui/datePickerStyles.ts`, `src/styles/theme.css` (only if a token is missing).

- `formModalBackdropClass`: `bg-[var(--color-overlay)]`, **remove** `backdrop-blur-[4px]`. Keep the fade animation.
- `formModalPanelClass`: replace the `[background:linear-gradient(…color-mix…)]` line with `bg-surface`; **remove** `backdrop-blur-xl backdrop-saturate-150`; border `border-border` (no color-mix); keep radius, shadow, animation, max-width lines. Same for `formModalPanelSideClass` (desktop side panel stays opaque; `formModalBackdropPanelClass` keeps `xl:bg-transparent` so the list beside the panel stays visible — that is a layout choice, not translucency).
- `formModalHeaderClass` / `formModalActionsClass`: replace the gradient `[background:…accent-soft…transparent]` with a flat `bg-accent-soft/40` equivalent using an opaque token (`color-mix(in srgb, var(--color-accent-soft) 40%, var(--color-surface))` is fine — it is opaque because it mixes with the surface, not with transparent).
- Speed dial backdrop (`speedDialStyles.ts` line 13) and drawer backdrop (`sidebarMenuStyles.ts` line 9): `bg-[var(--color-overlay)]`, no blur. Speed dial menu ring (line 68): keep the ring, drop `backdrop-blur-[6px]`.
- Date/time picker sheets (`datePickerStyles.ts` lines 80, 90, 113): `bg-surface` (or `bg-[var(--color-surface-alt)]` where a second tone exists), no blur.
- Do not touch `appLock/PrivacyScreen.tsx`, `unlockStyles.ts`, `chartStyles.ts`, `locationMap.css` — those are not modals.
- Dark mode: check `--color-overlay` dark value (0.7) reads well; do not change tokens unless a panel is unreadable.

**Check:** screenshots of the entry date picker, a `FormModal` (check form), `ConfirmDeleteModal`, the drawer and the speed dial, mobile light + dark, and the desktop side panel. The a11y suite (light + dark) must pass — contrast of text on the panel improves, never worsens. **Commit:** `style/ACCT-0/ACCT-0/Make modals, sheets and pickers opaque over a plain dark backdrop`.

## Step 2 — Dropdown lists in a portal

Wireframe `round9-details-modals.html` phone 2. Files: `src/components/form/Select.tsx`, `src/components/form/useSelectListbox.ts`, new `src/components/form/useAnchoredPosition.ts` (+ test for the pure part), `src/hooks/useFocusTrap.ts`, `src/components/ui/formStyles.ts` (the `customSelectMenuClass`).

- Render the `role="listbox"` element through `createPortal(…, document.body)` when `open`. Position it with `position: fixed`, computed by `useAnchoredPosition(triggerRef, open)` from `triggerRef.current.getBoundingClientRect()`: `top = rect.bottom + 4`, `left = rect.left`, `width = rect.width`, `maxHeight = min(320, viewportHeight − top − 8)`; when that `maxHeight < 160` and there is more room above, open upward (`bottom = viewportHeight − rect.top + 4`). Recompute on `scroll` (capture phase, any ancestor) and `resize`; close on `scroll` of an ancestor only if the trigger left the viewport. Pure helper `anchoredPosition(rect, viewport, { gap: 4, maxHeight: 320, minHeight: 160 })` with unit tests (below, flipped, clamped to the viewport's right edge in RTL).
- `useSelectListbox`: the outside-click check must treat clicks inside `listboxRef` as inside (`rootRef.contains(target) || listboxRef.current?.contains(target)`).
- Escape inside the open listbox closes **only** the listbox (`event.stopPropagation()` after handling), so the modal underneath stays open (round-5 top-overlay rule).
- `useFocusTrap`: an element inside an open portal listbox counts as inside — add a module-level `registerTrapPortal(el)` / `unregisterTrapPortal(el)` used by `Select` while open, and have the Tab handler also accept `portals.some(p => p.contains(active))`. Tab from the open listbox closes it and continues from the trigger.
- `z-index`: above every modal (`z-[110]`; modals are `z-[100]`).
- All consumers (`FormSelect`, `WalletAccountSelect`, `FieldInput`, `VehicleSelect`, `NudgeToast`) get the fix automatically — verify the SMS template sheet («قالب جدید» → «حساب»), the recurring form in Settings, the savings-goal form, and the check form on mobile and in the desktop side panel. `CategorySelect` and `CounterpartySelect` use their own sheets and need nothing.

**Check:** Playwright: open the SMS template sheet with three accounts, open the account select, assert the listbox's bounding box is fully inside the viewport and not clipped (compare against the panel's box); keyboard: ↓ opens, Escape closes the list but not the sheet. Screenshots mobile light/dark. **Commit:** `bugfix/ACCT-0/ACCT-0/Render dropdown lists in a portal so sheets never clip them`.

## Step 3 — Record detail sheet

Wireframe `round9-details-modals.html` phone 1. Files: new `src/components/records/RecordDetailSheet.tsx` (+ `RecordDetailFields.tsx`, `RecordDetailAttachments.tsx`, `useRecordDetail.ts`), `RecordsListRow.tsx`, `TransactionListItem.tsx` (optional `onOpen` prop: the title/meta area becomes a button; the action buttons keep their own handlers), `RecordsPage.tsx` / `useRecordsPage.ts`, `useRecordsFormActions.ts`, the records `DataTable` columns (row click), `DashboardRecentBlock.tsx` (row tap → `/records?record=<id>&open=1`), `useHighlightParam.ts` or the records page effect that reads `?record=` (also open the sheet when `open=1`).

- `RecordDetailSheet` is a `FormModal` (`variant="panel"` at xl) in read-only mode: title = record title (or «دسته · زیردسته»), amount on the right in the header (signed, toned), then rows (`RecordDetailFields`, a two-column key/value list using `formatIsoDatePersian`, `formatMoney`): تاریخ (with weekday), دسته › زیردسته, حساب + «اثر بر موجودی: بله/خیر», طرف حساب (link to `/counterparties?highlight=<name>` — reuse the round-7.5 link), توضیحات, ثبت‌کننده (round 8: `WriterAvatar` + name + `createdAt` + device when shared; otherwise only `createdAt`), plus every custom-form field not covered above (iterate `form.fields`, skip `lineItems`, `attachments`).
- «پیوست‌ها · N»: thumbnails (`AttachmentThumb`) in a row; tap → `AttachmentViewerSheet` for that file; «+» opens the edit form with the attachment field focused (simplest: open `RecordsEditFormModal` and pass `focusField: 'attachments'`; add that prop if missing). Hidden when the record has no attachments and no pending uploads — then a single «افزودن پیوست» link.
- «ریز اقلام · N»: the item list (name · note/quantity · فی when present · amount) — reuse the list markup of `EntryLineItemsField` in read-only mode (extract `LineItemsList.tsx` if needed).
- Actions row: «ویرایش» (closes the sheet, opens `RecordsEditFormModal`), «تکرار ماهانه» (the round-6 picker from `useRecordRecurring`), «حذف» (`useRecordsDelete` flow; closes the sheet first).
- Opening: tap anywhere on the row except the ✎/🗑 buttons (`onOpen`); on desktop, `DataTable` row click; from the dashboard recent rows and global search results through `/records?record=<id>&open=1`; keyboard: Enter/Space on the focused row.
- Checks, dang, receivables, installments: their cards already expand in place; add the attachments thumbnails row inside the expanded body where it is missing (`CheckCard`, `DangCard`, `ReceivableCard`, `InstallmentPlanCard`) using the same `RecordDetailAttachments` component (pass `sheetName`, `entityId`, `fileIds`). No new sheet for them.
- About: entry-records group gets «جزئیات تراکنش».

**Check:** Playwright: tap a record with two attachments and two items → sheet shows both sections; tap a thumbnail → viewer; «ویرایش» opens the edit form; `/records?record=<id>&open=1` opens the sheet directly. Screenshots mobile light/dark, desktop panel. **Commit:** `feature/ACCT-0/ACCT-0/Open a record detail sheet with attachments and line items`.

## Step 4 — Vault profit and loss

Wireframe `round9-treasury-settle.html` phone 1. **Decision: weighted-average cost**, not FIFO. Files: new `src/services/treasuryPnl.ts` (+ test), `src/types/entities.ts` (`VaultHolding` gains fields), `src/services/treasuryHoldings.ts` (`computeHoldings` fills them; `totalsByClass` sums them), `treasury/TreasuryHoldingCard.tsx` (+ new `TreasuryHoldingPnl.tsx`), `TreasuryHoldingList.tsx` (class header subtotal), `TreasuryHoldingTable.tsx` (columns), `TreasuryPageContent.tsx` (stat card), `reports/moduleReportData.ts` + `services/treasury.ts` (CSV/PDF columns), About.

- `treasuryPnl.ts`:
  ```ts
  export interface CostBasis { avgUnitCost: number; quantity: number; realized: number; sells: number; buys: number }
  export function costBasis(transactions: VaultTransaction[]): CostBasis
  // chronological (transactionDate asc, then createdAt asc); buy: avg = (avg×qty + price×q) / (qty+q), qty += q;
  // sell: q = min(q, qty); realized += (price − avg) × q; qty −= q (avg unchanged); qty 0 → avg stays for display
  export function unrealized(basis: CostBasis, currentUnitPrice: number): { amount: number; pct: number }
  // amount = (currentUnitPrice − avgUnitCost) × quantity; pct = avgUnitCost > 0 ? amount / (avgUnitCost × quantity) × 100 : 0
  export function realizedInRange(transactions: VaultTransaction[], range: { from: string; to: string }): number
  // replays costBasis and sums realized of sells whose transactionDate is inside the range
  export function formatPct(pct: number): string   // «۱۵٫۷٪», «−۳٫۲٪», one decimal, Persian digits
  ```
- `VaultHolding` adds `avgUnitCost`, `unrealized`, `unrealizedPct`, `realized`, `sellCount`; `computeHoldings` fills them from `costBasis` (transactions of that asset) and `unrealized(basis, currentUnitPrice)`. `VaultClassTotal` adds `unrealized`, `realized`, `cost` (= Σ avgUnitCost × netQuantity).
- Holding card header (phone 1): second line becomes «<quantity> · خرید میانگین <avgUnitCost>»; value line «ارزش کل: X»; new line `TreasuryHoldingPnl`: signed unrealized amount in `text-success`/`text-danger` + «<pct> · قیمت روز <currentUnitPrice>» (or «قیمت دستی · <date>» for manual assets); when `sellCount > 0` a muted line «فروش‌های قبلی: <realized> سود/زیان قطعی (<sellCount> فروش)». Holdings whose every transaction lacks a price (legacy rows with `unitPrice` 0) show «بدون قیمت خرید» instead of P/L.
- Class section header (`TreasuryHoldingList`): «<label> · <total>» plus the class unrealized on the end, same colors. Desktop table: columns «خرید میانگین», «سود/زیان باز», «٪».
- Stats (`TreasuryPageContent`): add a second `StatCard` «سود/زیان باز» (amount + pct) next to «ارزش امروز»; both scoped to the selected class chip (round 6) — «همه» = all classes. Goals are excluded from P/L.
- Reports: the treasury module report gets columns «خرید میانگین», «سود باز», «سود قطعی» and a summary card «سود قطعی امسال / کل» (`realizedInRange` with the report's date range; «کل» = all time). CSV/PDF exports add the same three columns.
- Tests: `costBasis` (single buy, two buys at different prices, buy-sell-buy, sell more than held clamps, zero-price legacy rows), `unrealized` sign and pct, `realizedInRange` boundaries, `formatPct`.
- About: treasury group «سود و زیان».

**Check:** screenshots mobile light/dark (vault with gold + currency + a manual stock), desktop table; hidden mode masks the new amounts (verify once). **Commit:** `feature/ACCT-0/ACCT-0/Show profit and loss per holding, class and total in the vault`.

## Step 5 — Line items: unit price, free total

Wireframe `round9-treasury-settle.html` phone 3. Files: `src/utils/lineItems.ts` (+ test), `src/components/dataEntry/LineItemSheet.tsx`, `useLineItemsEditor.ts`, `EntryLineItemsField.tsx`, `src/components/form/entryFieldRules.ts`, `DataEntryForm.tsx`, `records/RecordsEditFormModal.tsx`, `src/services/lineItemsReport.ts`, `RecordDetailSheet` (Step 3 list shows فی), About.

- `LineItem` gains `unitPrice?: number` and `quantity?: number`; stored as `{n,a,q,p,c}` (`p` = unit price, `c` = numeric quantity). Keep `note` (`q`) as the free text; `quantity` is parsed from it when numeric (`parseItemQuantity`) or entered directly. `describeLineItems`: «موز ۲ کیلو × ۳۰۰٬۰۰۰ = ۶۰۰٬۰۰۰» when both exist, else today's format.
- `LineItemSheet` fields, in order: «نام قلم» (required), a two-column row «مقدار» (optional; text like «۵ کیلو» — digits parsed) and «فی» (optional, `AmountInput`), «مبلغ» (required). When `quantity` is numeric and `unitPrice > 0`, the amount auto-fills with `quantity × unitPrice` and shows a hint «= ۵ × ۲۸۰٬۰۰۰»; the user can overwrite it (stop auto-filling after a manual edit, like `amountFollowsItems`). The «مانده» tap still fills the amount.
- **Free total:** delete the blocking rule. `lineItemsMismatch` stays as a pure helper but `DataEntryForm` and `RecordsEditFormModal` no longer disable save and no longer show `LINE_ITEMS_BLOCKED_HINT`; remove the two quick-action buttons («مبلغ را X کن», «قلم سایر»). The sum line becomes informational and muted: «جمع اقلام X · ✓ با مبلغ یکی است» / «جمع اقلام X · D از مبلغ ریز نشده» (items < amount) / «جمع اقلام X · D بیشتر از مبلغ» (items > amount). The round-7.5 behavior "empty amount + first item → amount follows the items" stays.
- `lineItemsReport.ts`: prefer the explicit `unitPrice` for `ItemStat.unitPrice` and `priceChanges`; fall back to amount ÷ parsed quantity as today.
- Tests: round-trip of the new fields, `describeLineItems` with and without فی, auto-fill math (pure part extracted to `lineItemAmount(quantity, unitPrice)`), the report preferring the explicit unit price.
- About: update «ریز اقلام فاکتور» (فی, no sum requirement).

**Check:** screenshots of the item sheet with فی and of the muted sum line in both mismatch directions. **Commit:** `feature/ACCT-0/ACCT-0/Add a unit price to line items and stop blocking saves on the items total`.

## Step 6 — Settle sheet with account and duplicate check

Wireframe `round9-treasury-settle.html` phone 2. **Decision: duplicate window ±3 days, exact amount.** Files: new `src/components/settle/SettleSheet.tsx` (+ `SettleDuplicateCard.tsx`, `useSettleFlow.ts`), new `src/services/settleDuplicates.ts` (+ test), new `src/services/settleOptions.ts`, `services/paymentTransactions.ts`, `services/dang.ts`, `services/checks.ts`, `services/installmentsCrud.ts`, `services/receivablesCrud.ts`, `hooks/usePaidItemActions.ts`, `installments/useInstallmentPaymentActions.ts`, `receivables/useReceivablePaymentActions.ts`, `services/vehicleExpenseActions.ts` (duplicate check only), `localDataWipe.ts`, About.

- `settleOptions.ts`:
  ```ts
  export interface SettleOptions { date: string; walletAccount: string; walletApply: 'بله' | 'خیر'; linkRecordId?: string }
  export const SETTLE_LAST_ACCOUNT_KEY = 'accounting_settle_account_v1'   // per spreadsheet → ACCOUNT_KEYS; { expense?: accountId, income?: accountId }
  export function readLastSettleAccount(spreadsheetId: string, type: 'expense' | 'income'): string
  export function writeLastSettleAccount(spreadsheetId: string, type: 'expense' | 'income', accountId: string): void
  ```
- `settleDuplicates.ts`:
  ```ts
  export const SETTLE_DUPLICATE_DAYS = 3
  export function findSettleDuplicate(candidate: DuplicateCandidate, ledger: LedgerEntry[], linkedIds: Set<string>): LedgerEntry | null
  // matchesDuplicate with { dayTolerance: 3 } (no category, no createdWithin); skip entries whose id is in linkedIds
  // and entries whose title starts with «بدهی: », «چک: », «قسط: », «طلب: » (records this app created for another settlement);
  // newest first; prefer entries whose note === SMS_RECORD_NOTE
  export function describeDuplicate(entry: LedgerEntry, accounts: WalletAccount[]): string
  // «هزینهٔ ۳٬۰۰۰٬۰۰۰ از ملت، امروز ۱۰:۱۵ (ثبت از پیامک)»
  ```
  `linkedIds` = every `transactionRecordId` of the module's loaded items (dang list, checks list, installment payments, receivable payments) — the hook passes it.
- Service changes (all four): add a 4th/5th parameter `options?: SettleOptions`. When `options.linkRecordId` is set: **do not** create a record; store `transactionRecordId = options.linkRecordId`; do not touch the balance (the existing record already did, or the user chose not to). Otherwise pass `date`, `walletAccount`, `walletApply` into `createLinked…Record` and, when `walletAccount` is set and `walletApply === 'بله'`, move the balance with `settleEntryWallet(spreadsheetId, 'expense' | 'income', values, undefined, recordId)` where `values` is the same map the record was written with (extract a shared `createLinkedRecordWithWallet(spreadsheetId, type, params, options)` in `paymentTransactions.ts` so the four services call one function). `createdAt`/`paidAt` keep today's behavior; the record `date` = `options.date`.
- Unpay (dang, check, installment) and deleting a receivable payment: if the linked record's title starts with the module prefix («بدهی: » …) it was created by the app → delete it and reverse its balance effect (new `deleteLinkedRecordWithWallet`); otherwise it was **linked** → ask `ConfirmActionModal` «رکورد وصل‌شده هم حذف شود؟» with «نه، فقط جدا کن» (`onCancel`) / «حذف»; default keeps it.
- `SettleSheet` (`FormModal`, panel at xl): title «تسویهٔ «<title>» · <amount>» (checks: «پاس شدن چک <number>»; installments: «پرداخت قسط <n> از <count> · <plan title>»; receivables: «دریافت «<title>» · <amount>»). Body: `SettleDuplicateCard` when `findSettleDuplicate` found one («احتمالاً قبلاً ثبت شده — <describeDuplicate>» with «همان است، وصل کن» → sets `linkRecordId`, hides the account/balance fields, button becomes «وصل کن» / «فرق دارد، رکورد جدید» → dismisses the card); fields «تاریخ پرداخت» (`JalaliDatePicker`, default today), «از حساب» (`WalletAccountSelect`, default `readLastSettleAccount`, hint «آخرین انتخاب شما · «بدون حساب» = فقط رکورد»), «اثر بر موجودی» (`بله` default; hidden when no account). Primary «ثبت تسویه». On submit: `writeLastSettleAccount`, call the service with `options`, `haptic('light')`, toast as today.
- Wiring: `usePaidItemActions` gets a new option `settle?: { type: 'expense' | 'income'; titleFor(item): string; amountFor(item): number; dateFor?(item): string }`; when present, `handleTogglePaid(item, true)` opens the sheet instead of calling `togglePaid` directly, and `togglePaid` receives `options`. Same shape for `useInstallmentPaymentActions.handleTogglePayment` and `useReceivablePaymentActions.handleAddPayment` (the receivable payment form already asks for amount/title — add the account and duplicate card to that form rather than a second sheet). Vehicle expenses: show `SettleDuplicateCard` inside the existing vehicle expense form when a duplicate exists; «وصل کن» links the service to that record instead of creating one.
- Desktop: the same `FormModal` as a side panel; the duplicate card above the fields.
- Tests: `findSettleDuplicate` (±3 days inclusive, exact amount, linked ids skipped, prefix skipped, SMS note preferred, newest first), `describeDuplicate`, `settleOptions` storage per spreadsheet, `createLinkedRecordWithWallet` with/without account (mock the wallet helper), link mode creating no record, unpay branching by title prefix.
- About: dang, receivables, checks and installments entries mention the settle sheet («حساب و تاریخ پرسیده می‌شود؛ اگر همان مبلغ تازه از پیامک ثبت شده باشد، به آن وصل می‌شود»).

**Check:** Playwright with the mocked API: (a) a dang with no matching record → sheet without the duplicate card → «ثبت تسویه» creates a record with the account and the wallet balance drops; (b) an SMS-born expense of the same amount today → the card appears → «همان است، وصل کن» creates no record and the balance stays; (c) unpay after (b) → the confirm asks and «نه، فقط جدا کن» keeps the record. Screenshots mobile light/dark, desktop. **Commit:** `feature/ACCT-0/ACCT-0/Ask for the account and catch already-recorded payments when settling debts, checks, installments and receivables`.

## Step 7 — About, changelog, version

- Re-read the About entries touched in Steps 3–6 for accuracy.
- `aboutChangelog.ts`: version `2.6.0`, items: «جزئیات تراکنش با پیوست و ریز اقلام», «سود و زیان صندوقچه», «تسویه با انتخاب حساب و تشخیص پرداخت تکراری».
- Bump to 2.6.0.

**Commit:** `docs/ACCT-0/ACCT-0/Describe the round 9 polish in About and bump to 2.6.0`. Run `npm run build` once more, push, give the compare link.

## Acceptance (the owner checks these)

- No modal, sheet, picker, drawer or speed dial shows the page through it; the backdrop is a plain dark layer.
- In «قالب جدید» the account list opens fully inside the screen; Escape closes the list, a second Escape closes the sheet.
- Tapping a record opens its details; receipts are visible and open the viewer; «ویرایش»/«حذف» work from there.
- Vault cards show average cost, open P/L with percent and realized P/L from past sells; class headers and the stat card sum them; the report has the three columns.
- A line item can carry مقدار and فی, the amount auto-fills, and a record saves even when the items do not add up to the amount.
- Marking a debt, check, installment or receivable as paid asks for date and account, moves the wallet balance, remembers the account, and offers to link an existing same-amount record from the last ±3 days instead of creating a second one.
- All checks pass; size-limit under the limit; a11y suite light + dark passes.

## Out of scope (do not build)

FIFO cost basis, P/L for savings goals, tax lots, partial-amount settlements for dang/checks, automatic matching without asking, a detail sheet for modules that already expand in place, changing the bank-SMS matching rules.
