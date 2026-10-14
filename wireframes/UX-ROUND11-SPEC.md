# UX Round 11 — Implementation Spec (building management)

Audience: the Claude agent that will implement this. The owner approved the direction over `round11-building.html`; details marked **ask first** need the owner's answer before that step starts. Everything else is decided.

Rounds 1–9 precede this and must be **merged** first (this round builds on receivables, the settle sheet, recurring items, line items, counterparties, bank-SMS matching, shared spreadsheets and the activity log). Round 10 is **not** required and ships later. Wireframes: `round11-building.html` (list, units tab, residents tab), `round11-building-2.html` (charges tab, unit page, expenses tab, fund and report tabs). Index: `index.html`.

**Shape of the module (owner decision):** it mirrors «سرویس خودرو» — a drawer item «مدیر ساختمان» opens a **list of buildings**; a building opens a **detail page with tabs** («واحدها», «ساکنان», «شارژ», «هزینه‌ها», «صندوق», «گزارش»); rows open sheets; the speed dial holds the page's actions. Reuse the vehicle module's page skeleton (`VehicleListPage.tsx` / `VehicleDetailPage.tsx` / `VehicleDetailTabContent.tsx` and their hooks) as the pattern — copy the structure, not the code.

The spec is written step by step with exact names on purpose. Follow the steps in order; each step ends with a check and a commit.

## Project rules (mandatory)

- 300-line hard limit per staged file (`npm run lines`); extract rather than grow.
- Reuse before create: `useListFilters`, `FormModal` (+ `variant="panel"`), `ConfirmActionModal`, `DataTable`, `SettleSheet`/`useSettleFlow`, `createLinkedRecordWithWallet`, `findSettleDuplicate`, `useSheetImportExport`, `downloadTablePdf`, `saveExportFile`, `WalletAccountSelect`, `CounterpartySelect`, the recurring service, the round-9 record detail sheet, `WriterAvatar`, `logActivity`.
- No tooling/config changes; **no new dependencies**.
- Commands that must pass before every commit: `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run lines`, `npx size-limit`, (the flows e2e project arrives with round 10; until then cover the flows with vitest on the pure services). Prettier only on the files you changed.
- New sheet tabs follow the round-6 rules; every tab is covered by the full backup automatically and by the yearly close only if it is a ledger (Step 4 says which).
- New localStorage keys: per spreadsheet and in `ACCOUNT_KEYS`.
- Update About (new group «ساختمان» in a new file `aboutFeatureGroupsBuilding.ts`) and `aboutChangelog.ts`. Bump the version (this round ships as **2.7.0**; round 10 then takes 2.8.0).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per step; branch `feature/ACCT-0/ACCT-0/ux-round-11` off `main`; no `gh` CLI; after push give the compare link.
- Commit messages end with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verify visually with the Playwright recipe (mobile 390×844, desktop 1440×900), light and dark; screenshots in the scratchpad `shots/r11/`.

## What the user gets (summary)

A building manager keeps one or more buildings in the app: units with residents, a monthly charge («شارژ») per unit, automatic monthly receivables, payments (cash or matched from bank SMS), shared expenses split across units, a debtor list, a shareable statement per unit, and a yearly report for the residents' meeting. The building's money lives in a wallet account marked as the building fund, so every existing report, backup and share feature applies.

## Model (read first)

Everything is a thin layer over modules that exist. **No parallel ledger.**

