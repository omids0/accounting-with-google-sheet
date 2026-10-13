# UX Round 10 — Implementation Spec (open debts, stability, vehicle rework)

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers.

Rounds 1–9 precede this and must be **merged** first. Three parts: **A** closes decisions left open in rounds 6–7.5, **B** adds flow tests and a better start for new users, **C** reworks the vehicle module after a code audit (nine bugs, three of them corrupt data). Wireframes: `round10-vehicle.html` (C), `round10-onboarding.html` (B2). Part A and B1 have no wireframe. Index: `index.html`.

The spec is written step by step with exact names on purpose. Follow the steps in order; each step ends with a check and a commit. Do not start the next step while the current one fails a check.

## Project rules (mandatory)

- 300-line hard limit per staged file (`npm run lines`); when a file you touch would pass 300, move a piece into a new file next to it.
- Reuse before create. Everything you need exists; each step says what to reuse.
- No tooling/config changes except what this spec approves: **Step A1** adds the npm dependency `send-intent@6.0.3` and an `ACTION_SEND` intent filter in `AndroidManifest.xml`; **Step A3** edits `scripts/google-apps-script/RemindersCron.gs`; **Step B1** adds one Playwright project in `playwright.config.ts` (`accounting-flows`, `testMatch: '**/flows/*.spec.ts'`) and nothing else. No other config file changes.
- Commands that must pass before every commit: `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run lines`, `npx size-limit`. Prettier only on the files you changed, never on folders.
- New sheet tabs/columns follow the round-6 rules (`sheetNames.ts`, `sheetHeaders*.ts`, `moduleSheetSpecs.ts`, `sheetSyncSheetNames.ts`, CSV, backup). New columns go at the **end** of the row.
- New localStorage keys: per spreadsheet and in `ACCOUNT_KEYS` in `src/services/localDataWipe.ts`.
- Update About (`src/components/about/aboutFeatureGroups*.ts`) and `aboutChangelog.ts` (max 3 items). Bump `version` in `package.json` and the two root lines in `package-lock.json` (this round ships as **2.7.0**).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per step; branch `feature/ACCT-0/ACCT-0/ux-round-10` off `main`; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...feature/ACCT-0/ACCT-0/ux-round-10?expand=1`.
- Commit messages end with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Android is built by GitHub Actions only; Java/XML changes are reviewed by reading. List every Android file you touch in the final report.
- Verify visually with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md` (mobile 390×844, desktop 1440×900), light and dark; screenshots in the scratchpad `shots/r10/`.

## Facts about the code you will touch (read first)

