# UX Round 11 — Implementation Spec (building manager: one workspace per building)

Audience: the Claude agent that will implement this. The owner approved the direction over the six `round11-flow-*.html` wireframes (a 24-screen walkthrough); details marked **ask first** need the owner's answer before that step starts. Everything else is decided.

Rounds 1–9 precede this and must be **merged** first. Round 10 is **not** required. Wireframes: `round11-flow-1.html` (screens 1–4: personal drawer, empty home, the two-step building form), `round11-flow-2.html` (5–8: quick unit builder, home card, calm building dashboard, building drawer), `round11-flow-3.html` (9–12: units, residents, charges, expenses lists), `round11-flow-4.html` (13–16: fund, building debts, checks, counterparties), `round11-flow-5.html` (17–20: unit page, unit form with people, issue sheet, payment and receipt), `round11-flow-6.html` (21–24: full expense form, building bank SMS, reports and مجمع, building settings and exit). Index: `index.html`.

The spec is written step by step with exact names on purpose. Follow the steps in order; each step ends with a check and a commit.

## The one architectural decision (read first)

**Every building is its own spreadsheet («فضای کاری»).** The app already supports several spreadsheets (`settings.spreadsheets`, `setActiveSpreadsheet` in `src/services/settings.ts`, `activateSpreadsheet` in `src/services/spreadsheetSetup.ts`, every localStorage key per spreadsheet, backup / close-the-year / sharing / search per spreadsheet). A building spreadsheet uses the **same engine** (records with categories, subcategories, line items, attachments and counterparties; wallet accounts; receivables; dang; checks; recurring items; bank SMS; reports; activity log; conflicts) but a **different menu and dashboard**, selected by a workspace type marker. Nothing of the building ever touches the manager's personal spreadsheet: no shared counterparties, no fund money in the personal net-available, no building categories in personal reports, no building rows in the personal widget. Sharing a building with board members = Drive sharing of that one spreadsheet (round 8 writer/activity/conflicts apply as is).

Two deliberate **bridges** between a building and the manager's personal spreadsheet exist (Step 7); nothing else crosses.

## Project rules (mandatory)

- 300-line hard limit per staged file (`npm run lines`); extract rather than grow.
- Reuse before create: `useListFilters`, `FormModal` (+ `variant="panel"`), `ConfirmActionModal`, `DataTable`, `SettleSheet`/`useSettleFlow`, `createLinkedRecordWithWallet`, `findSettleDuplicate`, `useSheetImportExport`, `downloadTablePdf`, `saveExportFile`, `WalletAccountSelect`, `CounterpartySelect`, the recurring service, the record detail sheet, `WriterAvatar`, `logActivity`, the guide-card family, `createSpreadsheet` (`src/services/sheetsCreate.ts`), `DataEntryForm` and its standard fields.
- No tooling/config changes; **no new dependencies**.
- Commands that must pass before every commit: `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run lines`, `npx size-limit` (the flows e2e project arrives with round 10; cover the pure services with vitest). Prettier only on the files you changed.
- New sheet tabs follow the round-6 rules (`sheetNames.ts`, `sheetHeaders.ts`, `moduleSheetSpecs.ts`, `sheetSyncSheetNames.ts`, CSV, backup). New columns go at the end of the row.
- New localStorage keys: per spreadsheet and in `ACCOUNT_KEYS`, unless the step says "per device".
- Update About (new group «مدیر ساختمان» in `aboutFeatureGroupsBuilding.ts`) and `aboutChangelog.ts`. Bump the version (this round ships as **2.7.0**; round 10 then takes 2.8.0).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per step; branch `feature/ACCT-0/ACCT-0/ux-round-11` off `main`; no `gh` CLI; after push give the compare link.
- Commit messages end with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verify visually with the Playwright recipe (mobile 390×844, desktop 1440×900), light and dark; screenshots in the scratchpad `shots/r11/`.

## Facts about the code you will touch (read first)

