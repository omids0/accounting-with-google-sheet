# UX Round 8 — Implementation Spec

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers or where this document says "ask first".

Rounds 1–7 precede this (`IMPLEMENTATION-SPEC.md`, `UX-ROUND2-SPEC.md` … `UX-ROUND7-SPEC.md`). Round 7 must be merged first: Task C here reads the round-7 hidden mode, and Task A reuses the round-7 activity model only if it exists (it does not — see A2). Still out of scope by decision: bottom navigation (never), module on/off switches, light-theme colors, any mobile redesign of the list pages, iOS widgets.

Wireframes: `round8-shared-widget.html` phones 1–2 (A, B), phone 3 (C). Index: `index.html`.

## Project rules (mandatory)

- 300-line hard limit per staged file; extract rather than grow.
- Reuse before create (`DataTable`, `FormModal`, `useListFilters`, `handleSheetError`, `sheetRevisions.ts`, `syncOutbox.ts`, `launchAction.ts`, `useAmountsHidden`, …).
- No tooling/config changes without permission. **This spec approves:** the Android widget sources under `android/app/src/main/` (Java, `RemoteViews`; no Kotlin, no Compose/Glance — the project has no Kotlin toolchain), the widget `AppWidgetProvider` entry in `AndroidManifest.xml`, and one new `BankSmsPlugin`-style Capacitor method for writing the widget JSON. Nothing in `vite.config.ts`, `scripts/`, `tools/` or the hooks.
- `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run size-limit` (900 KB) and the a11y suite (light + dark) must pass; Prettier only on touched files.
- New sheet columns go at the **end** of the row; new tabs follow the round-6 rules (`sheetNames.ts`, `sheetHeaders.ts`, `moduleSheetSpecs.ts`, CSV, backup).
- Every new localStorage key: per spreadsheet and in `ACCOUNT_KEYS`, unless the spec says "per device".
- Update About and `aboutChangelog.ts` for every user-visible change; bump the version (this round ships as **2.4.0**).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per task group; branch off `main`; no `gh` CLI; after push give the compare link.
- Android is built by GitHub Actions only; the owner tests the APK on their phone. The widget cannot be run locally — expect review rounds; keep the Java small and defensive (never crash the launcher: every read is null-safe, every failure renders the «باز کن» fallback).
- Verify web changes with the Playwright recipe in `reference_playwright_sw_mocks.md` (mobile 390×844, desktop 1440×900), light and dark.

## Task A — Several people on one spreadsheet

**Why.** Sharing is already possible: the owner shares the Google Sheet from Drive and both sign in. The app just cannot say *who* recorded or changed what. Wireframe `round8-shared-widget.html` phone 1. Sharing itself stays in Google Drive; the app adds no invitation flow.

### A1 — Who recorded it

- New last column «ثبت‌کننده» on the record tabs (income/expense and their custom forms), checks, installments, dang, receivables: the Google account email of the writer, set on create and on every update of that row (the updater replaces it). Old rows stay empty.
- **Shared detection:** `isSharedSpreadsheet` = the spreadsheet's Drive file has more than one permission of role `writer`/`owner` (Drive API `files.get?fields=permissions` under the existing `drive.file` scope; cache in `accounting_sharing_v1` per spreadsheet for 24 h; fall back to "not shared" on error). The user's own display name and avatar come from the existing sign-in profile; other editors are shown by the local part of their email until they open the app once — then their profile name/avatar are read from the Task A2 feed rows they wrote.
- **UI, only when shared:** a 22 px avatar (initial letter, two fixed tints: me = grey, others = gold) plus the name before the category in list rows («سارا · خانه · ملت»), on the dashboard's recent rows and in the search results. Filter chip «فقط من» in `useListFilters` for the five modules. Not shared → nothing changes anywhere.

### A2 — Activity feed

- The existing `ACTIVITY_SHEET` («فعالیت», headers «آخرین_بازدید», «آخرین_عملیات») is a two-cell status row used by the nightly digest — **keep it**. The feed is a new tab `ACTIVITY_LOG_SHEET = 'فعالیت_ها'`: `شناسه, زمان, کاربر (email), نام, عمل (create|update|delete|pay|budget|category|reconcile|settings), ماژول, شناسه مورد, خلاصه, دستگاه`. Written through the outbox after every write the app makes on behalf of the user, one row per operation, batched with the operation itself; capped: the sweep keeps the newest 2 000 rows (archive the rest into «فعالیت_ها_<year>» with the round-4 archive helper).
- Summary text is built in the app from the operation (Persian): «سارا «تعمیر یخچال» را ثبت کرد», «من قسط مهر وام مسکن را پرداخت‌شده زدم», «سارا بودجهٔ «خوراک» را به ۹۰۰ هزار تغییر داد».
- **Where:** Settings → «فعالیت» (full list, newest first, 50 per page, filter by person and module; desktop `DataTable`); and, **only when shared**, a «فعالیت اخیر» block under «تراکنش‌های اخیر» on the dashboard (three rows + «همه ←»).
- Not shared: the tab is still written (it is the audit trail for the future backend), only the dashboard block is hidden.
- Budgets, categories, recurring items and goals are shared data (they live in the sheet); the app lock, hidden mode, text size and nudge state stay per device — About says so.