- Share target (round 6 A4): web path `routeSharedText` in `src/services/bankSmsShare.ts`; launch routing in `src/hooks/useLaunchAction.ts` (`parseLaunchUrl` in `services/launchAction.ts`); Android deep links `com.omids0.accounting://…` in `android/app/src/main/res/xml/shortcuts.xml`; `MainActivity.java` registers local plugins.
- Vault catalog: `BUILTIN_VAULT_ASSETS` in `src/services/treasuryCatalog.ts` (seeded on first run by `seedVaultCatalog`); tgju keys in `src/services/tgju.ts` / `tgjuCurrency.ts`; the existing endpoint already returns `crypto-*-irr` keys (verified 2026-10-12: `crypto-tether-irr`, `crypto-bitcoin-irr`, `crypto-ethereum-irr`, `crypto-binance-coin-irr`, `crypto-ripple-irr`, `crypto-tron-irr`, `crypto-solana-irr`, `crypto-dogecoin-irr`, `crypto-toncoin-irr`, `crypto-cardano-irr`, `crypto-litecoin-irr`, `crypto-usd-coin-irr`; rial, so ÷10 like the others).
- Web push: the Apps Script cron `scripts/google-apps-script/RemindersCron.gs` reads the spreadsheet (`findInstallmentReminders_`, `findCheckReminders_`, `findVehicleDeadlineReminders_` …) and posts to the Cloudflare worker (`postToWorker_`), which only sends (`workers/reminder-push/src/index.ts`). Budget alerts today exist only in the Android nightly digest (`src/services/budgetDigest.ts` → `BankSms.setDigestNotes`). Budgets tab `BUDGETS_SHEET = 'بودجه'` (`دسته, مبلغ ماهانه, زمان ویرایش`); expense records are in the «هزینه» tab (and custom expense forms).
- Item names: `src/services/lineItemsReport.ts` (`similarItemNames`, `aggregateLineItems` grouping by `normalizeItemName`), item page under `/reports/line-items/:name`.
- E2E: `e2e/helpers/mockAppState.ts` (`mockGoogleApis`, `seedMockAppState`, `mockAppSeed.json`), existing projects in `playwright.config.ts` (`accounting-pwa-a11y` → `**/a11y.spec.ts`, `accounting-nav-perf`). Preview port must not be 4173 for ad-hoc runs.
- Onboarding: `src/components/onboarding/` (`OnboardingWizard.tsx`, `onboardingSteps.ts`, steps `wallet | accounts | entry | sms`), state in `src/services/onboarding.ts` (`OnboardingState { status, steps, closedAt }`). About: `src/components/about/AboutPage.tsx` (accordion over `aboutFeatureGroups*.ts`, `AboutFeatureGroup { id, title, icon, summary, features[] }`), `aboutChangelog.ts`. Budgets: `hooks/useCategoryBudgets`, `components/budgets/BudgetSheet.tsx`. Recurring: `services/recurring.ts`, `settings/RecurringFormModal.tsx`.
- Vehicle module (audited; line numbers from the merged `main`):
  - Types `src/types/vehicles.ts`: `VehiclePeriodicService { serviceType, currentMileage, intervalKm, nextKm, brand, location, amount, notes, expenseRecordId, active, reminderEnabled, reminderThresholdKm }`, `VehicleDeadline { category, startDate, endDate, amount, notes, expenseRecordId, active, reminderEnabled, daysBefore }`, `VehicleMechanicVisit { date, mileage, location, totalAmount, items: {category, note}[], notes, expenseRecordId }`, `VehicleHistoryEntry { recordKind, referenceId, date, mileage, nextKm, details, amount, expenseRecordId }`, `VehicleExpenseMeta { expenseRecordId, vehicleId, expenseType, fuelPricePerLiter, fuelLiters, mileage }`.
  - Headers `src/services/sheetHeadersVehicle.ts` (`VEHICLE_PERIODIC_HEADERS` … 15 columns; `VEHICLE_DEADLINE_HEADERS` 12; `VEHICLE_MECHANIC_HEADERS` 10; `VEHICLE_HISTORY_HEADERS` 11; `VEHICLE_EXPENSE_META_HEADERS` 8). Services: `vehiclePeriodicServices.ts`, `vehicleDeadlines.ts`, `vehicleMechanicVisits.ts`, `vehicleHistory.ts`, `vehicleProfiles.ts`, `vehicleActions.ts` (`syncVehicleMileage`, `completePeriodicService`, renew), `vehicleExpenses.ts` (`createVehicleExpense`, `deleteVehicleExpense`), `vehicleExpenseActions.ts`, `vehicleExpenseRecords.ts` (meta tab), `vehicleTransactions.ts` (transactions tab + fuel stats), `vehicleDashboardReminders.ts`, `vehicleDetailExport.ts`. Pure helpers `src/components/vehicles/utils.ts` (`calculateNextKm`, `getUrgencyFromKm/Days`, `shouldShowVehicle*Reminder`, `buildPeriodicListItem`, `buildDeadlineListItem`, `sortActiveItems`, `shouldPromptMileageUpdate`, `validateMileageIncrease`). UI under `src/components/vehicles/` (`VehicleDetailPage.tsx`, `VehicleDetailTabContent.tsx`, `VehicleActiveItemCard.tsx`, `VehiclePeriodicFormModal.tsx`, `VehicleDeadlineFormModal.tsx`, `VehicleMechanicFormModal.tsx`, `VehicleCompleteModal.tsx`, `VehicleMileageModal.tsx`, `vehicleDetailMutations.ts`, `vehicleDetailFormInitialValues.ts`, `useVehicleDetail.tsx`, `useVehicleDetailModalActions.tsx`, `useVehiclesData.ts`) and `src/components/vehicleExpenses/` (`VehicleExpenseFields.tsx`, `VehicleSelect.tsx` — the vehicle block inside the entry form).
  - Round 9 pieces to reuse: `SettleSheet`/`useSettleFlow` (`src/components/settle/`), `createLinkedRecordWithWallet` (`services/paymentTransactions.ts`), `findSettleDuplicate` (`services/settleDuplicates.ts`), line items on records (`utils/lineItems.ts`, `dataEntry/EntryLineItemsField.tsx`), the record detail sheet.