- Spreadsheet catalog: `SPREADSHEET_TITLE_PREFIX = 'حسابداری · '`, `formatSpreadsheetTitle`, `isAccountingSpreadsheetTitle` in `src/services/spreadsheetCatalog.ts`; Drive listing `listAccountingSpreadsheetsFromDrive` (`drive.ts`) filters by that prefix; `SpreadsheetEntry { id, name, createdAt }` in `src/types/forms.ts`; creation `createSpreadsheet(title, forms)` in `sheetsCreate.ts` (seeds the record form tabs); first-run seeding of categories (`settingsCategoryLists.ts`, round-6 defaults), vault catalog, etc. happens lazily per tab.
- Switching: `activateSpreadsheet(spreadsheetId, previousId)` (`spreadsheetSetup.ts`) + the settings sheet-switch guard (`settings/useSheetSwitchGuard.ts`, `SheetSwitchConfirmModal.tsx`); the drawer user row shows «شیت: <label>» (round 5).
- Navigation: `Tab` union and groups in `src/components/layout/types.ts`, drawer groups in `navMenuGroups.ts` (round 5), bottom nav `LayoutBottomNav.tsx`, routes in `src/routes/paths.ts` / `AppRoutes.tsx` / `lazyPages.ts`; the dashboard is `DashboardPage` with block components (round 5).
- Per-spreadsheet settings tab: `PERIOD_SETTINGS_SHEET` («تنظیمات دوره», `کلید, مقدار, زمان ثبت`) — use it for the workspace type marker.
- Bank SMS: capture is per **device** (`BankSmsPlugin`, prefs `accounting_bank_sms`), the review queue reads wallet accounts' card digits to match (`bankSmsMatch`, `guessSampleAccount`), records go to the **active** spreadsheet. Counterparties carry bank accounts (`CounterpartyAccount` in `src/types/counterparties.ts`).
- Receivables: `Receivable { title, debtor, category, subCategory, amount, borrowDate, note, payments[] }`, `addReceivablePayment` (round-9 settle flow asks for the account). Dang (`Dang { title, counterparty, amount, paid… }`) = money the workspace owes.
- Records: standard fields (`category`, `subCategory`, `walletAccount`, `walletApply`, `counterparty`, `lineItems`, `note`) + attachments column; `DataEntryForm` renders extra blocks per category (the vehicle block is the precedent: `vehicleExpenses/VehicleExpenseFields.tsx` shown when category = «خودرو»).
- Widget snapshot (round 8) reads the active spreadsheet; the personal dashboard reads the active spreadsheet.

## Model

| Concept | Where it lives (inside the building spreadsheet) |
|---|---|
| Workspace type | «تنظیمات دوره» row `نوع فضا = ساختمان`; the spreadsheet title is «حسابداری · ساختمان <name>» so Drive listing still finds it |
| Building profile | new tab `BUILDING_SHEET = 'ساختمان'` (one row): `نام, نشانی, طبقات, شارژ پیش‌فرض, روش شارژ (fixed|area|people), روز صدور, سررسید (روز), شارژ واحد خالی (full|half|zero), زمان ویرایش` |
| Unit | new tab `BUILDING_UNITS_SHEET = 'واحدها'`: `شناسه, زمان ثبت, شماره, طبقه, متراژ, نفرات, پارکینگ, انباری, شارژ ماهانه, فعال, یادداشت` |
| Resident / owner | new tab `BUILDING_RESIDENTS_SHEET = 'ساکنان'`: `شناسه, زمان ثبت, شناسه واحد, طرف حساب, نقش (owner|tenant), تاریخ ورود, تاریخ خروج, فعال` — one row per person per stay; people are **counterparties of this spreadsheet** (name, phones, bank cards) |
| Fund | **all** wallet accounts of this spreadsheet (bank + cash); no flag needed |
| Monthly charge | a **receivable** per unit per month: `debtor` = current resident (vacant → owner), `category` «شارژ ساختمان» (system), `title` «شارژ <month> · واحد <no>», `amount`, `borrowDate` = due date; new last column `مرجع` on the receivables tab («charge:<unitId>:<YYYY-MM>» or «share:<unitId>:<recordId>») |
| Charge payment | receivable payment → income record into a fund account (round-9 settle flow) |
| Expense | a full **expense record** (category/subcategory from the building category list, line items, attachments, counterparty = contractor, recurring, duplicate check) + new last columns on the record tabs: `نوع هزینه` («جاری» \| «عمرانی»), `تقسیم` (JSON `{ mode: 'equal'\|'area'\|'people'\|'manual', shares: {[unitId]: amount}, charge: boolean }`), `پرداخت‌کننده` («صندوق» \| «مدیر») |
| Debt to the manager / contractor | **dang** rows (`counterparty` = «مدیر» or the contractor) — settled from the fund with the settle sheet |
| Other income | income records (parking, rooftop lease, bank interest, penalties) with the building income categories |
| Statement / receipt | computed from receivables + payments; rendered as text and PNG |

