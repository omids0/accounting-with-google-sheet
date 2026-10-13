# UX Round 7.5 — Implementation Spec (line items and counterparties on records)

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers.

This is a small round between 7 and 8, requested by a user after testing. It needs **round 7 merged** (it reuses the «پیوست» column pattern and adds a line to the round-7 monthly report). Wireframes: `round7-5-line-items.html` (entry form), `round7-5-reports.html` (lists and reports). Index: `index.html`.

The spec is written step by step with exact names on purpose. Follow the steps in order; each step ends with a check and a commit. Do not start the next step while the current one fails a check.

## Project rules (mandatory)

- 300-line hard limit per staged file (`npm run lines`); when a file you touch would pass 300, move a piece into a new file next to it instead of growing it.
- Reuse before create. Everything you need exists; the step lists what to reuse.
- No tooling/config changes (`vite.config.ts`, `scripts/`, `tools/`, hooks, ESLint, Prettier, tsconfig, `package.json` scripts, size-limit). **No new dependencies.**
- Commands that must pass before every commit: `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run lines`, `npx size-limit`. Prettier only on the files you changed (`npx prettier --write <files>`), never on folders.
- Update About (`src/components/about/aboutFeatureGroupsEntry.ts` for entry/records, `aboutFeatureGroupsCore.ts` for reports) and add the version's entry to `src/components/about/aboutChangelog.ts` (max 3 items). Bump `version` in `package.json` and the two root `version` lines in `package-lock.json` (this round ships as **2.4.0**; round 8 then becomes 2.5.0).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per step; branch `feature/ACCT-0/ACCT-0/ux-round-7-5` off `main`; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...feature/ACCT-0/ACCT-0/ux-round-7-5?expand=1`.
- Commit messages end with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verify visually with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md` (mobile 390×844, desktop 1440×900), light and dark. Save screenshots in the scratchpad `shots/r7-5/`.

## What the user gets (summary)

1. On income and expense records, an **optional** «طرف حساب» field using the same counterparty list as checks, dang and receivables.
2. On income and expense records, **optional** «ریز اقلام» (invoice line items): name, amount, optional quantity/note. When at least one item exists, the items must sum to the record amount; otherwise nothing changes.
3. Records list: a «☰ N» badge and a one-line item summary for records with items; a counterparty chip when set; two new filters («طرف حساب», «با اقلام»).
4. Reports: a new **«اقلام»** report (main), an item page per item name, and a new **«طرف حساب‌ها»** report; the counterparty detail gets a «تراکنش‌ها» tab; the monthly report gets one line.
5. Global search finds item names.

Records without items or counterparty look and behave exactly as today.

## Data model (read first)

Both features are **standard fields** of income/expense forms, injected the way «زیردسته» and «حساب» already are (`src/components/form/fieldUtils.ts` → `withSubCategoryField`, `withWalletAccountField`, composed in `withStandardFields` in `src/services/settings.ts`). A standard field gets its own header column automatically (`buildHeaders` in `src/services/sheetsHeaders.ts`), is read back by label (`buildFieldColumnMap`), and rides along in CSV export/import, archive tabs and the full backup without extra work. Existing sheets get the new columns appended at the end on the next write (the same mechanism that appended «حساب»).

| Field id | Header label | Type | Stored value |
|---|---|---|---|
| `counterparty` | «طرف حساب» | `select`, `required: false`, `options: []` | the counterparty **name** (same as checks/dang/receivables store it: `Check.counterparty` is a name) |
| `lineItems` | «اقلام» | `text`, `required: false` | JSON array, compact: `[{"n":"کیوی","a":320000,"q":"۲ کیلو"},{"n":"خیار","a":230000}]`; empty string when there are no items |

Constants (add to `src/components/form/fieldUtils.ts`, export from `src/components/form/index.ts` like the others):

```ts
export const COUNTERPARTY_FIELD_ID = 'counterparty'
export const COUNTERPARTY_FIELD_LABEL = 'طرف حساب'
export const LINE_ITEMS_FIELD_ID = 'lineItems'
export const LINE_ITEMS_FIELD_LABEL = 'اقلام'
```

Add both ids to `OPTIONAL_ENTRY_FIELD_IDS` and to `STANDARD_FIELD_ORDER` (order: …, `walletAccount`, `walletApply`, `counterparty`, `lineItems`, `note`). Add them to `RECORD_SKIP_FIELDS` in `src/services/globalSearchEntries.ts` is **not** wanted for `counterparty` (it should be searchable); add only `lineItems` there and index its names explicitly (step 7).

Line-item utilities — new file `src/utils/lineItems.ts` (pure, unit-tested):

```ts
export interface LineItem { name: string; amount: number; note?: string }
export function parseLineItems(raw: string | undefined): LineItem[]        // tolerant: '' → [], bad JSON → []
export function serializeLineItems(items: LineItem[]): string              // [] → ''
export function sumLineItems(items: LineItem[]): number
export function normalizeItemName(name: string): string                    // normalizeSearchText + collapse spaces + trim; used as the grouping key
export function parseItemQuantity(note: string | undefined): { value: number; unit: string } | null
// accepts «۲ کیلو», «1.5 kg», «۳ عدد», «۲ لیتر»; digits via normalizeDigits; unit = the rest, trimmed; null when no leading number
export function describeLineItems(items: LineItem[]): string               // «کیوی ۲ کیلو ۳۲۰٬۰۰۰ · موز ۴۵۰٬۰۰۰» (formatMoney for amounts)
```

## Step 1 — Fields, utilities, tests (no UI yet)

Files: `src/components/form/fieldUtils.ts` (+ a new `src/components/form/fieldUtilsStandard.ts` if `fieldUtils.ts` would exceed 300 lines), `src/services/settings.ts` (`withStandardFields` adds `withCounterpartyField` and `withLineItemsField`), `src/utils/lineItems.ts`, `src/utils/lineItems.test.ts`, `src/components/form/entryFieldRules.test.ts` (extend).

- `withCounterpartyField(forms)` and `withLineItemsField(forms)`: same shape as `withWalletAccountField` — only `income`/`expense` forms, add once, never required.
- `isStandardEntryForm` must still return true for the default forms with the two new fields.
- Tests: field injection (added once, optional, order), every `lineItems.ts` function (empty, bad JSON, Persian/Latin digits in `parseItemQuantity`, `normalizeItemName` folding ي/ی ك/ک ZWNJ and double spaces, `describeLineItems` formatting).

**Check:** `npm test`, `npm run types`. Open the entry form in the browser: the two fields appear as a plain select and a plain text input (ugly, but working); saving writes two new columns at the end of the «هزینه» tab. **Commit:** `feature/ACCT-0/ACCT-0/Add counterparty and line-item fields to income and expense forms`.

## Step 2 — Entry form UI

Wireframe `round7-5-line-items.html` phones 1–4. Files: `src/components/dataEntry/StandardEntryFormFields.tsx` (route the two field ids to custom renderers; keep the file under 300 lines by putting the renderers in new files), new `src/components/dataEntry/EntryCounterpartyField.tsx`, `src/components/dataEntry/EntryLineItemsField.tsx`, `src/components/dataEntry/LineItemSheet.tsx`, `src/components/dataEntry/useLineItemsEditor.ts`, styles in `src/components/ui/lineItemStyles.ts`.

**«طرف حساب»** (`EntryCounterpartyField`): render the existing `CounterpartySelect` (`src/components/form/CounterpartySelect.tsx`) exactly as `CheckFormModal.tsx` does, including quick-add (`allowManage`), with placeholder «انتخاب کن…» and a small «اختیاری» hint; a ✕ clears it. Load the counterparty list with the hook the checks page uses (`useCounterpartiesData` or its data loader — look at `ChecksPage.tsx`), once per form mount. Auto-suggest: when the user picks a category and the title field is non-empty, look up the newest record in the local mirror with the same `category` + `title` and a counterparty; prefill it (only if the field is still empty; the user can clear it). Pure helper `suggestCounterparty(records, category, title): string` in `src/services/recordCounterparty.ts`, tested.

**«ریز اقلام»** (`EntryLineItemsField`):
- No items → one dashed row «+ ریز اقلام فاکتور · اختیاری» (phone 1). Tap → `LineItemSheet` (phone 2).
- `LineItemSheet` = `FormModal` (bottom sheet on mobile, `variant="panel"` at xl): title «قلم N» + «از مبلغ X · Y مانده» where Y = amount − sum of items so far (hidden when the amount field is empty). Fields: «نام قلم» (text, with a chip row of up to 6 suggestions = most frequent item names of the same category in the last 6 months, from the local mirror, via `suggestItemNames(records, category): string[]` in `recordLineItems.ts`, tested), «مبلغ» (reuse `AmountInput`), «مقدار / توضیح» (text, optional). Buttons: «افزودن و قلم بعدی» (adds, clears the sheet, focuses the name) and «افزودن و بستن». Tapping the «مانده» text fills the amount with the remainder. Enter in the amount field = «افزودن و قلم بعدی». Validation: name non-empty, amount > 0.
- With items → the list (phone 3): name + note, amount, ✕; row tap opens the sheet in edit mode; «+ قلم جدید»; a sum line: green «جمع اقلام X · ✓ با مبلغ یکی است» or red «جمع اقلام X · D کمتر/بیشتر از مبلغ».
- Mismatch (phone 4): the form's save button is disabled and a red hint «تا جمع اقلام با مبلغ یکی نشود ذخیره نمی‌شود» shows; two quick actions: «مبلغ را X کن» (sets the amount field) and «قلم «سایر» D اضافه کن» (only when items sum < amount; adds `{ name: 'سایر', amount: D }`).
- Amount empty + first item added → the amount field is filled with the items sum and keeps following the sum until the user edits the amount by hand (track a `amountFollowsItems` flag in the editor hook).
- The editor hook keeps `LineItem[]` in React state and writes `serializeLineItems(items)` into the form value `lineItems` on every change, so the existing save path stores it unchanged. Edit form (`RecordsEditFormModal.tsx`) uses the same `StandardEntryFormFields`, so it gets both fields for free — verify.
- Hidden when the form is opened from a bank SMS? **No** — items are allowed there too. The «پرتکرار» template chips (round 6) do not carry items or counterparty.
- Desktop (≥1280): the sheet becomes the side panel; the item list is the same component. Keyboard: Tab order name → amount → note → buttons; Escape closes the sheet (round-5 rules apply automatically through `FormModal`).
- Haptics: `haptic('light')` on add.

Save rule in `DataEntryForm.tsx` submit handler (and the edit modal): if `parseLineItems(values.lineItems).length > 0` and `sumLineItems !== parseNumericField(values.amount)`, block with the hint above (never a toast). Put the rule in `src/components/form/entryFieldRules.ts` as `lineItemsMismatch(values): number | null` (returns the difference or null) with tests.

**Check:** all commands; screenshots of the four states (mobile light + dark) and the desktop form with the panel open. **Commit:** `feature/ACCT-0/ACCT-0/Enter invoice line items and a counterparty in the entry form`.

## Step 3 — Records list and filters

Wireframe `round7-5-reports.html` phone 1. Files: `src/components/records/RecordsListRow.tsx` (+ new `RecordsListRowMeta.tsx` if needed), `useRecordsFilters.ts`, `RecordsToolbar.tsx`, `FilterModal` usage in the records page, `recordsExport.ts`, `src/components/table/` columns for the desktop table (round-5 `DataTable`).

- Row: when `parseLineItems(record.values.lineItems).length > 0`, show a badge «☰ N» after the title (reuse the badge style used for «📎 N» from round 7) and, inside the expanded card body, one muted line `describeLineItems(items)`. When `record.values.counterparty` is set, append a small chip with the name to the meta line (after the account).
- Filters: «طرف حساب» (a `CounterpartyFilterSelect` fed by the distinct counterparty names in the loaded records; value `all` by default) and a toggle chip «با اقلام» — both in the records filter modal and shown as active chips (`ActiveFilterChips`). Implement them inside `useRecordsFilters.ts`; keep that file under 300 lines (extract `recordsFilterPredicates.ts` with pure predicates + tests).
- Desktop table: two optional columns «طرف حساب» and «اقلام» (count), sortable.
- CSV/PDF export (`recordsExport.ts`): add «طرف حساب» and «اقلام» (the `describeLineItems` text) after «توضیحات», before «پیوست».
- Search deep link from round 6 (`/records?record=<id>`) must still open the record.

**Check:** screenshots (mobile light/dark, desktop). **Commit:** `feature/ACCT-0/ACCT-0/Show line items and counterparties in the records list with filters`.

## Step 4 — «اقلام» report and item page

Wireframe `round7-5-reports.html` phones 2–3. Files: new `src/components/reports/LineItemsReportPage.tsx`, `src/components/reports/lineItems/` (sub-components + `useLineItemsReport.ts`), new `src/services/lineItemsReport.ts` (pure aggregation, tested), tab/route registration: `src/components/layout/types.ts` (`Tab` union, `REPORT_TABS`, label «اقلام» → id `report-line-items`; and `report-line-item` for the item page, label «قلم»), `src/routes/paths.ts` (`/reports/line-items`, `/reports/line-items/:name`), `src/routes/lazyPages.ts`, `src/routes/AppRoutes.tsx`, the reports group in `src/components/layout/navMenuGroups.ts`.

`lineItemsReport.ts`:

```ts
export interface ItemStat { key: string; name: string; count: number; total: number; average: number; topCategory: string; unitPrice?: { value: number; unit: string } }
export function aggregateLineItems(records: RecordInput[], range: DateRange, type: 'income' | 'expense' | 'all'): { items: ItemStat[]; withItemsTotal: number; withoutItemsTotal: number; recordCount: number; itemCount: number }
export function priceChanges(current: ItemStat[], previous: ItemStat[]): { key: string; name: string; from: number; to: number; unit: string; pct: number }[]
// unitPrice = total amount / total quantity for items whose notes parse with the same unit; priceChanges keeps items present in both months with |pct| ≥ 5
export function itemHistory(records: RecordInput[], key: string, months = 12): { month: string; total: number; count: number }[]
export function similarItemNames(allKeys: string[], key: string): string[]  // same name after removing spaces, or one contains the other (min length 3)
```

Group by `normalizeItemName(name)`; display the most frequent original spelling.

**Report page** (`/reports/line-items`, title «گزارش اقلام», back to reports): `ReportToolbar` with the standard date filter (default month-to-date, presets as other reports); `TransactionTypeSegment` (هزینه default | درآمد | همه); a search input (`PageSearchInput`) over item names; summary card «هزینه با ریز اقلام · <period>» with the total, «N٪ هزینه‌ها · R رکورد · I قلم · W بدون اقلام»; list sorted by total (sort menu: جمع | دفعات | میانگین) with a thin share bar (reuse `CategoryShareList` row style from round 5); section «گران‌تر از ماه قبل» (only for month presets, from `priceChanges`); CSV/PDF via the speed dial like other reports (`exportReportCsv` pattern of the category tree report). Empty state when no record in the range has items: «برای رکوردها ریز اقلام بزن تا این گزارش پر شود» with a button to the entry form (`EmptyState` component).

**Item page** (`/reports/line-items/:name`, name = the normalized key, URL-encoded; title = display name): header card «۱۲ ماه اخیر» total, «N بار · ماهی ~X · بیشتر از <top counterparty>»; a 12-bar monthly chart (reuse the single-bar chart from `/charts` «خالص ماهانه»); «رکوردهایی که این قلم را دارند» rows (date badge, title, «qty · item amount از record amount · counterparty», tap → `/records?record=<id>`); «نام‌های مشابه» rows that link to their own item page (**no merge this round**; display only).

Desktop: the report list as a `DataTable` (name, count, average, total, category), item page two-column.

**Check:** tests for every function in `lineItemsReport.ts` on a fixture with Persian/Latin spellings, units and two months; screenshots. **Commit:** `feature/ACCT-0/ACCT-0/Add the line-items report and item pages`.

## Step 5 — «طرف حساب‌ها» report and the counterparty «تراکنش‌ها» tab

Files: new `src/components/reports/CounterpartiesReportPage.tsx` + `src/services/counterpartiesReport.ts` (pure, tested); tab `report-counterparties` («طرف حساب‌ها»), path `/reports/counterparties`; `src/components/counterparties/CounterpartyDetailModal.tsx` (+ new `CounterpartyRecordsTab.tsx`).

- `aggregateByCounterparty(records, range, type)` → `{ name, count, total, share, topCategory }[]` sorted by total, plus `withoutTotal`. Records with an empty counterparty are counted only in `withoutTotal`.
- Page: toolbar + type segment like step 4; summary card «هزینه با طرف حساب · <period>» (total, «N٪ · W بدون طرف حساب»); rows with share bars; tap a row → records page filtered to that counterparty (`/records?counterparty=<name>` — add this query param to the records page filters from step 3). CSV/PDF.
- Counterparty detail: a new tab «تراکنش‌ها» next to the existing ones, listing that counterparty's records (newest first, 50, «بیشتر»), with totals income/expense at the top. Also show two counts on the counterparty card («N تراکنش») only when > 0.
- The round-5 counterparty nudge (`detectRepeatedCounterparty` in `nudgeSignals.ts`): count the record `counterparty` value too, so a name typed three times on records triggers «… را به طرف حساب‌ها اضافه کنم؟». Only when the name is not already in the list (unchanged rule).

**Check:** tests; screenshots. **Commit:** `feature/ACCT-0/ACCT-0/Add the counterparties report and a records tab on counterparty details`.

## Step 6 — Monthly report line and search

Files: `src/services/monthlyReport.ts` / `monthlyReportPdf.ts` (round 7), `src/services/globalSearchEntries.ts`, tests.

- Monthly report (round 7 Task C): one line under the budget bars: «بیشترین خرید از: <top 3 counterparties by expense total> · پرتکرارترین قلم: <top item by count>»; omitted entirely when the month has neither.
- Global search: `recordEntries` adds the item names (`parseLineItems(values.lineItems).map(i => i.name)`) and the counterparty to the record's `text`; the result subtitle shows «· ☰ N» when items exist. Keep `lineItems` raw JSON out of the generic `words` list (add it to `RECORD_SKIP_FIELDS`).

**Check:** tests. **Commit:** `feature/ACCT-0/ACCT-0/Mention top counterparties and items in the monthly report and search`.

## Step 7 — About, changelog, version

- `aboutFeatureGroupsEntry.ts`: two features «ریز اقلام فاکتور» (how to add, the sum rule, what happens without items) and «طرف حساب روی تراکنش» (optional, same list, auto-suggest, filter).
- `aboutFeatureGroupsCore.ts` reports group: «گزارش اقلام» and «گزارش طرف حساب‌ها»; counterparties group: the «تراکنش‌ها» tab.
- `aboutChangelog.ts`: version `2.4.0`, items: «ریز اقلام فاکتور روی هزینه و درآمد», «طرف حساب اختیاری روی تراکنش‌ها», «گزارش اقلام و گزارش طرف حساب‌ها».
- Bump to 2.4.0 (`package.json` + two `package-lock.json` root lines). Update `UX-ROUND8-SPEC.md`: its version becomes 2.5.0.

**Commit:** `docs/ACCT-0/ACCT-0/Describe line items and counterparties in About and bump to 2.4.0`. Then run `npm run build` once more and push; give the compare link.

## Acceptance (the owner checks these)

- A record saved with no items and no counterparty produces a row identical to before plus two empty trailing cells.
- Entering three items that sum to the amount saves; a mismatch blocks with the hint and both quick actions work; deleting all items returns the dashed row.
- Records list shows «☰ 3», the summary line and the counterparty chip; both filters work on mobile and desktop; CSV has the two new columns.
- `/reports/line-items` lists items grouped across spellings (e.g. «موز» and «موز » are one row); the item page opens; the empty state appears on a month without items.
- `/reports/counterparties` lists totals with share; the counterparty detail has the «تراکنش‌ها» tab.
- Search «کیوی» finds the record.
- All checks pass; size-limit under the current limit; a11y suite light + dark passes.

## Out of scope (do not build)

Merging similar item names, item-level budgets, items on checks/dang/receivables, item barcode/photo, price history charts beyond the 12-bar chart, counterparty ids (names are stored, like the other modules).