---

## Part A — Open decisions from earlier rounds

### Step A1 — Android share intent (round 6 A4, approved package)

Files: `package.json` / `package-lock.json` (`send-intent@6.0.3`), `android/app/src/main/AndroidManifest.xml` (intent filter `android.intent.action.SEND` with `mimeType="text/plain"` on `MainActivity`), `src/services/shareIntentNative.ts` (new), `src/hooks/useLaunchAction.ts`, `src/services/launchAction.ts` (+ test), About.

- On native, on launch and on every `appUrlOpen`/`resume`, call `SendIntent.checkSendIntentReceived()`; when it returns text, run it through the same `routeSharedText` path as the web share target (prefilled entry form or the «پیامک ناشناخته» flow), then `SendIntent.finish()` so the intent is consumed once. Pure `parseLaunchUrl` gains a `{ kind: 'share', text }` result for this source; test it.
- iOS is **not** touched (owner decision, 2026-10-11).
- About (platform group): the share entry now says Android shares arrive from any app's «اشتراک‌گذاری» menu.

**Check:** web build unchanged; `npm test`. **Commit:** `feature/ACCT-0/ACCT-0/Receive shared bank SMS text from other Android apps`.

### Step A2 — Crypto prices from tgju

Files: `src/services/treasuryCatalog.ts` (`BUILTIN_VAULT_ASSETS` + the seed/upgrade path that appends missing built-ins), `treasuryCatalog.test.ts`, About.

- Add built-in assets, class `crypto`, `priceSource: 'tgju'`, 8 decimals, unit «واحد»: تتر `crypto-tether-irr`, بیت‌کوین `crypto-bitcoin-irr`, اتریوم `crypto-ethereum-irr`, بایننس‌کوین `crypto-binance-coin-irr`, ریپل `crypto-ripple-irr`, ترون `crypto-tron-irr`, سولانا `crypto-solana-irr`, دوج‌کوین `crypto-dogecoin-irr`, تون‌کوین `crypto-toncoin-irr`, کاردانو `crypto-cardano-irr`, لایت‌کوین `crypto-litecoin-irr`, یواس‌دی‌کوین `crypto-usd-coin-irr`. Ids `crypto-<name>` (stable, never renamed).
- Existing spreadsheets get the new rows through the same "append missing built-ins" path round 6 used; user-created manual crypto assets are left alone (no automatic merge; the About text says the user can deactivate their manual one).
- No new network host; `fetchTgjuPrices` already prices every catalog tgju key.

**Check:** tests for seeding on an empty and an existing catalog. **Commit:** `feature/ACCT-0/ACCT-0/Price built-in crypto assets from tgju`.

### Step A3 — Budget alerts on the web (push)

Files: `scripts/google-apps-script/RemindersCron.gs` (approved), `src/services/budgetDigest.ts` (share the thresholds), `src/components/reminders/` (the rule list gets a `budget` rule, default on, time = the nightly digest time), `services/reminderRules*.ts`, About.

- Cron: new `findBudgetReminders_(ss, rule)` — reads «بودجه» and this Jalali month's expense rows (the «هزینه» tab and custom expense forms; reuse the cron's existing Jalali helpers `jdnToJalali_` …), sums per category, and for each category with a budget emits «<دسته> به ۸۰٪ بودجه رسید» (≥ 80 %) or «<دسته> از بودجه گذشت» (> 100 %). Reference `budget_<category>_<YYYY-MM>_<80|100>` so `wasAlreadySent_` fires each once per month (same mechanism as the other rules). Sent through `sendReminders_` at the rule's time.
- App: rule kind `budget` in the reminder rules UI («هشدار بودجه») so the user can turn it off; the Android digest path keeps working unchanged.
- Keep the 80/100 thresholds in one place for the app (`budgetDigest.ts` exports them) and document them at the top of the `.gs` function (the script cannot import).

