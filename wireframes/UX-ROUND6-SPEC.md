# UX Round 6 — Implementation Spec

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers or where this document says "ask first".

Rounds 1–5 precede this (`IMPLEMENTATION-SPEC.md`, `UX-ROUND2-SPEC.md` … `UX-ROUND5-SPEC.md`). Round 5 must be implemented first: Task B here hangs off the round-5 «تحلیل این ماه» block and `/charts` page, Task D reuses the round-5 nudge gate, Task F reuses the round-5 side-panel/table layouts on desktop. Still out of scope by decision: bottom navigation (never), module on/off switches, light-theme colors, any mobile redesign of the installments/checks/dang/receivables list pages.

Wireframes: `round6-entry.html` (A), `round6-insights.html` (B, G), `round6-search-categories.html` (C, D), `round6-bank-sms.html` (E), `round6-update.html` (F). Index: `index.html`.

## Project rules (mandatory)

- 300-line hard limit per staged file; extract rather than grow.
- Reuse before create (`useListFilters`, `FormModal`, `ConfirmDeleteModal`, `matchSearch`, `normalizeDigits`, `handleSheetError`, `useSheetImportExport`, the round-5 nudge gate, …).
- No tooling/config changes without permission. **This spec approves:** `registerType: 'prompt'` plus `shortcuts` and `share_target` in the PWA manifest in `vite.config.ts` (Tasks A4, F); new sheet tabs listed per task; a share-receiving Capacitor plugin for Android (Task A4, ask first which one).
- `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run size-limit` and the a11y suite (light + dark) must pass; Prettier only on touched files.
- Every new sheet tab: constant in `sheetNames.ts`, headers in `sheetHeaders.ts`, entry in `moduleSheetSpecs.ts`, CSV import/export via `useSheetImportExport`, archive rules if it is a ledger, covered by the round-5 full backup.
- Every new localStorage key: per spreadsheet, added to `ACCOUNT_KEYS` / `ACCOUNT_KEY_PREFIXES` in `localDataWipe.ts`.
- Update About (`src/components/about/aboutFeatureGroups*.ts`) for every user-visible change; bump `version` in `package.json` and the two root `version` lines in `package-lock.json` (next minor).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per task group; branch off `main`; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...<branch>?expand=1`.
- Android is built by GitHub Actions only.
- Verify visually with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md` (mobile 390×844, desktop 1440×900), light and dark.

## Task A — Faster entry

### A1 — Entry from a template («پرتکرار» chips)

**Why.** Most entries repeat the same category + account. Wireframe `round6-entry.html` phone 1.

- Above the entry form (income and expense), a horizontal chip row «پرتکرار». Chips are built from the records of the last 6 months: group by `category + subCategory + wallet account`; keep groups with **≥ 3** records; order by count; max **6** chips. Chip label: category (and subcategory), tiny line with the account and the last amount.
- Tap = fill category, subcategory, account, title (last title) and amount (last amount), focus the amount field selected so typing replaces it. Nothing else changes; the user saves as usual.
- «ویرایش» link at the end of the row opens a small sheet to pin (always first) or hide a chip. Storage: `accounting_entry_templates_v1` per spreadsheet `{ pinned: string[], hidden: string[] }` keyed by the group key. No sheet tab; chips are derived.
- Hidden when the form is opened from a bank SMS, from a share target, or from a recurring item (those already fill the form).
- Unit-test the grouping (threshold, order, pinned first, hidden removed, 6-month window).

### A2 — Monthly recurring

Wireframe `round6-entry.html` phone 2.