| Concept | Storage |
|---|---|
| Building | new tab `BUILDINGS_SHEET = 'ساختمان'`: `شناسه, زمان ثبت, نام, نشانی, حساب صندوق (wallet account id), شارژ پیش‌فرض, روش شارژ (fixed|area|people), روز سررسید, فعال, یادداشت` |
| Unit | new tab `BUILDING_UNITS_SHEET = 'واحدها'`: `شناسه, زمان ثبت, شناسه ساختمان, شماره, طبقه, متراژ, نفرات, شارژ ماهانه, پارکینگ و انباری, فعال, یادداشت` — the owner and resident are **not** columns here; they come from the residents tab |
| Resident | new tab `BUILDING_RESIDENTS_SHEET = 'ساکنان'`: `شناسه, زمان ثبت, شناسه واحد, طرف حساب (counterparty name), نقش (owner|tenant), تلفن, تاریخ ورود, تاریخ خروج, فعال` — one row per person per stay; the current owner/resident of a unit = active rows; past stays keep their exit date |
| Monthly charge | a **receivable** (`RECEIVABLES_SHEET`) per unit per month: `debtor` = resident (or owner when empty), `category` = system category «شارژ ساختمان», `title` = «شارژ <month> · واحد <no>», `amount`, `borrowDate` = the due day; new last column on the receivables tab: `مرجع` («building:<buildingId>:<unitId>:<YYYY-MM>») so the app can find it and never create it twice |
| Payment | a receivable payment (round-9 settle sheet) → income record into the fund account; bank SMS matching (Step 5) proposes the unit |
| Shared expense | an **expense record** with system category «ساختمان» (subcategory = the expense kind), account = fund account, plus a new last column on the record tabs: `تقسیم` (JSON `{ b: buildingId, mode: 'equal'|'area'|'people'|'manual', shares: { [unitId]: amount }, charge: boolean }`); when `charge` is true, each unit's share becomes a receivable with `مرجع` = «building:<b>:<unit>:<recordId>» |
| Fund | an existing wallet account with `accountKind` «صندوق ساختمان» (a new wallet-account kind option; one per building) |
| Statement | computed: open receivables of the unit + payments; rendered as text and PNG |

System categories «شارژ ساختمان» (income) and «ساختمان» (expense) are added to `protectedCategories.ts`.

## Step 1 — Tabs, services, settings

Files: `sheetNames.ts`, `sheetHeaders.ts`, `moduleSheetSpecs.ts`, `sheetSyncSheetNames.ts`, `services/sheetHeaders.ts` (receivables + record tabs get their new last columns, read by label like «پیوست»), new `src/services/buildings.ts`, `buildingUnits.ts`, `buildingResidents.ts` (`currentResident(unitId)`, `currentOwner(unitId)`, `changeResident(unitId, person, role, fromDate, debtMode: 'keep' | 'to-owner')` — closes the previous active row with an exit date; `to-owner` re-points the unit's open receivables' `debtor` to the owner), `buildingCharges.ts` (pure month logic + test), `protectedCategories.ts`, `settingsCategoryLists.ts` (default lists get the two categories for new spreadsheets; existing ones through the round-6 «دسته‌های پیشنهادی» row), wallet account form (`accountKind` option «صندوق ساختمان»), `localDataWipe.ts`.

- `buildingCharges.ts`:
  ```ts
  export function unitCharge(building, unit): number           // fixed: unit.monthlyCharge || building.defaultCharge; area: defaultCharge × area / Σarea; people: defaultCharge × people / Σpeople — rounded to 1,000
  export function chargeReference(buildingId, unitId, monthKey): string
  export function missingChargeMonths(building, unit, receivables, todayIso): string[]   // months from the unit's first month (createdAt) to the current month that have no receivable with that reference; max 12 back
  export function unitBalance(unit, receivables): { open: number; months: string[]; lastPaidAt: string | null }
  export function splitExpense(amount, units, mode, manual?): Record<string, number>   // sums exactly to amount; remainder to the first unit
  ```
- Tests: every function; rounding; split sum invariant.

**Commit:** `feature/ACCT-0/ACCT-0/Add building, unit and charge services`.

## Step 2 — Buildings list, building detail with tabs «واحدها» and «ساکنان»

Wireframe `round11-building.html` phones 1–3. Files: new `src/components/buildings/` (`BuildingListPage.tsx`, `BuildingCard.tsx`, `BuildingFormModal.tsx`, `BuildingDetailPage.tsx`, `BuildingDetailHeader.tsx`, `BuildingDetailTabContent.tsx`, `BuildingUnitList.tsx`, `BuildingUnitCard.tsx`, `BuildingUnitFormModal.tsx`, `BuildingResidentList.tsx`, `BuildingResidentFormModal.tsx`, `ChangeResidentSheet.tsx`, `useBuildingsData.ts`, `useBuildingDetail.ts`, `useBuildingFilters.ts`, `types.ts`, `styles.ts`), tabs `buildings` («مدیر ساختمان», drawer group «بیشتر», Phosphor `buildings` icon) and `building-detail` (back → the list), paths `/buildings`, `/buildings/:id`, `/buildings/:id/units/:unitId` (Step 3), lazy routes, `navMenuGroups.ts`, `PageSpeedDial` config per tab, skeletons (list + detail).