**Check:** unit test for the app-side rule; the `.gs` is reviewed by reading (no runtime here) — add a small pure JS copy of the summation to `budgetDigest.test.ts` so the logic is tested at least once. **Commit:** `feature/ACCT-0/ACCT-0/Send budget alerts as web push through the reminder cron`.

### Step A4 — Merge similar item names

Files: `sheetNames.ts` (`ITEM_ALIASES_SHEET = 'نام_اقلام'`), `sheetHeaders.ts` (`ITEM_ALIASES_HEADERS = ['نام', 'نام اصلی', 'زمان ثبت']`), `moduleSheetSpecs.ts`, `sheetSyncSheetNames.ts`, new `src/services/itemAliases.ts` (+ test), `src/services/lineItemsReport.ts`, the item page (`/reports/line-items/:name`), Settings «دسته‌ها» (a small «نام‌های اقلام» card listing aliases with delete), About.

- Alias = `normalizeItemName(name) → canonical key`. `aggregateLineItems` and the item page apply aliases before grouping (records are **not** rewritten). The item page's «نام‌های مشابه» rows get «ادغام» → `ConfirmActionModal` ««موز ممتاز» از این به بعد زیر «موز» شمرده می‌شود» → writes the alias row; «جدا کن» on the alias list removes it.
- Suggestions: `similarItemNames` stays the source; max 5 shown.

**Check:** tests (alias applied in aggregation, cycle-safe: alias of an alias resolves once). **Commit:** `feature/ACCT-0/ACCT-0/Merge similar line-item names in the items report`.

---

## Part B — Stability and the first ten minutes

### Step B1 — User-flow e2e tests

Files: `playwright.config.ts` (approved: one project `accounting-flows`, `testMatch: '**/flows/*.spec.ts'`, same `webServer`/`use` as the a11y project), new `e2e/flows/*.spec.ts`, `e2e/helpers/mockAppState.ts` (extend `mockGoogleApis` so `values:append` / `values:batchUpdate` are recorded into an in-memory sheet model that later `batchGet` calls return — a small `MockSheets` class in `e2e/helpers/mockSheets.ts`, unit-tested with vitest in `src/test/` only if trivial, otherwise tested by the specs themselves).

Six specs, each self-contained, mobile viewport, service worker blocked:
1. `entry.spec.ts` — save an expense with category, account and two line items; it appears in records; the wallet balance dropped; the detail sheet (round 9) shows the items.
2. `settle.spec.ts` — create a dang, mark it paid through the settle sheet with an account; a linked expense exists; unpay deletes it; with a same-amount SMS-born record the duplicate card appears and «وصل کن» creates no record.
3. `recurring.spec.ts` — create a reminder-mode recurring item; the dashboard card lists it on the 1st; «ثبت همه» posts it once; a second visit posts nothing.
4. `backup.spec.ts` — full backup downloads a zip with `manifest.json`; restore in «ادغام» mode reports skipped ids.
5. `search-reports.spec.ts` — global search finds a record by item name and by amount; `/reports/line-items` lists it; the counterparties report lists its counterparty.
6. `conflict.spec.ts` — an outbox update against a row whose «ثبت‌کننده» is another email parks and shows the conflict sheet; «نگه دار» on «نسخهٔ من» flushes.

Rules: no `waitForTimeout`; assert on text and on the mock sheet model; each spec ≤ 150 lines; shared fixtures in `e2e/flows/fixtures.ts`. The pre-push hook already runs Playwright when `e2e/` changes — keep the suite under 3 minutes locally.

**Check:** `npx playwright test --project accounting-flows` green 3× in a row. **Commit:** `test/ACCT-0/ACCT-0/Add end-to-end tests for the main user flows`.

### Step B2 — Onboarding steps, About search, three-minute guide

Wireframe `round10-onboarding.html`. Files: `src/components/onboarding/onboardingSteps.ts` (+ `OnboardingBudgetStep.tsx`, `OnboardingRecurringStep.tsx`), `src/services/onboarding.ts` (`OnboardingStepId` + `'budget' | 'recurring'`), `OnboardingWizard.tsx`, `OnboardingProgress.tsx`, `src/components/about/AboutPage.tsx` (+ `AboutSearch.tsx`, `aboutSearch.ts` pure + test, `AboutQuickGuide.tsx`), `services/launchAction.ts` (`/about?guide=1`), About.