- On the saved-record toast and in the record's edit form, an option «تکرار ماهانه» with three modes: **«یادآوری + یک لمس»** (default when the user turns it on), «خودکار», «بدون تکرار».
- New sheet tab `RECURRING_SHEET = 'تکرارها'`: `شناسه, زمان ثبت, نوع (income|expense), دسته, زیردسته, حساب, مبلغ, عنوان, روز ماه, حالت (reminder|auto), آخرین ثبت (YYYY-MM), فعال`.
- **Reminder mode:** from the 1st of each Jalali month until every item is handled, the dashboard shows a card in the round-1 resume-card family: «ثبت تکرارهای مهر» with a checkbox row per item (title · amount · account) and «ثبت همه». Unchecking skips that item this month. Posting writes the records with note «تکرار ماهانه» and updates «آخرین ثبت». Card disappears when all items have «آخرین ثبت» = current month. Reminder rule: this card also feeds the round-4 nightly digest («N تکرار ثبت‌نشده») — once per month, not nightly.
- **Auto mode:** only when the user explicitly picked it. On app open on/after the item's day of month, if «آخرین ثبت» < current month, post the record with label «تکراری» and a 5-second undo toast (round-3 undo pattern; undo deletes the record and clears «آخرین ثبت»). Never post twice for the same month even across devices: write «آخرین ثبت» first, then the record; a conflict on the recurring row (sheet revision) aborts the post.
- Editing the amount of a recurring-born record asks once: «از این به بعد هم همین مبلغ؟» (updates the recurring row) or «فقط این ماه».
- Management: «تکرارها» section in Settings (list, toggle فعال, edit, delete). No new menu entry.
- Unit-test: month window, skip, undo, double-post guard, day-of-month 29/30/31 clamping to the last day of short months.

### A3 — Duplicate detection in the entry form

Wireframe `round6-entry.html` phone 3. Deterministic only: same amount + same category + same date, and the existing record was **created in the last 60 minutes** (`createdAt`). Bank SMS already has this rule (`isProbableDuplicate`); share the helper. Inline warning card inside the form under the amount: «احتمالاً تکراری — همین مبلغ در همین دسته ۱۲ دقیقه پیش ثبت شده» with «دیدن آن رکورد» (opens records filtered to it) and «فرق دارد، ثبت کن» (dismisses for this form instance). Never blocks saving; no modal; no toast.

### A4 — Entry from outside the app

- **Shortcuts.** PWA manifest `shortcuts` (approved config change) and Android static shortcuts (`android/app/src/main/res/xml/shortcuts.xml` + manifest meta-data): «ثبت هزینه» (`?action=expense`), «ثبت درآمد» (`?action=income`), «پیامک‌های بانکی» (`?action=sms`). Route handling in `App.tsx` on launch: open the tab and form, then strip the query. Phosphor icons at 96×96 PNG for the shortcuts.
- **Share target.** PWA manifest `share_target` (GET, `text` param) and Android `ACTION_SEND text/plain` intent filter. On receipt, run the shared text through the existing bank-SMS parser (`bankSmsMatch` / templates); if it matches, open the entry form pre-filled (amount, account, direction) with note «ثبت از پیامک»; if not, open the «پیامک ناشناخته» flow of Task E with the text. This is the only iOS path for bank SMS; do not add anything else for iOS (owner decision, 2026-10-11). Android needs a plugin that delivers the intent to the web view — **ask first** with one recommended package and its size; do not install before approval.

## Task B — Meaning behind the numbers

### B1 — Budgets inside «تحلیل این ماه»

Wireframe `round6-insights.html` phone 1. Expense categories only.

- New sheet tab `BUDGETS_SHEET = 'بودجه'`: `دسته, مبلغ ماهانه, زمان ویرایش`. One row per category; the sheet is the source of truth, mirrored locally like other tabs.
- In the round-5 «تحلیل این ماه» block and on `/charts`, every expense category row shows its bar against the budget when one exists (grey up to 100%, red over), text «۸۹۰٬۰۰۰ از بودجه ۸۰۰٬۰۰۰ · ۹۰ هزار بیشتر». Without a budget the bar stays the share-of-total bar from round 5 and the row gets a small «تعیین بودجه» link.
- Tap the row (or the link) → bottom sheet «بودجه ماهانه «خوراک»» with one amount field, the suggestion «میانگین ۳ ماه اخیرت: ۷۴۰٬۰۰۰» (prefilled when empty), save, delete.
- Also editable from the category management page (Task D1).
- Alerts only in the round-4 nightly digest: «خوراک به ۸۰٪ بودجه رسید» and «… از بودجه گذشت», each once per category per month. No toasts, no banners.
- Unit-test the 3-month average, the over-100% state, and the once-per-month alert gate.

