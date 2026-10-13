# UX Round 7 — Implementation Spec

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers or where this document says "ask first".

Rounds 1–6 precede this (`IMPLEMENTATION-SPEC.md`, `UX-ROUND2-SPEC.md` … `UX-ROUND6-SPEC.md`); all of them are merged. This round builds on: the round-5 `/charts` page, full zip backup (`backupExport.ts`, `backupRestore.ts`, `backupZip.ts`), nudge gate, guide-card family on the dashboard, `DataTable` + `FormModal variant="panel"`, `haptic()`; the round-6 bank-SMS queue (`nextAccountBalance`, `isProbableDuplicate`), budgets, savings goals, nightly digest notes (`setDigestNotes`), `aboutChangelog.ts`, launch actions (`launchAction.ts`). Still out of scope by decision: bottom navigation (never), module on/off switches, light-theme colors, any mobile redesign of the list pages.

Wireframes: `round7-reconcile.html` (A, B), `round7-reports.html` (C, D, E), `round7-attachments.html` (F, G, H), `round7-backup-a11y.html` (I, J). Index: `index.html`.

## Project rules (mandatory)

- 300-line hard limit per staged file; extract rather than grow.
- Reuse before create (`useListFilters`, `FormModal`, `ConfirmDeleteModal`, `DataTable`, `matchSearch`, `normalizeDigits`, `handleSheetError`, `useSheetImportExport`, `downloadTablePdf`, `saveExportFile`, the nudge gate, the guide-card family, …).
- No tooling/config changes without permission. **This spec approves:** nothing in `vite.config.ts`, `scripts/`, `tools/` or the hooks; one new dependency only if Task F needs it for image compression and the browser `canvas` path is not enough (ask first with name + size). No new Google OAuth scope (Task H uses ICS only).
- `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run size-limit` (900 KB total JS, owner-approved in round 5) and the a11y suite (light + dark) must pass; Prettier only on touched files.
- Every new sheet tab or column: constants in `sheetNames.ts` / `sheetHeaders.ts`, entry in `moduleSheetSpecs.ts`, CSV import/export via `useSheetImportExport`, included in the full backup (it reads `getAllSheetSpecs()`), archive rules if it is a ledger. New columns go at the **end** of the row so older app builds keep working.
- Every new localStorage key: per spreadsheet and in `ACCOUNT_KEYS` / `ACCOUNT_KEY_PREFIXES` in `localDataWipe.ts`, unless the spec says "per device".
- Update About (`src/components/about/aboutFeatureGroups*.ts`) for every user-visible change and add the version's entries to `aboutChangelog.ts` (max 3 items); bump `version` in `package.json` and the two root `version` lines in `package-lock.json` (this round ships as **2.3.0**).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per task group; branch off `main`; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...<branch>?expand=1`.
- Android is built by GitHub Actions only; Java changes are reviewed by reading.
- Verify visually with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md` (mobile 390×844, desktop 1440×900), light and dark.

## Task A — Balance reconciliation with bank SMS

**Why.** Every bank SMS carries «موجودی بعد از تراکنش» (parsed today, used by `nextAccountBalance` in `bankSmsQueue.ts`), but the app never compares it with its own balance; drift goes unnoticed for months. Wireframe `round7-reconcile.html` phones 1–2.

**Rule.** For every wallet account that has at least one matched bank SMS, compare the balance of the newest SMS with the app's balance at that SMS's timestamp (the account balance minus the net of records on that account created after the SMS time). Non-zero difference = a red «با پیامک بانک نمی‌خواند» block inside that account's card on the wallet page; never on cash or SMS-less accounts; no toast, no modal. The nightly digest gets one line per account: «ملت ۳۵۰ هزار اختلاف دارد» (via `setDigestNotes`, once per day).

**Account card block:** «آخرین پیامک (۸ مهر ۱۴:۰۲): موجودی ۳٬۹۰۰٬۰۰۰ · اختلاف ۳۵۰٬۰۰۰ بیشتر در اپ» (or «کمتر»), buttons «پیدا کردن اختلاف» (→ Task A wizard) and «نادیده» (hides this exact difference until it changes; `accounting_reconcile_v1` per spreadsheet, see below). Matching accounts show «✓ با پیامک ۱۰ مهر یکی است» in green; accounts without SMS show «پیامک ندارد» in muted text.

**Wizard** (`/wallet/reconcile/:accountId`, title «تطبیق <account>», back to the wallet):
1. Summary card «از آخرین تطبیق (<date>) تا الان»: count of bank SMS, count of app records on this account, and the live difference in red.
2. «پیامک‌هایی که در اپ نیستند»: the round-6 SMS queue filtered to this account and to SMS without a matching record (reuse `findRecentEntryDuplicate` logic in reverse: an SMS has a match when a record with the same amount, account and date exists). Each row: day badge · «برداشت/واریز amount» · time · suggested category · «ثبت» (saves exactly like the queue's primary action, including the suggested category of round 6). After each save the difference updates live.
3. «تراکنش‌های اپ بدون پیامک»: records on this account in the range that no SMS matches; hint «نقدی بوده؟ حساب را عوض کن»; ⋯ opens the record's edit form.
4. Footer card: «هنوز N اختلاف» becomes «✓ موجودی اپ و بانک یکی شد» at zero. If not zero, «تنظیم دستی موجودی» creates a **correction record** (income or expense for the difference, system category «تطبیق» — add it to `protectedCategories.ts` for both lists — note «تطبیق با پیامک <date>»). Never edit the account balance directly.
5. A successful reconciliation (difference 0, or after the correction record) stores `{ accountId: { at: ISO, balance, smsAt } }` in `accounting_reconcile_v1` per spreadsheet (also holds the «نادیده» entries); the wizard's range starts from it next time. First-ever range: 90 days.

**Desktop:** wizard as a two-column page (lists right, summary + footer left); the account cards keep the block.

**Tests.** Difference computation with records after the SMS time, SMS↔record matching both directions, correction-record direction, the «نادیده» rule, digest line once per day.

## Task B — Net-worth trend on `/charts`

Wireframe `round7-reconcile.html` phone 3. Replaces the round-5 placeholder «خالص تجمعی ۶ ماه».

- The charts page gets a third segment: **دسته‌ها | درآمد و هزینه | دارایی خالص**. The first two keep today's content.
- **Snapshots.** New sheet tab `NET_WORTH_SHEET = 'دارایی ماهانه'`: `کلید ماه (YYYY-MM), دارایی خالص, دارایی‌های منتخب, بدهی‌های منتخب, زمان ثبت, منبع (auto|rebuilt|manual)`. (`MONTHLY_BALANCE_SHEET` = «موجودی ماهانه» is the opening-balance tab and stays as is; do not reuse it.) On the first app open of each Jalali month, after the first successful sync, write the previous month's snapshot from the dashboard bundle (`netAvailable`, selected assets, selected liabilities as the net-available settings define them) if that month has no row. Months before the first snapshot are rebuilt **once** from records (wallet opening balances + monthly net flow; treasury and goals at today's prices; checks/installments/dang/receivables at their per-period values — the same simplification round 5 documented) and written with `منبع = rebuilt`; a rebuilt month is overwritten by nothing, a manual edit on the report page sets `منبع = manual`.
- **View:** hero «دارایی قابل اتکا · امروز» with «↑ X از ابتدای سال · ↓ Y از ماه قبل»; «۱۲ ماه اخیر» line chart (solid = net worth, dashed red = selected liabilities), tap/hover a point = that month's values; legend rows with the current values; «بیشترین رشد» / «بیشترین افت»: the three months with the largest change, each with a one-line reason built from that month's top income or expense categories and goal/treasury events («عیدی + فروش طلا»).
- Reuse the line-chart primitive from round 5 (`chartsData.ts` series types); no new chart library.
- **Tests.** Snapshot-once-per-month gate, rebuild math on a fixture, largest-change selection, reason text.

## Task C — Monthly report (PDF)

Wireframe `round7-reports.html` phone 1.

- On the first day of each Jalali month, after 09:00 local time, a dashboard row in the guide-card family: «گزارش <month> آماده است · یک صفحه · درآمد، هزینه، بودجه، اقساط» with «ببین». Priority: below the resume card and recurring card, above the backup reminder. Dismissed by viewing or ✕; one per month.
- The report is a one-page PDF built with the existing `downloadTablePdf` machinery (`src/utils/pdf.ts`, same font and RTL handling) plus a new template: header «حساب کتاب · <month year>» and the Google account name; three numbers (درآمد، هزینه، خالص); budget bars for every budgeted category (round 6, red when over); installments paid «N از M», checks cleared N; net worth and its change from the previous month (Task B snapshot); recurring items posted. Nothing else.
- Buttons on the view: «اشتراک PDF» (`saveExportFile` → share sheet on Android, download on web), «ذخیره» (same path, no share), «هر ماه نفرست» (turns the monthly row off: Settings → «گزارش‌ها» → «گزارش ماهانه» toggle, default on).
- Reports page: a new entry «گزارش ماهانه» that lets the user pick any past month and build the same PDF; this is where the report lives permanently.
- **Tests.** Report data assembly from fixtures (numbers, budgets, counts); the first-day/09:00 gate; the once-per-month card.

## Task D — «سال در یک نگاه»

Wireframe `round7-reports.html` phone 2.

- From 25 اسفند to 15 فروردین, once per year, a dashboard card «<year> در یک نگاه» (guide-card family, highest priority in that window): income, expense, savings (and rate %), biggest expense category, most expensive month, net worth from → to, installments paid, checks cleared, goals reached. Numbers from the year's records plus Task B snapshots.
- «اشتراک کارت»: render the card to a PNG (canvas; reuse the round-4 export/share path with `image/png`) — no fine details, only the headline numbers. «بستن سال» opens Task E. ✕ dismisses for this year (`accounting_year_review_v1` per spreadsheet).
- Reports page → new group «سال‌ها»: every past year's card, always available after the window.
- **Tests.** Window gate (Jalali dates), the aggregations, savings-rate rounding.

## Task E — Close-the-year wizard

Wireframe `round7-reports.html` phone 3. A UI over services that already exist: `openingBalanceService.ts`, `recordArchive*.ts` (round-4 archive tabs), the round-5 backup. **Nothing is deleted; every step can be skipped and done later.**

- Entry: the Task D card's «بستن سال», or Settings → «حساب و داده» → «بستن سال». Route `/settings/close-year/:year`, title «بستن سال <year>».
- Four steps with status marks (✓ done / number pending), in this order:
  1. **تطبیق حساب‌ها** — ✓ when every SMS-backed account was reconciled (Task A) after 1 اسفند; cash accounts show «نقدی را خودت تأیید کن» with a checkbox.
  2. **مانده‌های اول <next year>** — writes the opening balances for فروردین of the next year through `openingBalanceService` (accounts, receivables, debts, open installments); ✓ when the tab already has them.
  3. **آرشیو رکوردهای <year>** — «۲٬۱۴۰ رکورد به تب «رکوردها_<year>» می‌رود؛ جستجو و گزارش‌ها هنوز می‌بینند»; button «آرشیو کن» runs the round-4 sweep for that year with progress; reversible as round 4 defines.
  4. **پشتیبان کامل** — runs the round-5 full backup; ✓ when a backup newer than step 3 exists.
- Footer «بعدش چی؟»: «داشبورد از ۱ فروردین با مانده‌های جدید شروع می‌کند. گزارش «سال در یک نگاه» همیشه در گزارش‌ها می‌ماند.»
- **Tests.** Step status derivation from fixtures (reconcile dates, opening-balance tab, archive marker, backup timestamp).

## Task F — Receipt attachments

Wireframe `round7-attachments.html` phone 1.

- Attach up to **3** images or PDFs to a record, a check, an installment plan, or a vehicle expense. Entry form field «پیوست»: thumbnails + «📷» (camera on Android via the existing Capacitor camera path if present, else file input with `capture`) + «🖼» (file picker); hint «حداکثر ۳ · فشرده می‌شود».
- **Storage:** Google Drive, in the folder that holds the spreadsheet (existing `drive.file` scope; `drive.ts` already lists files there), sub-folder «پیوست‌ها/<Jalali year>»; create folders lazily. Images are resized to max 1600 px and ~300 KB (canvas; JPEG q≈0.8) before upload; PDFs uploaded as is (max 5 MB). The Drive file id(s) go into a new last column «پیوست» on the row (comma-separated ids). Offline: the upload waits in the outbox (new operation kind `attachment-upload` holding the blob in IndexedDB — not localStorage), the row gets the id after upload, and a local thumbnail shows meanwhile.
- **Lists:** rows with attachments show a «📎 N» badge; tap → bottom sheet with preview (image inline, PDF icon), «باز کردن در Drive», «اشتراک», «حذف».
- Deleting the parent asks «پیوست هم پاک شود؟» (default yes → Drive delete; no → keep the file).
- Full backup: attachment ids are plain columns, so they ride along; the binary files are **not** in the zip (state this in About).
- Search (round 6) does not index attachments.
- **Tests.** Resize/size-budget math (pure), id column parsing, outbox operation serialization, delete-question branching.

## Task G — Hidden amounts mode

Wireframe `round7-attachments.html` phone 2.

- An eye button in the header (mobile: next to ⌕; desktop: in the header toolbar). On: every `MoneyDisplay`, chart value, balance, widget-facing value renders «•••••» (same width class as the amount it replaces, so layouts do not jump); charts render bars/lines without labels. Off: normal.
- Tap a masked amount = reveal **that one** for 5 seconds (`haptic('selection')`), then mask again. Form inputs are never masked. The state is **per device** (`accounting_amounts_hidden`, not in `ACCOUNT_KEYS`) and persists across launches until switched off.
- Combines with the app lock: lock = security, hidden = privacy in company; About explains both in one paragraph.
- Implementation: one store + hook (`useAmountsHidden`) read by `MoneyDisplay`, the chart primitives and the Task «ویجت» JSON of round 8; no page-level changes.
- **Tests.** Store persistence, 5-second reveal timer, mask width class mapping.

## Task H — Due-date calendar

Wireframe `round7-attachments.html` phone 3.

- The due-dates report (`report-due-dates`) gets a second view: segment **فهرست | تقویم**. Same data (`dashboardReminders.ts`: installments, checks, dang, personal reminders, vehicle service).
- Calendar: Jalali month grid (ش…ج), ‹ › month stepper; days with items get a dot, overdue days red, today filled. Tap a day → the list below filters to that day (shows the full list when no day is selected). Keyboard: arrows move between days (round-5 rules).
- «افزودن به تقویم گوشی»: builds an **ICS** file with every item of the next 12 months (one VEVENT per due item, VALARM one day before, Persian summary «قسط وام مسکن · ۳٬۰۰۰٬۰۰۰») and saves it through `saveExportFile`. **Decision: no Google Calendar API and no new OAuth scope** — ICS only. Mention in About that the phone's calendar app imports it.
- **Tests.** Day bucketing, overdue detection, ICS generation on a fixture (escape commas/newlines, UTC stamps, stable UIDs from item ids so re-imports update instead of duplicate).

## Task I — Automatic backups

Wireframe `round7-backup-a11y.html` phone 1. Builds on the round-5 zip.

- Settings → «حساب و داده» → the backup card becomes a page `/settings/backup` («پشتیبان»): «آخرین پشتیبان خودکار» (date, ✓ «در Drive › حساب کتاب › پشتیبان»), toggles «پشتیبان خودکار هفتگی» (default **on**), «فقط روی وای‌فای» (Android only, via `@capacitor/network` if already installed — otherwise hide the toggle and say so in the report; do not add a dependency), «اگر دو هفته پشتیبان نشد، خبر بده» (default on), a «نسخه‌ها» list (name, size, خودکار/دستی, ⋯ → download / restore / delete), buttons «پشتیبان الان» and «بازگردانی از فایل…» (round 5).
- **Schedule:** on the first app open ≥ 7 days after the last successful backup, after the first sync of that launch, in the background (no UI blocking, a small toast at the end «پشتیبان خودکار ذخیره شد»). Web and APK alike; no background service. Destination: Drive folder «پشتیبان» next to the spreadsheet (`drive.file` scope), file name as round 5. Keep the **3** newest automatic backups; manual ones are never deleted.
- «خبر بده»: a local notification (existing path) after 14 days without a successful backup, once per fortnight; also a digest line.
- Storage: extend the round-5 `accounting_backup_v1` entry with the auto fields.
- **Tests.** 7-day schedule gate, retention (3 auto, manual kept), 14-day notification gate.

## Task J — Accessibility settings

Wireframe `round7-backup-a11y.html` phones 2–3.

- New Settings section «نمایش» (move the existing theme control into it) with:
  1. **اندازهٔ متن** — four steps on `html { font-size }`: 87.5 % / 100 % / 112.5 % / 125 % («کوچک | عادی | بزرگ | خیلی بزرگ»), live preview row under the control. Per device (`accounting_text_size`). Default follows the system font scale when the platform exposes it (Android WebView does through `font-size` of `html` already — verify; otherwise «عادی»). Everything is `rem`, so pages scale; fix any `px` leftovers that break at 125 % (header height, bottom nav, wheel pickers).
  2. **تم** — روشن · تاریک · مثل سیستم (today's toggle, moved here; the drawer keeps its quick toggle).
  3. **کاهش انیمیشن** — honors `prefers-reduced-motion` and adds a manual switch; one `data-reduced-motion` attribute on `html` that the existing media-query rules also match (`:root[data-reduced-motion] …`).
  4. **کنتراست بالا** — stronger text colors and a visible border on cards in both themes, through the token layer (`--text-muted`, `--border`), attribute `data-contrast="high"`.
  5. **ارقام فارسی** — default on (today's behavior); off renders Latin digits everywhere `toPersianDigits` / the number formatters are used (one formatter flag, not per-page changes).
  6. **صدای ثبت و لرزش** — the round-5 haptics switch (default on).
- Screen readers: every icon-only button has an `aria-label` (audit the header, speed dial, table row actions, SMS cards, chips); focus order inside bottom sheets is first field → actions → close; `aria-live` on the save toast and the Task A difference line.
- The a11y suite runs its page set a second time at «بزرگ» (112.5 %) and once at «خیلی بزرگ» for the dashboard and the entry form — add a project to the existing Playwright config **only if the owner approves** (ask first); otherwise add the font-size setup to the existing spec files via a `localStorage` seed.
- **Tests.** Text-size store and html attribute application, digit formatter flag, reduced-motion attribute vs media query precedence.

## Task K — About and version

Update About: wallet (reconciliation), charts (net-worth trend), reports (monthly report, years, close the year), entry-records (attachments), platform (hidden mode, text size, display settings, auto backup, calendar export). Add the 2.3.0 entries to `aboutChangelog.ts` (pick three: reconciliation, monthly report + year review, attachments). Bump to 2.3.0.

## Suggested order and commits

1. `feature` — G (hidden mode) — small, other tasks render through it.
2. `feature` — J (display and accessibility settings) — text size affects every screenshot after this.
3. `feature` — A (reconciliation) with tests.
4. `feature` — B (net-worth snapshots and trend).
5. `feature` — C + D (monthly report, year in review) — both read B's snapshots.
6. `feature` — E (close-the-year wizard).
7. `feature` — H (calendar view + ICS).
8. `feature` — F (attachments) — largest; last among features.
9. `feature` — I (automatic backups).
10. `docs` — K.

Stop after commit 3 and report with screenshots of the wallet page and the wizard (mobile light/dark, desktop); then continue. Final report: screenshots of every changed screen, test counts, size-limit numbers, anything skipped with the reason.