- Wizard order: `wallet → accounts → entry → budget → recurring → sms (Android) → summary`. Each new step has «بعداً». **Budget step:** the three default expense categories with the largest «typical share» (fixed list: خوراک, خانه, حمل‌ونقل) with an amount field each; saving writes through `useCategoryBudgets`. **Recurring step:** two optional rows (حقوق = income, اجاره = expense) with title, amount, day of month, account; saving creates `RECURRING_SHEET` rows in reminder mode. Existing users (status `finished`) never see the wizard again unless they reopen it from About.
- About: a search field at the top (`normalizeSearchText` over `title + description` of every feature, plus the group title); results show «گروه › ویژگی» with the menu path line taken from a new optional `path?: string` on `AboutFeature` (fill it for every feature while you are there, e.g. «تنظیمات › دسته‌ها»); tap → expands that group and scrolls to the feature (`?highlight=` style). Group headers show the feature count.
- «راهنمای سه‌دقیقه‌ای» card at the top of About: five full-screen cards (ثبت، پیامک بانکی، تسویه، گزارش‌ها، پشتیبان), each one sentence from the existing About copy and a Phosphor icon; «بعدی/قبلی/بستن»; a «ویزارد شروع را دوباره باز کن» link that sets onboarding status back to `active` for the current spreadsheet.
- About feature entries: platform group «راهنما و جستجو».

**Check:** screenshots of both new wizard steps and the About search with results (mobile light/dark). **Commit:** `feature/ACCT-0/ACCT-0/Add budget and recurring onboarding steps, About search and a short guide`.

---

## Part C — Vehicle module rework

Wireframe `round10-vehicle.html`. Audit findings are listed where they are fixed; every one must be covered by a unit test or an e2e assertion.

### Step C1 — Data model: one service record with km and/or time

Files: `src/types/vehicles.ts`, `src/services/sheetHeadersVehicle.ts` (append columns), `vehiclePeriodicServices.ts`, `vehicleDeadlines.ts`, new `src/services/vehicleDue.ts` (pure, tested), `src/components/vehicles/utils.ts` (reduce to re-exports where logic moved), `vehicleDashboardReminders.ts`, `scripts/google-apps-script/RemindersCron.gs` (`findVehiclePeriodicReminders_`, `findVehicleDeadlineReminders_` read the new columns; approved).

- `VehiclePeriodicService` gains, appended at the end of `VEHICLE_PERIODIC_HEADERS`: `dueMode: 'km' | 'time' | 'both'` («حالت_موعد»), `intervalMonths: number` («فاصله_ماه»), `lastDoneDate: string` («تاریخ_آخرین»), `nextDate: string` («تاریخ_بعدی»). Old rows: `dueMode = 'km'`, dates `''`.
- `VehicleDeadline` keeps its tab but is now read as a service with `dueMode = 'time'`: add `intervalMonths` («فاصله_ماه», default 12) so «تمدید» rolls the dates forward. (One UI, two tabs — do not migrate rows.)
- `vehicleDue.ts`:
  ```ts
  export interface DueState { remainingKm: number | null; remainingDays: number | null; urgency: 'overdue' | 'soon' | 'ok'; nextKm: number | null; nextDate: string | null }
  export function computeDue(item: { dueMode, nextKm, nextDate, reminderThresholdKm, daysBefore? }, vehicleMileage: number, todayIso: string): DueState
  // urgency = worst of the two parts that apply: km overdue when remainingKm < 0, soon when ≤ 500 (or the item's threshold); time overdue when remainingDays < 0, soon when ≤ 30
  export function nextAfterDone(item, doneKm: number, doneDate: string): { nextKm: number | null; nextDate: string | null }
  // km: doneKm + intervalKm; time: addMonthsJalali(doneDate, intervalMonths) clamped to the last day of the month
  export function shouldRemind(due: DueState, item): boolean   // reminderEnabled && (km part ≤ threshold || time part ≤ daysBefore)
  ```