### B2 — Month comparison

Next to each category name in «تحلیل این ماه» and on `/charts`: «↑ ۳۰٪ از شهریور», «↓ ۱۵٪», «= مثل شهریور» (within ±2%). Computed locally from records; shown only when the previous month has at least one record in that category. The same comparison for the month totals in the dashboard hero strip: «هزینه ماه ۱۲٪ کمتر از شهریور». Persian month names from the existing Jalali utils.

### B3 — Savings goals in «صندوقچه»

Wireframe `round6-insights.html` phone 2. See Task G for the asset-class model; a goal is one more class.

- New sheet tab `TREASURY_GOALS_SHEET = 'هدف_صندوقچه'`: `شناسه, زمان ثبت, عنوان, مبلغ هدف, تاریخ هدف, حساب مبدا پیش‌فرض, یادداشت, وضعیت (active|reached|archived)`. Deposits are **wallet-ledger transfers** from a wallet account to the goal (`WALLET_LEDGER_SHEET`, new kind `goal-deposit` with the goal id); withdrawing is the reverse. The wallet balance moves; the goal's balance = sum of its ledger rows.
- Goal card: title, progress bar, «۹٬۰۰۰٬۰۰۰ از ۲۰٬۰۰۰٬۰۰۰ · ۴۵٪», «تا ۱ فروردین ۵ ماه مانده · ماهی ۲٬۲۰۰٬۰۰۰ لازم است · این ماه ۱٬۵۰۰٬۰۰۰ گذاشتی», buttons «+ واریز به هدف» and «ویرایش» (edit, withdraw, archive).
- Reaching 100%: status `reached`, a one-time congratulation card on the dashboard (dismissable) and a notification through the existing local-notification path.
- Goal balances count as assets in `treasuryTotal`; the net-available settings get a separate toggle «هدف‌های پس‌انداز» (default on).

### B4 — «چه خبر؟» after an update

Wireframe `round6-insights.html` phone 3 and `round6-update.html` phone 3.

- Source of truth is About: add an optional `changelog?: { version: string; items: string[] }[]` export next to the About groups (`src/components/about/aboutChangelog.ts`), max 3 items per version, user-facing Persian, maintained from now on as part of the About rule.
- On the first launch of a version (compare `package.json` version with `accounting_last_seen_version` per device, not per spreadsheet), after the app is ready and the user is past the wizard: bottom sheet «به‌روز شد — نسخه X» with the items of every version newer than the last seen (max 3 lines total, newest first), «باشه» and «همه تغییرات» (opens About). Not shown on first install (no previous version) and not during the wizard or the first day. Both web and APK.

## Task C — Global search

Wireframe `round6-search-categories.html` phone 1.

- Entry: ⌕ icon in the mobile header (right of the title; the sync badge stays), a search chip in the desktop header (round 5). Route `/search`, tab `search`, title «جستجو». Keyboard `/` or `Ctrl+K` focuses it on desktop.
- One input with the existing normalization (`normalizeSearchText`: ي/ی, ك/ک, ZWNJ, digits). Searches local mirror data only (records of the current year plus archived years already loaded, checks, dang, receivables, installments, counterparties, treasury, personal reminders, vehicles). Results grouped by module with a count chip row («همه ۷ · تراکنش ۳ · چک ۲ …»); 20 per group with «بیشتر». Numeric queries also match amounts (exact and with thousands grouping). Suggestions under an empty input: last 5 queries (`accounting_search_recent_v1` per spreadsheet), counterparties, months.
- Tap a result → that module's page with the item highlighted/expanded (reuse the deep-link/highlight mechanism of the dashboard reminder rows; add one where missing).
- Search runs in a `useDeferredValue` + memo; no worker needed. Unit-test the aggregator with mixed fixtures.

## Task D — Categories

### D1 — Category management page

Wireframe `round6-search-categories.html` phones 2–3. The quick-add sheet inside the entry form stays as is.