### A3 — Tests

Column append/update of «ثبت‌کننده», shared detection from a permissions fixture, summary text per action, feed batching, the 2 000-row cap.

## Task B — Edit conflicts

Wireframe `round8-shared-widget.html` phone 2.

**Today** the outbox lets the last writer win silently. **Rule:** only an *update* can conflict, and only when the row this device read was changed by someone else between the read and the write. Inserts and deletes never conflict (a delete of a row the other person just edited still deletes; it shows in the feed).

- Mechanism: the outbox update operation carries the sheet revision (`sheetRevisions.ts`) and the row's «زمان ویرایش»/writer it was based on. Before writing, `flushOutbox` re-reads that row (one `values.get`); if the row's «ثبت‌کننده» is another user **and** its timestamp is newer than the base, the operation is parked (`status: 'conflict'`, kept in the outbox, not retried) and the UI opens the sheet below once the page is visible.
- Sheet «این رکورد هم‌زمان عوض شده»: ««<title>» را تو و <name> هر دو ویرایش کردید. کدام بماند؟» with two radio options «نسخهٔ <name> · <time>» (theirs — their amount, category and account on one line) and «نسخهٔ من · <time>» (mine); buttons «نگه دار» and «هر دو را ببین» (opens a side-by-side diff of every differing field; from there the same two choices). Keeping theirs = drop my operation; keeping mine = rewrite my operation against the new revision and flush. The losing version is written to the Task A2 feed as «نسخهٔ … کنار گذاشته شد» so nothing is lost silently.
- Several conflicts queue; the sheet handles them one at a time. Never auto-resolve; never show while a `FormModal` is open (round-6 `useUserBusy`).
- This is the mechanism the future backend needs (see the agent memory `project_backend_readiness.md`): keep the detection in `src/services` behind a small interface (`detectRowConflict(base, current)`), not in components.
- **Tests.** Conflict detection matrix (same user / other user × older / newer timestamp), park-and-resume of the outbox, both resolutions, feed row on resolve.

## Task C — Android home-screen widget

Wireframe `round8-shared-widget.html` phone 3. Android only (no iOS widget; owner decision).

- **Data:** after every successful sync (and after every local write that changes the dashboard), the app writes a small JSON to the native side through a new plugin method `WidgetBridge.setSnapshot(json)` (Java, same style as `BankSmsPlugin`): `{ netAvailable, monthExpense, pendingSms, nextDue: { title, day, amount } | null, updatedAt, hidden, sheetLabel, accountsLabel }`, stored in `SharedPreferences`, and triggers `AppWidgetManager.notifyAppWidgetViewDataChanged` / an update broadcast. The widget **only reads**; no network, no Google calls.
- **Sizes** (`RemoteViews`, XML layouts; theme follows the system day/night):
  1. **4×2 full:** title «حساب کتاب · <accountsLabel>» + time, the big net-available amount, one line «هزینهٔ مهر ۱۹٫۴ میلیون · ۳ پیامک ثبت‌نشده · قسط ۵ مهر», three buttons «+ هزینه» (primary), «+ درآمد», «پیامک‌ها N».
  2. **2×2 small:** label «دارایی قابل اتکا», the amount in short form («۲۹٫۸ م»), one «+ هزینه» button.
  3. **Hidden state:** when the round-7 hidden mode is on, both sizes render «••••••» instead of amounts (the JSON carries `hidden`).
- **Buttons** = the round-6 shortcut deep links (`com.omids0.accounting://entry?action=expense|income`, `…://bank-sms`) through `PendingIntent` to `MainActivity`; the app's `useLaunchAction` already handles them.
- **Number formatting** in Java: Persian digits and thousands separators like the app (`٬`), short form «م» for millions / «هزار» for thousands; the month name comes in the JSON (built in the app), not computed natively.
- Empty state (no snapshot yet, or signed out): the widget shows the app name and «باز کن».
- **Staleness:** the widget shows the `updatedAt` time; the app refreshes the snapshot on resume, so no periodic native refresh is needed (`updatePeriodMillis = 0`).
- **Settings:** a line in «پلتفرم» explaining how to add the widget; About entry.
- **Tests.** The snapshot builder in TypeScript (hidden flag, short formats, next due pick) is unit-tested; Java is reviewed by reading and tested by the owner on the phone.

## Task D — About and version

Update About: a new group «با هم» (shared spreadsheets: who recorded what, activity, conflicts, what stays per device) and the platform group (widget). Add the 2.4.0 entries to `aboutChangelog.ts` (shared mode, conflict sheet, widget). Bump to 2.4.0.

## Suggested order and commits

1. `feature` — A1 (writer column + shared detection + avatars/filter).
2. `feature` — A2 (activity feed tab, settings page, dashboard block).
3. `feature` — B (conflicts) with tests.
4. `feature` — C (widget: TypeScript snapshot + Java widget + manifest).
5. `docs` — D.

Stop after commit 2 and report with screenshots of a shared list page and the activity page (mobile light/dark, desktop); then continue. Final report: screenshots of every changed web screen, the Java/XML files added for the widget listed for the owner's review, test counts, size-limit numbers, anything skipped with the reason.