- `formatDueTiles(due)` → the two tiles of the wireframe («۳۰۰ km گذشته · بعدی ۵۵٬۰۰۰», «۴ ماه مانده · تا ۲ اسفند»).
- Fix: zero settings no longer fall back to defaults (`daysBefore` 0 and `reminderThresholdKm` 0 are valid; use `Number.isFinite` checks instead of `|| default`) — in the services and in the `.gs`.
- Cron: periodic reminders get reference `vehicle_periodic_<id>_<YYYY-MM-DD of first overdue/soon day>` so they fire once, not daily; deadline reminders fire when `remainingDays <= daysBefore` (not only on the exact day) with reference `vehicle_deadline_<id>_<endDate>`.
- Tests: `computeDue` matrix (km only, time only, both: km fine/time overdue, both fine), `nextAfterDone` month clamping (31 → 30/29), `shouldRemind`, zero thresholds.

**Commit:** `feature/ACCT-0/ACCT-0/Let vehicle services be due by distance, by time or by both`.

### Step C2 — Completion, renewal and the mileage prompt (fixes the data-corrupting bugs)

Files: `src/services/vehicleActions.ts`, `vehicleExpenses.ts`, `src/components/vehicles/VehicleCompleteModal.tsx`, `vehicleDetailFormInitialValues.ts`, `useVehicleDetail.tsx`, `useVehicleDetailModalActions.tsx`, `VehicleMileageModal.tsx`, `VehicleDeadlineFormModal.tsx`, `vehicleDetailMutations.ts`.

- **Bug 1 (deletes the previous expense):** `completePeriodicService` must **never** call `deleteVehicleExpense(previousExpenseId)`. The previous record stays; the history row keeps pointing at it. Remove the `wallet` spread that came from the deleted record.
- **Bug 2 («انجام شد» keeps the old next-km):** `buildCompleteInitialValues` defaults `mileage` to the **vehicle's current mileage**, `date` to today, `isHistorical` false. `isHistorical` becomes true only when the user picks a past date, and then the mileage field allows a lower value than the current one (validation via `validateVehicleMileageEntry(..., { isHistorical: true })`). `nextKm`/`nextDate` always come from `nextAfterDone(item, mileage, date)`.
- Completion UI (wireframe phone 2): the `VehicleCompleteModal` becomes a `SettleSheet` flavor: date, current mileage, the due-mode segment with `intervalKm` / `intervalMonths`, optional amount, account (round 9 `useSettleFlow`, remembered account), the duplicate card (`findSettleDuplicate`, type expense, ±3 days). Saving creates the expense through `createLinkedRecordWithWallet` (category «خودرو», subcategory = service type, note = brand · location · notes, vehicle meta row with `expenseType = serviceType` and `mileage`), patches the service (`currentMileage`, `lastDoneDate`, `nextKm`, `nextDate`, `expenseRecordId`), writes the history row, and moves the vehicle mileage forward only when `!isHistorical && mileage > vehicle.mileage`.
- **Deadline renewal** («تمدید»): same sheet; on save `startDate = date`, `endDate = addMonthsJalali(date, intervalMonths)`, amount → expense (category «خودرو», subcategory = deadline category, e.g. «بیمه») with account; history row. Validation: `endDate > startDate`; the form no longer defaults `endDate` to today.
- **Bug 3 (mileage prompt loop):** `useVehicleDetail` effect must depend on a `promptDismissedFor` state (the `lastMileageUpdate` value it was dismissed for) instead of `showMileageModal`; closing stores that value, so the prompt returns only after the next interval. Submitting an unchanged mileage still updates `lastMileageUpdate` (make `syncVehicleMileage` write the date even when the mileage is equal; it only refuses a **lower** mileage) and writes **no** duplicate mileage row when the value did not change.
- Profile form: allow correcting the mileage downward behind a confirm «کارکرد کمتر از قبل است؛ غلط تایپی را اصلاح می‌کنی؟» (writes a mileage history row with `details = 'اصلاح'`).
- Tests: `completePeriodicService` on a fake sheet (previous expense untouched, next computed from the done values, history row written), prompt gating, `syncVehicleMileage` equal/lower/higher.

**Commit:** `bugfix/ACCT-0/ACCT-0/Keep previous service expenses, compute the next due from the completion and stop the mileage prompt loop`.