- New settings page `/settings/categories` («دسته‌ها»), reachable from Settings and from the «مدیریت» link of the quick-add sheet. Segments «هزینه | درآمد» (plus the other category lists — dang, receivable, personal reminder — behind a «سایر فهرست‌ها» segment); search box.
- Row per category: drag handle (reuse `reorderItems`), name, line «۴ زیردسته · ۳۱ تراکنش این ماه · بودجه ۸۰۰٬۰۰۰», chevron. System categories (`protectedCategories.ts`: خودرو, قسط, چک, انتقال, طلب, …) get a «سیستمی» badge and cannot be renamed or deleted (subcategories and budget still editable). Categories with zero records in 6 months render dimmed with «ادغام یا حذف؟».
- Tap → bottom sheet: rename, budget (Task B1), subcategories (add/rename/delete inline), «ادغام در دسته دیگر…» and «حذف».
- Delete with records → forced merge: pick the target, confirm «۳۱ رکورد به «خانه» منتقل می‌شود», then rewrite the rows (records, dang, receivables as applicable) through the outbox in batches, then delete the category. Rename also rewrites rows (today's behavior for subcategories; extend to categories). Show progress; abort cleanly on auth error.
- Desktop: table view in the round-5 side-panel layout.

### D2 — Default categories (new users only)

Approved as in the wireframe table. Replace `DEFAULT_EXPENSE_CATEGORIES` / `DEFAULT_INCOME_CATEGORIES` in `settingsCategoryLists.ts` and add default subcategories in `categorySubcategories.ts`:

- Expense: خوراک (سوپرمارکت، نان و لبنیات، میوه، رستوران و بیرون‌بر) · خانه (اجاره، شارژ، تعمیر و لوازم، خدمتکار) · قبوض (برق، گاز، آب، اینترنت، موبایل) · حمل‌ونقل (بنزین، تاکسی و اسنپ، مترو و اتوبوس، پارکینگ و عوارض) · خودرو [system] (سرویس، بیمه، معاینه فنی، جریمه) · سلامت (دکتر، دارو، آزمایش، بیمه درمان) · آموزش (شهریه، کتاب و لوازم، کلاس) · پوشاک و زیبایی (لباس، کفش، آرایشگاه) · تفریح و سفر (سینما و کافه، سفر، اشتراک‌ها) · هدیه و مناسبت (هدیه، عیدی، مهمانی، نذری و خیریه) · خانواده و فرزند (مهد و مدرسه، اسباب‌بازی، پوشک) · قسط [system] · چک [system] · انتقال [system] · سایر.
- Income: حقوق (حقوق، اضافه‌کار، عیدی و پاداش) · کار آزاد (پروژه، فروش) · سود و سرمایه (سود بانکی، سهام، اجاره‌بها) · هدیه و یارانه (یارانه، هدیه) · طلب [system] · سایر.
- Existing spreadsheets are **not** touched. They get a one-time dismissable row at the top of the category page: «دسته‌های پیشنهادی جدید را اضافه کنم؟» which appends only the missing ones (never renames). Keep the legacy migration paths (`migrateLegacyMachineExpenseCategory.ts`) working; update fixtures and tests that assume the old lists.

## Task E — Bank SMS review queue

Wireframe `round6-bank-sms.html`. Logic stays (matching, `isProbableDuplicate`, «قبلاً ثبت شده», range, templates, 10:00 reminder, nightly digest); only layout and action order change.

- Order on the page: pending banner → queue → bottom bar. Help card, range card and templates move behind a ⚙ header button (settings sheet: the current `BankSmsSettingsCard`, `BankSmsRangeBar`, `SmsTemplatesSection`). First visit with no templates still shows the help inline (empty state).
- Card (`BankSmsEntryCard` redesign): signed toman amount large (−۲۵۰٬۰۰۰ / +۵٬۰۰۰٬۰۰۰ — rial converted), account title, time, **suggested category** line (rule, in order: a recurring item with the same amount and account (Task A2) → the category of the last record with the same amount and account → the category of the last record from the same sender → none; show «دسته: خوراک ▾» tappable to change), then one primary button matching the SMS direction («ثبت هزینه» for withdrawals, «ثبت درآمد» for deposits), secondary «فقط موجودی», and ⋯ (opposite direction, «قبلاً ثبت شده», «نادیده», «متن کامل»). Raw SMS text collapsed behind «متن کامل».
- Swipe (mobile): right = primary action, left = «نادیده», with the 5-second undo toast. Use the existing haptics from round 5.
- Duplicate badge «تکراری؟ · رکورد ۱۲ دقیقه پیش» on cards where `isProbableDuplicate`; primary action then opens the form instead of saving directly.
- Bottom bar «ثبت همه شناخته‌شده‌ها (N)»: confirms every matched card that has a suggested category with that category; cards without a suggestion stay. Reuse `BankSmsBulkBar`.
- Unknown SMS: card shows the text with amounts highlighted; tap an amount → the template is built from that sample (`guessTemplate` with the chosen slot) and saved; the queue re-matches immediately. The full `SmsSampleEditor` stays reachable from ⋯ «ویرایش قالب».
- Desktop: queue as a table in the side-panel layout.

## Task F — User-controlled web/PWA updates

Wireframe `round6-update.html`. Today `vite.config.ts` has `registerType: 'autoUpdate'` and `App.tsx` calls `registerSW()` without callbacks, so a new service worker reloads the page silently, even mid-form, while a long-lived tab never learns about new versions.

- `vite.config.ts`: `registerType: 'prompt'` (approved). `App.tsx`: `registerSW({ immediate: true, onNeedRefresh, onRegisteredSW })`; keep `updateSW` in a small `webUpdate.ts` service beside `appUpdate.ts`, exposing the same shape the APK flow uses (`checkForUpdate`, `applyUpdate`, `status`), so `UpdateBanner.tsx` and `LayoutUpdateItem.tsx` serve both platforms.
- Check cadence: on registration, every 60 minutes while the tab is visible, on `visibilitychange` to visible, and from the menu item «بررسی به‌روزرسانی» (now works on web too, same copy: «نسخهٔ نصب‌شده به‌روز است» / «بررسی به‌روزرسانی ناموفق بود»).
- Banner «نسخه X آماده است — دانلود شده؛ هر وقت خواستی به‌روز کن.» with «به‌روزرسانی» (`updateSW(true)`) and «بعداً». The version comes from `package.json` injected via `define` at build time and written into the SW precache manifest version (so the banner can name it). «بعداً» hides the banner until the next app launch; the menu item keeps an orange dot and «به‌روزرسانی به X».
- **Never while working:** no banner while any `FormModal`/sheet is open or the entry form has unsaved input (reuse the modal registry from round 4 `useModalLock`); only the menu dot. The banner appears on the next navigation to a page without an open form. No automatic reload ever.
- After `updateSW(true)` the page reloads once; Task B4's «چه خبر؟» then fires.
- APK: the existing banner keeps its download/install flow; align copy and look with the web banner; «چه خبر؟» after an APK install uses the same last-seen-version check.
- Test: a Playwright test that registers a stale SW build, asserts no reload while a form is open and the banner after it closes (mock `onNeedRefresh`), and that «بعداً» persists for the session.

## Task G — «صندوقچه»: asset classes and class filter

**Why.** Today the vault knows seven fixed assets (`VaultAssetType`: six gold items and USD, `VAULT_ASSET_OPTIONS` in `tgju.ts`), all in one flat list. Owners with stocks, funds or crypto cannot record them, and once the list grows there is no way to see only gold or only dollars. Wireframe `round6-insights.html` phone 2 (chip row + cards).

**Model.**

- Asset class `VaultAssetClass = 'gold' | 'currency' | 'stock' | 'crypto' | 'other'` (labels: طلا، ارز، سهام و صندوق، رمزارز، سایر). Savings goals (Task B3) are a sixth chip «هدف‌ها», not an asset class.
- New sheet tab `TREASURY_ASSETS_SHEET = 'دارایی_صندوقچه'` as the asset catalog: `شناسه, کلاس, نماد, نام, واحد, اعشار, منبع قیمت (tgju|manual), کلید tgju, قیمت دستی, زمان قیمت دستی, فعال`. Built-in assets (the seven today plus the tgju currencies from `EXCHANGE_CURRENCY_OPTIONS` that have a `tgjuKey`) are seeded into the catalog on first run with `منبع قیمت = tgju`; the user adds custom assets (stocks, funds, crypto, anything) with `منبع قیمت = manual`.
- `TREASURY_SHEET` rows keep their columns; `نوع دارایی` now holds the catalog id (legacy values `sekeb … usd` stay valid and map to the seeded rows, so existing sheets need no migration). Add nothing to the transaction row.
- Prices: tgju for seeded assets (unchanged, `fetchTgjuPrices` extended to the catalog's tgju keys). Manual assets show «قیمت دستی · ۱۲ مهر» on the card with a ✎ to update; stale after 30 days → amber hint «قیمت را به‌روز کن». Manual-priced value counts in totals (owner decision). Crypto via tgju only if tgju exposes a key for it — **ask first** with the verified key list before adding any other price source; no new network host without approval.
- Units/decimals: gold items as today; currencies 2 decimals; stocks integer shares; crypto up to 8 decimals; `اعشار` on the catalog row drives the quantity input and `formatQuantity`.

**UI.**

- Chip row at the top of the page (`ToggleChipGroup`): «همه ۱۲ · طلا ۵ · ارز ۲ · سهام ۳ · رمزارز ۲ · هدف‌ها ۱» — counts are holdings with net quantity > 0 (goals: active goals); chips with 0 hidden except «همه». Selection persists per session (`accounting_treasury_class_v1` per spreadsheet) and combines with the existing search; it also scopes the price card to that class and the stat total to that class («جمع طلا: …»).
- Holding card header adds the class label and symbol («سهام · فولاد»); cards within «همه» are grouped by class with a slim section header and a class subtotal.
- «افزودن دارایی» form: first field «کلاس» (segmented), then «دارایی» (select of catalog assets in that class + «دارایی جدید…» inline add: نام, نماد, واحد, اعشار, قیمت فعلی), then the existing quantity/price/date/note fields. Edit and sell forms unchanged apart from the catalog lookup.
- Catalog management in Settings («دارایی‌های صندوقچه»): rename, change decimals/price, deactivate (hidden from the add form, holdings still shown).
- Dashboard «دارایی و بدهی» row and the net-available settings: `treasuryTotal` keeps summing all classes; the breakdown view shows per-class subtotals.
- Reports (`AssetsLiabilitiesReportPage`, module report): add the class column and subtotals; CSV/PDF export of the vault includes class, symbol and unit.
- Desktop: table view with class as a column filter.

**Tests.** Catalog seeding and legacy id mapping, class counts, per-class totals, stale-price flag, decimals validation.

## Task H — About and version

Update About: entry templates and recurring (entry-records group), duplicate warning, shortcuts and share target (platform), budgets and comparison (dashboard/reports), savings goals and asset classes (treasury group: rewrite the summary «مدیریت دارایی‌های طلا، ارز، سهام و رمزارز با نرخ لحظه‌ای یا دستی و هدف‌های پس‌انداز»), search, category page and defaults, bank SMS queue, web update banner and «چه خبر؟». Add the first `aboutChangelog.ts` entries for rounds 5 and 6. Bump the version.

## Suggested order and commits

1. `feature` — G (asset classes, catalog, chips) — independent, unblocks B3.
2. `feature` — B3 (goals) + B1/B2 (budgets, comparison) — needs round-5 «تحلیل این ماه».
3. `feature` — D2 then D1 (defaults, category page) — B1 budget editing lands here too.
4. `feature` — A1, A3 (templates, duplicate) then A2 (recurring).
5. `feature` — E (bank SMS queue) — uses A2 suggestions.
6. `feature` — C (search).
7. `feature` — A4 (shortcuts, share target) — after the plugin is approved.
8. `feature` — F (web updates) + B4 («چه خبر؟»).
9. `docs` — H.

Stop after commit 1 and report with screenshots of «صندوقچه» (mobile light/dark, desktop); then continue. Final report: screenshots of every changed screen, test counts, anything skipped with the reason.