- **List page:** one card per building — name, address, «N واحد · M طبقه», fund balance on the end, three tiles (`due2` style of the vehicle wireframe): «بدهکار: N واحد · X» (red when > 0), «شارژ <month>: N از M · وصول P٪» (amber «صادر نشده» before the issue day), «هزینهٔ <month>: X · N مورد». Archived buildings collapsed under «بایگانی‌شده». Empty state «ساختمانی تعریف نشده» → the form. Speed dial: «+ ساختمان», «بروزرسانی».
- **Building form:** name, address, floors, fund account (`WalletAccountSelect` filtered to kind «صندوق ساختمان», plus «ساخت حساب صندوق» inline when none exists), default charge, charge method (ثابت | متراژ | نفر), issue day 1–28, note. Archive = `active = false` (kept in reports).
- **Detail header hero:** fund balance, «شارژ <month>: N از M واحد · وصول X · ماندهٔ وصول Y». Tab chips: «واحدها N», «ساکنان N», «شارژ», «هزینه‌ها», «صندوق», «گزارش» (`detailTab` in the URL query like the vehicle page). ⋯ menu: edit building, archive.
- **Tab «واحدها»:** sub-filter chips «همه | بدهکار N | خالی N | طبقه ▾» + search (`useListFilters`). Row: number badge (red when open balance > 0), «<resident> · <role>» or «خالی» + «مالک: <owner>», «طبقه F · A متر · P نفر · شارژ X · <N ماه بدهکار | سهم <expense> | پرداخت <date> از پیامک>», open balance (red) or ✓. Tap → Step 3. Unit form: number, floor, area, people, monthly charge (prefilled from the building's method; editable), parking/storage text, note; owner and resident are picked here too (they write residents rows). Speed dial on this tab: «+ واحد», «صدور شارژ ماه», «+ هزینهٔ مشترک», «بروزرسانی».
- **Tab «ساکنان»:** one row per **person** (active residents rows): avatar initial, name, «<role> · <phone> · واحد <no> · از <entry date>», ⋯ (call/SMS via `tel:`/`sms:` links, open counterparty, «تغییر ساکن», «خروج»). Sorted by unit number. `ChangeResidentSheet`: new person (`CounterpartySelect` with quick add), role segment, from date, and — when the unit has open receivables — the debt choice «روی <old resident> بماند | به مالک منتقل شود» (`debtMode`). Previous stays are visible on the unit page (Step 3).
- «صدور شارژ ماه» opens the Step 4 preview sheet. Automatic issue: on the first app open on/after the building's issue day each month (after the first sync), for every active building — same code path, no UI; toast «شارژ آبان برای ۱۲ واحد صادر شد». Never twice (reference check). Writer column and activity log as usual.
- Desktop: list as cards (3 per row), detail as `DataTable` per tab + side panel.

**Check:** screenshots (list, units tab, residents tab, change-resident sheet) mobile light/dark, desktop. **Commit:** `feature/ACCT-0/ACCT-0/Add the buildings list and the building page with units and residents`.

## Step 3 — Unit page: statement, payment, history, residents, details

Wireframe `round11-building-2.html` phone 2. Files: `BuildingUnitPage.tsx` (tab `building-unit`, back → the building), `UnitStatement.tsx`, new `src/services/buildingStatement.ts` (+ test), `UnitPaymentFlow.ts` (reuse `useReceivablePaymentActions` + the settle sheet), `UnitHistory.tsx`, `UnitResidents.tsx`, `UnitDetails.tsx`.

- Four segments: «صورت‌حساب» (default), «سابقه» (the unit's receivables and payments, newest first), «ساکنان» (current + past stays with entry/exit dates, from the residents tab), «مشخصات» (the unit form inline). Stats on top: open balance (red), monthly charge.

- Stats: open balance, monthly charge. Statement card: «صورت‌حساب واحد <no> · <building>» with the date, one line per open receivable («شارژ مرداد ۱٬۲۰۰٬۰۰۰ · پرداخت‌نشده»), one per paid item in the last 3 months, «جمع بدهی», the fund account's card number (from the wallet account) — `buildStatementText(unit, receivables, account)` returns plain text; `UnitStatement` renders it and «اشتراک صورت‌حساب» shares it as text (`navigator.share` / Android share) and, with «تصویر», as PNG (canvas, same approach as the round-7 year card).
- «ثبت پرداخت»: the round-9 settle flow on the oldest open receivable(s): amount defaults to the full open balance and is applied oldest-first across receivables (partial payments allowed; a payment larger than one receivable settles the next), account defaults to the fund account, the duplicate card checks SMS-born incomes of the same amount (±3 days).
- «یادآوری»: opens the share sheet with a short text «سلام، شارژ واحد ۳ برای مرداد تا مهر (۳٬۶۰۰٬۰۰۰) پرداخت نشده. کارت صندوق: ۶۱۰۴…» — no SMS API, no new scope.
- Resident changes go through `changeResident` (Step 1): future charges use the new resident; open receivables follow `debtMode`.

**Check:** screenshots. **Commit:** `feature/ACCT-0/ACCT-0/Add the unit page with a shareable statement and payments`.

## Step 4 — Tab «شارژ» (issue preview, month cards), tab «هزینه‌ها» and the split

Wireframe `round11-building-2.html` phones 1 and 3. Files for the charges tab: `BuildingChargesTab.tsx`, `ChargeMonthCard.tsx`, `IssueChargesSheet.tsx`, `services/buildingCharges.ts` (`issueCharges(building, units, residents, monthKey, dueDate)` → receivables through the outbox; idempotent by reference). Month card: «<month> · صادر شده <date> · N واحد», billed amount, progress bar «وصول X · N واحد مانده»; tap → the month's units with status (paid / open / partial) and a «ثبت پرداخت» shortcut per row. Issue sheet: preview table (unit, basis = area/people/fixed, charge, total), due date (default = the building's issue day), «صدور برای N واحد»; units already issued for that month are listed greyed and skipped.

Files for the expenses tab: `BuildingExpenseSheet.tsx` (+ `ExpenseSplitTable.tsx`), `src/services/buildingExpenses.ts` (+ test), entry form integration (`DataEntryForm`: when category = «ساختمان», show the building block: building select, split mode segment, the split table, the «از صندوق | از واحدها» segment), `vehicleExpenseActions.ts`-style action file `buildingExpenseActions.ts`, record detail sheet (shows the split).

- Saving an expense with category «ساختمان»: account defaults to the fund; the `تقسیم` column stores the split; when «از واحدها» is chosen, one receivable per unit is created (reference «building:<b>:<unit>:<recordId>», title «سهم <expense title> · واحد <no>», category «شارژ ساختمان»). Editing the amount recomputes the split and updates **unpaid** receivables only; deleting the record asks whether to delete its unpaid receivables (paid ones stay).
- Recurring shared expenses (نظافت ماهانه): the round-6 recurring item carries the building fields (`تقسیم` JSON copied into the posted record) — add the block to `RecurringFormModal` when the category is «ساختمان».
- Tab «هزینه‌ها»: the building's expense records (category «ساختمان») in the selected month, newest first, meta «<split mode> · از صندوق | از واحدها · N واحد»; tap → the round-9 record detail sheet (shows the split table); month chip at the top; speed dial «+ هزینهٔ مشترک» opens the entry form with the building block prefilled.

**Check:** tests (issue idempotency, split modes, receivable creation idempotent on re-save, edit/delete rules); screenshots of the charges tab, the issue sheet, the expenses tab and the split sheet. **Commit:** `feature/ACCT-0/ACCT-0/Issue monthly charges and split shared building expenses across units`.

## Step 5 — Bank SMS matching for charges

Files: `src/services/bankSmsSuggest.ts` (round 6 rule order gets a new first step), `BankSmsEntryCard.tsx` (suggestion line «شارژ واحد ۳ · احمدی ▾»), `buildingSmsMatch.ts` (+ test).

- Rule: an incoming deposit SMS to the fund account whose amount equals one unit's charge (or a multiple ≤ 6, or that unit's open balance) and, when the SMS carries a sender card/account, whose card digits match the resident counterparty's saved account → suggest «پرداخت شارژ واحد <no>»; confirming runs the Step 3 payment on that unit (no manual form). Several candidate units → the card shows a unit picker. **Ask first** if the owner wants matching without card digits (amount only) to auto-confirm in «ثبت همه شناخته‌شده‌ها»; default: amount-only matches need a tap.