Default category lists for a building workspace (replace the personal defaults at creation): **expense** آسانسور (سرویس، تعمیر، بیمه) · نظافت (نظافتچی، مواد شوینده) · قبوض مشاعات (برق، آب، گاز) · تعمیرات (تأسیسات، ساختمانی، برق‌کشی، پمپ و مخزن) · حقوق سرایدار · بیمه ساختمان · عوارض و شهرداری · اداری (پرینت، پیک، کارمزد) · فضای سبز · ایمنی و اطفاء · انتقال [system] · سایر; **income** شارژ ساختمان [system] · پارکینگ مهمان · اجارهٔ مشاعات (پشت‌بام، آنتن، انباری) · سود سپرده · جریمه · کمک مالی · طلب [system] · سایر.

## Step 1 — Workspace type, building template, building navigation

Files: `src/services/workspace.ts` (new: `getWorkspaceType(spreadsheetId): 'personal' | 'building'`, `setWorkspaceType`, cached per spreadsheet in `accounting_workspace_v1` → `ACCOUNT_KEYS`, read from «تنظیمات دوره» on first sync), `src/services/buildingTemplate.ts` (new: `createBuildingSpreadsheet(name)` → `createSpreadsheet(formatSpreadsheetTitle('ساختمان ' + name), forms)` with the building forms (income/expense with the extra fields below), writes the type row, the building categories, the `ساختمان` profile row, and registers it in `settings.spreadsheets` with `kind: 'building'` — add `kind?: 'personal' | 'building'` to `SpreadsheetEntry`), `src/components/layout/types.ts` (+ tabs `building-dashboard`, `building-units`, `building-charges`, `building-expenses`, `building-fund`, `building-reports`, `building-settings`, `buildings-home`; `BUILDING_PRIMARY_NAV_TABS` for the bottom nav: بدهی · چک‌ها · شارژ · داشبورد · واحدها · هزینه‌ها · صندوق), `navMenuGroups.ts` (a second group set `buildingMenuGroups` used when the workspace type is `building`: «ساختمان» (داشبورد ساختمان، واحدها و ساکنان، شارژ، هزینه‌ها، صندوق), «تعهدات ساختمان» (بدهی به مدیر / پیمانکار = dang page, چک‌های ساختمان = checks page), «بیشتر» (طرف حساب‌های ساختمان, پیامک بانکی, گزارش‌ها و مجمع, تنظیمات ساختمان), «اپ» (درباره), and a fixed last row «↩ برگشت به حساب شخصی»), `LayoutMenuUserRow.tsx` (building name + role «مدیر» / «عضو» from round-8 sharing info), `Layout.tsx` (menu set by workspace type), `src/routes/*` (building routes; personal-only routes redirect to the building dashboard inside a building workspace and vice versa), `sheetNames.ts`/`sheetHeaders.ts`/`moduleSheetSpecs.ts`/`sheetSyncSheetNames.ts` (the three new tabs + the new columns), `protectedCategories.ts` (system «شارژ ساختمان», «انتقال», «طلب» in the building lists), `localDataWipe.ts`.