### Step C3 — Mechanic invoices become expense records with line items

Wireframe `round10-vehicle.html` phone 3. Files: `src/components/vehicleExpenses/VehicleExpenseFields.tsx` (+ new `VehicleServicesDoneField.tsx`), `src/services/vehicleExpenseActions.ts`, `vehicleExpenseRecords.ts` (meta row gains nothing; the record's line items carry the parts), new `src/services/vehicleMechanicMigration.ts` (+ test), delete `VehicleMechanicFormModal.tsx` and the mechanic tab after migration, `vehicleTransactions.ts`, About.

- The vehicle block in the entry form (shown when category = «خودرو») gets: subcategory «مکانیک» as a normal option, the existing vehicle + mileage fields, and — when the vehicle has active services — a checklist «کدام سرویس‌ها انجام شد؟» (each active service with its due tile). Saving the record with ticked services runs the Step C2 completion for each ticked service with `linkRecordId = this record` (no second expense, no second balance move), `mileage` = the form's mileage, `date` = the record date, amount 0 on the service (the money is on the record). Line items (round 7.5) hold the parts; the counterparty field holds the garage.
- Legacy visits («مکانیک» tab): one-time migration on first open of the vehicle page after this version: each visit → an expense record (date, amount, title «مکانیک — <vehicle>», category «خودرو › مکانیک», line items from `items[]` with amount 0, note = location · notes, meta row with mileage), `expenseRecordId` written back on the visit row and a marker in `accounting_vehicle_mechanic_migrated_v1` (per spreadsheet → `ACCOUNT_KEYS`); visits that already have an `expenseRecordId` are skipped. The tab stays for backup/audit but the UI no longer reads it; `deleteVehicleMechanicVisit` and `VehicleMechanicFormModal` are removed.
- Record detail sheet (round 9): for records with vehicle meta, show «خودرو · کارکرد» and the services completed by this record (history rows whose `expenseRecordId` matches).

**Commit:** `feature/ACCT-0/ACCT-0/Record mechanic invoices as expenses with line items that complete services`.

### Step C4 — Transactions tab, fuel stats, deletion and orphans

Files: `src/services/vehicleTransactions.ts` (+ test), `vehicleExpenseActions.ts`, `vehicleProfiles.ts` (`deleteVehicle`), `src/components/vehicles/useVehicleDetailDeletes.ts`, `VehicleItemDeleteModal.tsx`, `VehicleFuelReportSection.tsx`, `vehicleDetailExport.ts`.

- **Bug 4 (double counting):** build the transactions list from **expense records with vehicle meta** as the single source; history/periodic/mechanic rows contribute only as labels (the service name) for the record they point to. Amounts always come from `expenseById`; rows whose record no longer exists are shown greyed «رکورد حذف شده» and excluded from totals.
- **Bug 5 (non-ISO date):** every transaction `date` is the record's ISO date; never `createdAt`.
- **Bug 7 (fuel economy):** consumption = Σ liters of fills **after the first** in the window ÷ (km of last fill − km of first fill) × 100; needs ≥ 2 fills with mileage; computed over a rolling window (last 3 fills, last 10 fills, all) and shown as «۸٫۲ L/100km (۱۰ پر کردن اخیر)»; the monthly table stays but uses the same formula per month and shows «—» with one fill.
- **Bug 6 (deleting fuel lowers the odometer):** deleting a fuel record never changes the vehicle mileage or `lastMileageUpdate`.
- **Bug 10 (orphans):** `deleteVehicle` asks «همهٔ سرویس‌ها، موعدها، سابقه و ۱۲ هزینهٔ این خودرو هم حذف شوند؟» with «فقط خودرو (بایگانی)» (sets `active = false`, keeps everything; the vehicle leaves the list and reminders) and «حذف همه» (deletes the vehicle row, its periodic/deadline/history/meta rows in batches through the outbox; expense records are kept but their meta rows go, and the modal says so). Archived vehicles are listed under a collapsed «بایگانی» section with «بازگردانی».
- Cost per km: `(Σ vehicle expenses in the last 12 months) / (mileage now − mileage 12 months ago from history)`; shown in the vehicle header (wireframe phone 1) when both are known.
- Export: the detail PDF/CSV uses the new single source.
- Tests: list building with shared ids, missing records, fuel formula (2 fills → correct value; 1 fill → null), delete-vehicle plan (rows per tab).

**Commit:** `bugfix/ACCT-0/ACCT-0/Count each vehicle expense once, fix fuel economy and clean up on vehicle delete`.

### Step C5 — Cards, forms and reminders (UI)

Wireframe `round10-vehicle.html` phone 1. Files: `VehicleActiveItemCard.tsx` (+ `VehicleDueTiles.tsx`), `VehicleDetailTabContent.tsx`, `VehiclePeriodicFormModal.tsx`, `VehicleDeadlineFormModal.tsx`, `VehicleDetailPage.tsx` (header), `vehicleDashboardReminders.ts`, `useVehiclesData.ts`, `VehicleProfileCard.tsx`, About, `aboutFeatureGroupsVehicle.ts`.

- Card: title, «آخرین: <km> · <date> · <brand>», the due tiles (one or two), «انجام شد» (periodic) / «تمدید» (deadline), overflow ⋯ with edit / pause (`active = false`) / delete. Sections «نیاز به اقدام · N» (overdue + soon) and «در وضعیت خوب · N» (ok), each sorted by the worse remaining ratio; paused items under «متوقف».
- Service form: name (with suggestions from the vehicle's existing services and a default list: تعویض روغن, فیلتر هوا, لنت جلو, لنت عقب, باتری, ضدیخ, تسمه تایم, لاستیک, بالانس و تنظیم فرمان), due-mode segment, `intervalKm` and/or `intervalMonths`, «آخرین انجام» (km + date, optional), reminder toggle + threshold km / days before. Deadline form: category, start, interval months (default 12), amount, reminder.
- Dashboard reminders (`vehicleDashboardReminders.ts`): `dueDate` = `nextDate` when the time part applies, else the estimated date from the km part (vehicle's average km/day over the last 90 days from history and fuel meta; fall back to today + 7 only when there is no history) — label the estimate «≈».
- Header: current mileage + date of the last update, yearly cost and cost/km.
- About: rewrite the vehicle group (km/time/both, completion with account, mechanic as records, fuel economy window, archive).

**Check:** screenshots (vehicle detail with both tile kinds, completion sheet, entry form with the services checklist, delete-vehicle modal), mobile light/dark, desktop. **Commit:** `feature/ACCT-0/ACCT-0/Redesign vehicle service cards with due tiles and service suggestions`.

---

## Step D — About, changelog, version

- `aboutChangelog.ts`: version `2.7.0`, items: «سرویس خودرو با موعد زمانی و کیلومتری و فاکتور مکانیک روی رکورد», «هشدار بودجه در وب و قیمت رمزارز», «ویزارد شروع کامل‌تر و جستجو در راهنما».
- Bump to 2.7.0.

**Commit:** `docs/ACCT-0/ACCT-0/Describe round 10 in About and bump to 2.7.0`. Run `npm run build` once more, push, give the compare link.

## Acceptance (the owner checks these)

- Sharing a bank SMS from the Android messages app opens the entry form prefilled.
- The vault lists تتر and بیت‌کوین with live prices.
- A web user with push enabled gets «خوراک به ۸۰٪ بودجه رسید» once per month.
- «موز ممتاز» merged into «موز» counts under one row in the items report; records unchanged.
- `npx playwright test --project accounting-flows` passes; the pre-push hook runs it.
- A new spreadsheet's wizard offers budgets and recurring items; About search for «پشتیبان» finds the backup entries.
- Vehicle: a battery with «هر ۳۰ ماه» shows a time tile; completing an oil change keeps the previous oil-change expense and moves both tiles forward; the mileage prompt closes and stays closed; a mechanic invoice saved from the entry form with «لنت جلو» ticked marks that service done; the transactions tab total equals the sum of the vehicle's expense records; deleting a vehicle offers archive or full cleanup.
- All checks pass; size-limit under the limit; a11y suite light + dark passes.

## Out of scope (do not build)

iOS share, new price sources besides tgju, SMS sending, GPS/odometer automation, tire pressure or any sensor data, multi-vehicle comparison reports, backend prerequisites (deferred to 2027 by the owner).