**Commit:** `feature/ACCT-0/ACCT-0/Match fund deposits from bank SMS to unit charges`.

## Step 6 — Tabs «صندوق» and «گزارش», dashboard, notifications

Wireframe `round11-building-2.html` phone 4. Files: `BuildingFundTab.tsx` (the fund account's ledger from `walletLedger.ts` filtered to that account: charge incomes, shared expenses, manual deposits/withdrawals; hero with the balance and «↑ X این ماه · وصول − هزینه»; a 6-month balance trend using the round-5 single-bar chart), `BuildingReportTab.tsx` + `reports/BuildingReportPage.tsx` (tab `report-building`, «گزارش ساختمان», also reachable from «گزارشات»), `services/buildingReport.ts` (+ test), dashboard guide card `DashboardBuildingCard.tsx` («N واحد بدهکار · X مانده» on the 10th of the month when any; guide-card family, dismiss = this month), nightly digest line («ساختمان نرگس: ۳ واحد بدهکار»), the round-7 monthly PDF gets a section when a building exists, the year review gets «وصول شارژ سال: X · هزینه‌های مشترک: Y».

- Report tab/page: period filter; billed vs. collected per month (paired bars, reuse `IncomeExpenseMonthlyChart` style), shared expenses by subcategory (donut, reuse `CategoryDonutChart`), debtor table (unit, resident, months, amount), fund balance trend; CSV/PDF «گزارش مجمع» with the three tables and the fund balance.

**Commit:** `feature/ACCT-0/ACCT-0/Add the building report, dashboard card and digest line`.

## Step 7 — Desktop, search, close-the-year, About, version

- Desktop: building page as table + side panel; unit page two columns.
- Global search: units (by number, resident, owner) and buildings.
- Close-the-year wizard (round 7): shows «شارژهای باز سال» count; receivables are already covered by the opening-balance step — no new step.
- About: group «ساختمان» (what it is, fund account, charges, statement, split, SMS matching, report); changelog `2.7.0`: «مدیریت ساختمان: واحدها، شارژ ماهانه، صورت‌حساب», «تقسیم هزینه‌های مشترک», «گزارش مجمع». Bump to 2.7.0.

**Commit:** `docs/ACCT-0/ACCT-0/Describe building management in About and bump to 2.7.0`. Build, push, compare link.

## Acceptance (the owner checks these)

- Defining a building with 12 units and running «شارژ این ماه» creates 12 receivables once; running it again creates none.
- A unit with three unpaid months shows the red badge, its statement lists the three months, and sharing it produces the text with the card number.
- Recording a payment settles the oldest receivables first and lands as an income in the fund account.
- A shared expense «از واحدها» creates one receivable per unit summing exactly to the amount; editing it updates unpaid shares only.
- A deposit SMS matching a unit's charge proposes that unit; confirming records the payment.
- The building report shows billed vs. collected per month and a debtor table; the PDF exports.
- All checks pass; size-limit under the limit; a11y light + dark passes.

## Out of scope (do not build)

Sending SMS/WhatsApp from the app, resident self-service or logins, parking/storage fees as separate entities (use the unit's charge or a shared expense), vote/meeting management, document storage beyond the round-7 attachments, multi-currency, interest or late fees (ask the owner later if wanted).