- Record form fields in a building workspace: the standard ones plus three standard fields injected by `withBuildingFields(forms)` (same pattern as `withWalletAccountField`): `expenseKind` («نوع هزینه», select جاری|عمرانی, expense only), `split` («تقسیم», text/JSON, expense only), `payer` («پرداخت‌کننده», select صندوق|مدیر, expense only). Personal workspaces never get them.
- Hidden in a building workspace: installments, treasury, vehicles, timesheets, savings goals, the personal onboarding wizard, personal nudges; the «تحلیل این ماه» budgets stay (budgets for building categories are useful).
- Widget (round 8) and the personal dashboard card (Step 7) read the **personal** spreadsheet only: `pushWidgetSnapshot` skips building workspaces.
- Tests: workspace type resolution, template contents (tabs, categories, type row), field injection only for building forms.

**Commit:** `feature/ACCT-0/ACCT-0/Add building workspaces with their own template, menu and record fields`.

## Step 2 — «مدیر ساختمان» home, entering and leaving a workspace

Wireframe screens 1–6 and 8 (`round11-flow-1.html`, `round11-flow-2.html`). The building form has **two steps** (screen 3: name, address, floors, unit count, your role; screen 4: fund accounts with card digits, default charge, method, issue day, due day, vacancy rule) and creates the spreadsheet only at the end of step 2, with a progress bar. Files: `src/components/buildings/BuildingsHomePage.tsx` (tab `buildings-home` «مدیر ساختمان» in the personal drawer group «بیشتر»), `BuildingWorkspaceCard.tsx`, `CreateBuildingSheet.tsx`, `ConnectBuildingSheet.tsx`, `useBuildingsHome.ts`, `src/services/buildingSummary.ts` (reads a building spreadsheet's `ساختمان`, `واحدها`, receivables and wallet tabs through the existing per-spreadsheet mirror without switching, for the card tiles; cached 10 min per spreadsheet in `accounting_building_summary_v1`).

- Home: one card per building workspace (from `settings.spreadsheets` with `kind: 'building'` plus Drive listing of titles «حسابداری · ساختمان …» not yet registered → shown under «اتصال به شیت موجود»): name, «<units> واحد · شما + N عضو» (round-8 sharing info), three tiles «بدهکار N واحد · X», «شارژ <month>: N از M · وصول P٪» (or amber «صادر نشده · روز D»), «صندوق X · N حساب». «ورود» = `activateSpreadsheet(buildingId, personalId)` then navigate to `building-dashboard`. «+ ساختمان جدید»: name, address, floors, default charge, method, issue day, due day, vacant rule → `createBuildingSpreadsheet`. «اتصال به شیت موجود»: paste a link or pick from the Drive list → registers with `kind: 'building'` (the type row must exist, else «این شیت ساختمان نیست»).
- Leaving: the last drawer row «↩ برگشت به حساب شخصی» = activate the personal spreadsheet (remembered in `accounting_personal_sheet` per device) and go to the dashboard. The sheet-switch guard (pending outbox) applies in both directions.
- The personal spreadsheet switcher in Settings keeps working; building sheets are listed there with a «ساختمان» badge.

**Check:** screenshots (home with two buildings, create sheet, drawer inside a building). **Commit:** `feature/ACCT-0/ACCT-0/Add the building manager home with workspace entry and exit`.

## Step 3 — Building dashboard, units and residents

Wireframe screens 5, 7, 9, 10 and 18 (`round11-flow-2.html`, `round11-flow-3.html`, `round11-flow-5.html`). The dashboard is deliberately calm (screen 7): one hero (fund), one charge line with a bar, «پیش رو» three rows, «این ماه» two links — no extra tinted cards. Files: `src/components/buildings/BuildingDashboardPage.tsx` (+ blocks: `BuildingIssueCard.tsx` (guide-card family: «شارژ <month> صادر نشده» from the issue day until issued), `BuildingFundHero.tsx` (Σ wallet accounts + «↑ X در <month> · وصول − هزینه»), `BuildingStatsRow.tsx` (debtors; building debts = open dang total with «به مدیر» share), `BuildingUpcomingBlock.tsx` (issue day, recurring items, checks — reuse `dashboardReminders` for checks/dang and add the issue and recurring rows), `BuildingExpensesBlock.tsx` (this month's expense records with category · kind · payer · 📎)), `BuildingUnitsPage.tsx` (tab `building-units` «واحدها», filters «بدهکار | خالی | طبقه ▾» + search via `useListFilters`), `BuildingResidentsPage.tsx` (tab `building-residents` «ساکنان», chips «همه | مالک | مستأجر | قبلی‌ها» — two separate pages, both in the drawer; the bottom nav holds «واحدها» only), `QuickUnitsBuilderSheet.tsx` (screen 5, shown once after creation: from/to number, units per floor, default area → creates the units in one outbox batch; «بعداً، دستی» skips), `UnitCard.tsx`, `UnitFormModal.tsx`, `ResidentRow.tsx`, `ChangeResidentSheet.tsx`, `src/services/buildingUnits.ts`, `buildingResidents.ts` (`currentResident(unitId)`, `currentOwner(unitId)`, `changeResident(unitId, person, role, fromDate, debtMode: 'keep' | 'to-owner' | 'forgive')` — closes the previous active stay with the exit date; `to-owner` re-points the unit's open receivables' `debtor`; `forgive` settles them with a zero-amount correction note «بخشودگی» and logs activity), tests.

- Unit card: number badge (red when open balance > 0), «<resident> · <role>» or «خالی» + «مالک: <owner>», «ط<floor> · <area> متر · <people> نفر · پارکینگ N · شارژ X · <N ماه | سهم عمرانی | پرداخت <date> از پیامک>», open balance or ✓; tap → Step 4 unit page. Unit form: number, floor, area, people, parking, storage, monthly charge (prefilled from the building method; editable), owner and resident pickers (`CounterpartySelect` of **this** spreadsheet with quick add: name, phone, bank card), note.
- Residents view: one row per active stay — avatar initial, name, «<role> · <phone> · واحد <no> · از <date>», ⋯ → call (`tel:`), SMS (`sms:`), open counterparty, «تغییر ساکن», «خروج» (sets the exit date; the unit becomes vacant). Change-resident sheet as drawn (debt choice only when open receivables exist).
- Desktop: units as `DataTable` + side panel; dashboard 12-col grid (reuse the round-5 dashboard grid classes).

**Check:** screenshots mobile light/dark, desktop. **Commit:** `feature/ACCT-0/ACCT-0/Add the building dashboard, units and residents`.

## Step 4 — Charges: issue, month cards, unit page, payment, receipt

Wireframe screens 11, 17, 19 and 20 (`round11-flow-3.html`, `round11-flow-5.html`). Files: `BuildingChargesPage.tsx` (tab `building-charges`), `ChargeMonthCard.tsx`, `ChargeMonthUnitsSheet.tsx`, `IssueChargesSheet.tsx`, `BuildingUnitPage.tsx` (tab `building-unit`, segments «صورت‌حساب | سابقه | ساکنان | مشخصات»), `UnitStatement.tsx`, `PaymentReceiptCard.tsx`, `src/services/buildingCharges.ts` (+ test), `buildingStatement.ts` (+ test), `buildingReceipt.ts` (+ test).

- `buildingCharges.ts`:
  ```ts
  export function unitCharge(profile, unit, units): number          // fixed: unit.monthlyCharge || defaultCharge; area/people: defaultCharge × share, rounded to 1,000; vacant: × 1 | 0.5 | 0 per profile.vacantRule
  export function chargeDebtor(unit, residents): { name: string; role: 'tenant' | 'owner' } | null   // active tenant → tenant; else active owner; null when neither (skipped, listed in the preview as «بدون ساکن و مالک»)
  export function chargeReference(unitId, monthKey): string
  export function planIssue(profile, units, residents, receivables, monthKey): { rows: { unit, debtor, basis, amount, already: boolean }[]; total: number }
  export async function issueCharges(spreadsheetId, plan, dueDate, note): Promise<number>   // one receivable per row not `already`, through the outbox; activity «شارژ <month> برای N واحد صادر شد»
  export function missingIssueMonths(profile, receivables, todayIso): string[]            // months on/after the issue day with no charge receivables, max 12 back
  export function unitBalance(unitId, receivables): { open: number; months: string[]; partial: boolean; lastPaidAt: string | null }
  ```
- Automatic issue: on the first app open on/after the issue day (after the first sync of that launch) for the **active building workspace only** (never silently for other workspaces); the dashboard card covers the rest.
- Month card: «<month> · صادر شده <date> · N واحد · سررسید <date>», billed, progress bar, «وصول X · N واحد مانده · M ناقص»; tap → the month's units with status (paid / partial / open) and a «ثبت پرداخت» per row.
- Unit page «صورت‌حساب»: statement text per the wireframe (charges and capital shares with «به نام مالک» when the debtor is the owner, paid items of the last 3 months, total, the fund account's card number); «ثبت پرداخت» = `useSettleFlow` on the unit's open receivables oldest-first (partial allowed; overflow rolls to the next receivable; account = a fund account, remembered; duplicate card checks SMS-born incomes ±3 days); after saving, `PaymentReceiptCard` («رسید پرداخت · <date> — واحد N · <name> · X بابت <months> · واریز به <account> · ماندهٔ بدهی Y») with «اشتراک رسید» (text) and «تصویر» (PNG via canvas like the round-7 year card). «اشتراک صورت‌حساب» and «یادآوری» share text (no SMS API).
- «سابقه» = receivables + payments; «ساکنان» = stays with dates; «مشخصات» = the unit form inline.
- Tests: `unitCharge` (three methods, vacancy rules, override), `chargeDebtor`, `planIssue` idempotency, payment allocation oldest-first with overflow and partial, statement and receipt text.

**Commit:** `feature/ACCT-0/ACCT-0/Issue monthly charges, show unit statements and share payment receipts`.

## Step 5 — Expenses: full record with kind, payer and split

Wireframe screens 12 and 21 (`round11-flow-3.html`, `round11-flow-6.html`). Files: `src/components/buildings/BuildingExpenseFields.tsx` (rendered by `DataEntryForm` inside a building workspace for expense forms, below the standard fields: «نوع» segment جاری|عمرانی, «پرداخت از» (`WalletAccountSelect` of the fund accounts **or** «جیب مدیر»), «تقسیم بین واحدها» (segment از صندوق|از واحدها, mode segment, «پیش‌نمایش ›» opens `ExpenseSplitPreviewSheet.tsx`)), `src/services/buildingExpenses.ts` (+ test: `splitExpense(amount, units, mode, manual?)` summing exactly; `shareDebtor(kind, unit, residents)` → جاری → resident, عمرانی → owner), `buildingExpenseActions.ts` (after the record is saved: when `split.charge` create one receivable per unit with reference «share:<unitId>:<recordId>», title «سهم <title> · واحد <no>», category «شارژ ساختمان», subcategory = جاری|عمرانی; when `payer = مدیر`, create a **dang** «<title>» with counterparty «مدیر» (and no wallet movement — the fund did not pay) and, optionally, the Step 7 bridge), `BuildingExpensesPage.tsx` (tab `building-expenses`: this month's expense records with category · kind · payer · split · 📎, month chip, speed dial «+ هزینه» → the entry form; tap → the record detail sheet, which shows the split table and the kind), `RecurringFormModal` (building fields when the workspace is a building), record edit/delete rules (editing the amount recomputes shares and updates **unpaid** share receivables; deleting asks about unpaid shares; paid ones stay).

- The entry form keeps everything the engine has: category/subcategory from the building list, line items with unit price, attachments, counterparty (contractor), recurring, duplicate warning — nothing is reimplemented.
- Tests: split modes and sum invariant, share debtor by kind, receivable creation idempotent on re-save, payer=مدیر creates a dang and moves no balance.

**Commit:** `feature/ACCT-0/ACCT-0/Record building expenses with kind, payer and a split across units`.

## Step 6 — Bank SMS inside a building: routing by card, charge matching

Wireframe screen 22 (`round11-flow-6.html`). Files: `src/services/bankSmsRouting.ts` (new, + test), `bankSmsQueue.ts` / `useBankSmsReview.ts` (queue filtered by routing), `bankSmsSuggest.ts` (new first rule for buildings), `BankSmsEntryCard.tsx` (unit suggestion line and unit picker), `buildingSmsMatch.ts` (+ test).

- **Routing:** captured SMS are device-level. `routeSmsToWorkspace(sms, workspaces)` matches the SMS's card/account digits against the wallet accounts of **every registered spreadsheet** (personal + buildings, from their local mirrors); the SMS appears only in the queue of the workspace that owns the card; unmatched cards stay in the personal queue (today's behavior). The settings sheet of each workspace shows which cards route to it.
- **Charge matching** (deposits to a fund account): candidates = units whose current debtor has a counterparty bank account with the same card digits as the SMS sender (when present) **and/or** whose open balance / monthly charge / a multiple ≤ 6 equals the amount. Card + amount → one suggestion «شارژ <month> · واحد N · <name>» and the primary button «ثبت پرداخت واحد N» (runs the Step 4 payment, oldest-first); amount only → the card shows a unit chip picker, primary disabled until a unit is picked; «ثبت همهٔ شناخته‌شده‌ها» (round 6) takes only card-matched ones. **Ask first:** whether amount-only matches with exactly one candidate may auto-confirm; default no.
- Withdrawals keep the round-6 suggestions (recurring items such as نظافت, then history).
- Tests: routing by card across two workspaces, candidate selection matrix (card+amount, amount only, multiple, none).

**Commit:** `feature/ACCT-0/ACCT-0/Route bank SMS by card to the right workspace and match deposits to unit charges`.

## Step 7 — Bridges to the manager's personal spreadsheet

Wireframe screens 14 and 24 (`round11-flow-4.html`, `round11-flow-6.html`). Files: `src/services/workspaceBridge.ts` (new, + test), `buildingExpenseActions.ts`, `BuildingUnitPage.tsx` payment flow, `BuildingDangPage` (the dang page in a building workspace gets the «به مدیر» section with «تسویه از صندوق»), personal `DashboardBuildingCard.tsx`, `localDataWipe.ts`.

- Bridge A — **paid from the manager's pocket:** always: expense record (payer «مدیر») + dang to «مدیر» in the building. Optional tick «در حساب شخصی من: طلب از «<building>»» (remembered per device in `accounting_bridge_prefs`): writes a receivable in the **personal** spreadsheet (debtor = the building name, category «طلب», note with the building record id) through that spreadsheet's outbox — `writeToWorkspace(spreadsheetId, operation)` in `workspaceBridge.ts` queues to another workspace's outbox without switching; its flush runs when that workspace is next active **or** immediately when online (the outbox lock is per spreadsheet, so this is safe). «تسویه از صندوق» on the dang: settle sheet with a fund account → in the building the dang closes with a linked expense «تسویه با مدیر»… **no**: the money already left the fund as the reimbursement, so the dang settlement creates the expense record «بازپرداخت به مدیر» (category اداری › بازپرداخت, payer صندوق) and marks the dang paid; the bridged personal receivable gets a payment (income into the manager's chosen personal account, asked once in the same sheet).
- Bridge B — **the manager's own unit:** on «ثبت پرداخت» for a unit whose current debtor is the manager (counterparty flagged «من» in the building — a checkbox on the counterparty form inside building workspaces), the settle sheet shows the tick «در حساب شخصی من: هزینهٔ «خانه › شارژ»» (remembered); when ticked, a personal expense record is written through the bridge with the same amount/date and note «شارژ واحد N · <building>».
- Failure rule: a bridged write that fails stays in the target workspace's outbox and is reported there («N تغییر در انتظار» in the sheet switcher); the originating write is never rolled back.
- Personal dashboard: `DashboardBuildingCard` (guide-card family, lowest priority) «<building>: N واحد بدهکار · شارژ <month> صادر نشده» read from `buildingSummary.ts`; tap → enters the workspace. Shown only on the 10th+ of the month when there is something to do; dismiss = this month.
- Tests: bridge queueing to another spreadsheet's outbox, both bridges' row shapes, the «من» flag, no rollback on failure.

**Commit:** `feature/ACCT-0/ACCT-0/Bridge manager pocket payments and the manager's own charge to the personal spreadsheet`.

## Step 8 — Fund, reports, مجمع, About, version

Files: `BuildingFundPage.tsx` (tab `building-fund`: the wallet page of this workspace with a building header — reuse `WalletPage` components; the hero shows Σ accounts, this month's «وصول − هزینه», 6-month trend), `BuildingReportsPage.tsx` (tab `building-reports`: billed vs collected per month (paired bars), expenses by category and by kind جاری/عمرانی (donut), debtor table (unit, name, months, amount), fund trend, debts to the manager; CSV/PDF «گزارش مجمع <year>» with the tables and the fund balance; the round-7 monthly report and year review run inside the workspace with building wording), building settings page (profile fields, vacancy rule, issue/due day, card routing list, members from round 8), global search inside a building covers units and residents, close-the-year works unchanged, About group «مدیر ساختمان» (what a workspace is, how to enter/leave, charges, expenses, SMS routing, the two bridges, sharing with the board), `aboutChangelog.ts` `2.7.0`: «مدیر ساختمان: فضای کاری جدا برای هر ساختمان», «شارژ، صورت‌حساب، رسید و تقسیم هزینه‌ها», «پیامک کارت صندوق و پل با حساب شخصی». Bump to 2.7.0.

**Commit:** `docs/ACCT-0/ACCT-0/Add the building fund and reports pages, describe the building manager in About and bump to 2.7.0`. Build, push, compare link.

## Acceptance (the owner checks these)

- Creating «ساختمان نرگس» makes a new spreadsheet with the building tabs and categories; the personal spreadsheet shows no new rows, categories, counterparties or accounts.
- Inside the building the drawer shows the building groups and «↩ برگشت به حساب شخصی»; installments/treasury/vehicles are absent; the personal dashboard, widget and net-available are unchanged.
- Issuing آبان for 12 units creates 12 receivables once (vacant unit to the owner at the vacancy rule); re-issuing creates none.
- A unit with three open months shows the red badge; its statement lists them; a payment settles the oldest first and produces a shareable receipt.
- An expense with category, two line items, an attached invoice photo, a contractor counterparty, kind «عمرانی» and split «از واحدها» creates one receivable per unit addressed to the **owner**; editing the amount updates only unpaid shares.
- An SMS from the fund card appears only in the building's queue; a deposit matching a resident's card proposes that unit; the manager's personal card SMS stays in the personal queue.
- A «جیب مدیر» expense creates a dang to the manager and, when ticked, a receivable in the personal spreadsheet; settling from the fund closes both.
- Sharing the building spreadsheet with a board member shows their avatar on rows and the activity feed (round 8) with no access to the manager's personal data.
- All checks pass; size-limit under the limit; a11y light + dark passes.

## Out of scope (do not build)

Sending SMS/WhatsApp from the app, resident logins or self-service, late fees/interest (manual «جریمه» income only), meeting votes, document storage beyond attachments, multi-currency, merging two building spreadsheets, moving a building into the personal spreadsheet.
