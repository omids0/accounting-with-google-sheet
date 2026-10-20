# UX Round 8 — Implementation Spec (shared spreadsheets, conflicts, Android widget)

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers.

Rounds 1–7.5 precede this and must be **merged** first (this round reads the round-7 hidden mode, the round-7.5 record columns, and the round-6 shortcut deep links). Still out of scope by decision: bottom navigation (never), module on/off switches, light-theme colors, any mobile redesign of the list pages, iOS widgets, any invitation/sharing UI (sharing is done in Google Drive).

Wireframe: `round8-shared-widget.html` — phone 1 (who recorded what, activity feed), phone 2 (conflict sheet), phone 3 (widget). Index: `index.html`.

The spec is written step by step with exact names on purpose. Follow the steps in order; each step ends with a check and a commit. Do not start the next step while the current one fails a check.

## Project rules (mandatory)

- 300-line hard limit per staged file (`npm run lines`); when a file you touch would pass 300, move a piece into a new file next to it.
- Reuse before create. Everything you need exists; each step says what to reuse.
- No tooling/config changes (`vite.config.ts`, `scripts/`, `tools/`, hooks, ESLint, Prettier, tsconfig, `package.json` scripts, size-limit). **No new npm dependencies.** Android: Java only (`android/app/src/main/java/com/omids0/accounting/…`), `RemoteViews` for the widget — no Kotlin, no Compose/Glance, no new Gradle dependencies.
- Commands that must pass before every commit: `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run lines`, `npx size-limit`. Prettier only on the files you changed, never on folders.
- New sheet tabs: constant in `src/services/sheetNames.ts`, headers in `sheetHeaders.ts`, entry in `moduleSheetSpecs.ts`, listed in `sheetSyncSheetNames.ts`, CSV via `useSheetImportExport` where the step says, included in the full backup automatically. New columns go at the **end** of the row.
- New localStorage keys: per spreadsheet and in `ACCOUNT_KEYS` in `src/services/localDataWipe.ts`, unless the step says "per device".
- Update About (`src/components/about/aboutFeatureGroups*.ts`) and `aboutChangelog.ts` (max 3 items). Bump `version` in `package.json` and the two root lines in `package-lock.json` (this round ships as **2.5.0**).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per step; branch `feature/ACCT-0/ACCT-0/ux-round-8` off `main`; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...feature/ACCT-0/ACCT-0/ux-round-8?expand=1`.
- Commit messages end with a blank line and `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Android is built by GitHub Actions only; you cannot compile Java here. Write small, null-safe Java; mirror the style of `banksms/BankSmsPlugin.java`. The owner tests the APK on a phone; list every Android file you add or change in the final report.
- Verify web changes with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md` (mobile 390×844, desktop 1440×900), light and dark; screenshots in the scratchpad `shots/r8/`.

## What the user gets (summary)

1. On a spreadsheet that several Google accounts edit, every record/check/installment/dang/receivable shows **who** recorded it (avatar + name), and lists get a «فقط من» filter. On a private spreadsheet nothing changes.
2. An **activity feed** («فعالیت»): who did what, when, on which device — in Settings always, and on the dashboard when the sheet is shared.
3. When two people edit the **same row** before the app synced, the app asks which version to keep instead of silently overwriting.
4. An **Android home-screen widget** with the net-available amount, this month's expense, pending SMS, next due item, and «+ هزینه / + درآمد / پیامک‌ها» buttons; it respects the hidden-amounts mode.

## Facts about the code you will touch (read first)

- The signed-in user: `getUserEmail()`, `getUserName()`, `getUserPicture()` in `src/services/auth.ts`.
- Drive access uses the `drive.file` scope; `src/services/drive.ts` has a private `driveRequest<T>(url)` and `DRIVE_API`. Export `driveRequest` (or add a sibling) for `files/{id}?fields=permissions(emailAddress,role,displayName)`.
- Every sheet write goes through the outbox: `src/services/syncOutbox.ts` (`OutboxOperation`: `append | update | delete | replace | attachment-upload`, each with `sheetName`; `update`/`delete` carry `rowNumber` and `expectedRow`), executed in `src/services/sheetsOutboxApi.ts` → `executeOutboxOperation`, driven by `flushPass` in `src/services/sheetSyncOutbox.ts`. `resolveRowAnywhere` (`sheetsRowLocate.ts`, using `resolveTargetRow` from `sheetsRowGuard.ts`) finds the row by id and throws `RowConflictError` only when the row is **gone**. Today a changed-but-present row is overwritten silently — Step 5 changes that.
- Row write helpers take `OutboxWriteOptions { skipActivity?, skipRevision? }`; `skipActivity` today means "do not bump the «فعالیت» status row". Keep that meaning.
- The existing «فعالیت» tab (`ACTIVITY_SHEET`, headers `['آخرین_بازدید', 'آخرین_عملیات']`, `src/services/activityTracking.ts`) is a two-cell status row for the nightly digest. **Leave it alone.** The feed is a new tab.
- Records are read by header label (`buildFieldColumnMap` in `sheetsHeaders.ts`); the «پیوست» column is appended at the end and located by label (`src/services/attachmentColumn.ts`, `src/utils/attachmentIds.ts`). Copy that pattern for «ثبت‌کننده».
- Fixed-layout tabs (`CHECKS_HEADERS`, `INSTALLMENTS_HEADERS`, `DANG_HEADERS`, `RECEIVABLES_HEADERS`) are read by position; appending a header at the end is safe.
- Yearly archive tabs: `archiveSheetName(base, year)` in `recordArchive.ts`, `copyRowsToArchive` / `deleteArchivedRows` in `recordArchiveMove.ts`.
- Dashboard data: `loadDashboardData` / `peekCachedDashboardData` in `src/services/dashboard.ts`; `DashboardData` (`src/types/dashboard.ts`) has `totalExpense`, `monthLabel`, `financial.netAvailable`, `recentRecords`. Upcoming items: `fetchDashboardReminderItems` in `dashboardReminders.ts`. Pending SMS: `getPendingBankSms()` in `bankSmsNative.ts` (Android only). Hidden mode: `readAmountsHidden()` in `src/stores/amountsHiddenStore.ts`.
- Native bridge pattern: `src/services/bankSmsNative.ts` (`registerPlugin<BankSmsPlugin>('BankSms')`, guarded by `Capacitor.isNativePlatform()`), Java `banksms/BankSmsPlugin.java` (`@PluginMethod`, `call.getString`, `call.resolve()`), registered in `MainActivity.java` with `registerPlugin(...)`. SharedPreferences example: `BankSmsStore.prefs(context)`.
- Deep links the widget buttons reuse: `com.omids0.accounting://entry?action=expense`, `…://entry?action=income`, `…://bank-sms` (see `android/app/src/main/res/xml/shortcuts.xml`; routed by `src/hooks/useLaunchAction.ts`).
- Busy state (no sheet while a form is open): `isUserBusy()` / `useUserBusy()` in `src/hooks/useUserBusy.ts`.
- Lists: `useListFilters` (`src/hooks/useListFilters.ts`) already has `getCounterparty`; add an optional `getWriter` the same way. Records use `useRecordsFilters.ts` (round 7.5 added «طرف حساب» and «با اقلام» there — follow that code).
- Settings sections: the `sections` array in `src/components/settings/SettingsPage.tsx` (ids `general`, `display`, `account`, …). Add new sections there.

## Step 1 — Writer column and shared detection (A1)

Files: `src/utils/writerColumn.ts` (new, pure), `src/services/writerColumn.ts` (new, mirrors `attachmentColumn.ts`), `src/services/sheetHeaders.ts` (append `'ثبت‌کننده'` to `CHECKS_HEADERS`, `INSTALLMENTS_HEADERS`, `DANG_HEADERS`, `RECEIVABLES_HEADERS`), `src/services/sheetsRecords.ts` (+ `writer: string` on `SheetRecord`, filled like `attachments`), the create/update paths of records (`appendRecord`, `updateRecord`), checks (`checks.ts`), installments (`installmentsCrud.ts`), dang (`dang.ts`), receivables (the service the page uses), `src/services/sharing.ts` (new), `src/hooks/useSharing.ts` (new), `localDataWipe.ts`.

- `WRITER_HEADER = 'ثبت‌کننده'`. On every **create and update** the app makes, set the cell to `getUserEmail() ?? ''`. Record tabs: append the header once at the end if missing (same code path that appends «پیوست»); fixed tabs: the new last column.
- Reading: `SheetRecord.writer`; the check/installment/dang/receivable entity types get `writer?: string` (parse from the last column; `''` for old rows).
- `src/services/sharing.ts`:
  ```ts
  export interface SharingInfo { shared: boolean; editors: { email: string; name: string }[]; checkedAt: number }
  export const SHARING_KEY = 'accounting_sharing_v1'            // per spreadsheet → ACCOUNT_KEYS
  export async function refreshSharingInfo(spreadsheetId: string): Promise<SharingInfo>
  // Drive files.get?fields=permissions(emailAddress,role,displayName); shared = count(role in owner|writer) > 1;
  // on any error keep the cached value, or { shared: false } when none
  export function getSharingInfo(spreadsheetId: string): SharingInfo | null
  export function isSharedSpreadsheet(spreadsheetId: string): boolean
  export function writerLabel(email: string, info: SharingInfo | null): { initial: string; name: string; isMe: boolean }
  // name: editor displayName from Drive if known, else the part before '@'; isMe = email === getUserEmail()
  ```
  Refresh at most once per 24 h, on app start after the first sync (`initializeSheetSync` in `sheetSyncLifecycle.ts` is the place; fire-and-forget).
- `useSharing()` hook returns `{ shared, label(email) }` from a small Zustand store updated by `refreshSharingInfo`.
- Tests (`sharing.test.ts`, `writerColumn.test.ts`): shared detection from a permissions fixture (one owner → false; owner + writer → true; reader only → false; error → cached), `writerLabel` cases, header append once, writer parse on old rows.

**Check:** all commands; a saved record on your test sheet has the email in the new last column. **Commit:** `feature/ACCT-0/ACCT-0/Record who wrote each row and detect shared spreadsheets`.

## Step 2 — Avatars and the «فقط من» filter (A1 UI)

Wireframe phone 1 (list rows). Files: new `src/components/WriterAvatar.tsx` (22 px circle, initial letter; tint `me` = muted grey, others = the gold accent used by goal cards; `aria-label` = name), `src/components/records/RecordsListRow.tsx`, the card components of checks/installments/dang/receivables (find the exact names under `src/components/<module>/`), `DashboardRecentBlock.tsx`, `src/services/globalSearchEntries.ts` (writer name in `text` and subtitle), `useListFilters.ts` (+ `getWriter`), `useRecordsFilters.ts`, filter modals of the five modules, desktop `DataTable` columns.

- Only when `useSharing().shared` is true: show `<WriterAvatar>` + name before the category in the row meta («سارا · خانه · ملت»); old rows without a writer show nothing extra.
- Filter chip «فقط من» (toggle) in the five list pages' filter modals and `ActiveFilterChips`; predicate `writer === getUserEmail()`. Hidden when not shared.
- Dashboard recent rows and search results: the avatar only (no name) when shared.

**Check:** screenshots of records and checks with sharing mocked on (mock the Drive permissions call in the Playwright script with two writers) and off. **Commit:** `feature/ACCT-0/ACCT-0/Show who recorded each row on shared spreadsheets and filter to my rows`.

## Step 3 — Activity feed tab (A2)

Wireframe phone 1 (lower half). Files: `sheetNames.ts` (`ACTIVITY_LOG_SHEET = 'فعالیت_ها'`), `sheetHeaders.ts` (`ACTIVITY_LOG_HEADERS = ['شناسه', 'زمان', 'کاربر', 'نام', 'عمل', 'ماژول', 'شناسه مورد', 'خلاصه', 'دستگاه']`), `moduleSheetSpecs.ts`, `sheetSyncSheetNames.ts`, new `src/services/activityLog.ts` (+ `activityLogText.ts` for the Persian summaries, + tests), the write paths touched in Step 1 plus budgets (`useCategoryBudgets` save/delete), category actions (`categoryManage.ts`), reconciliation (the round-7 wallet reconcile service), recurring posts, goal deposits, paid toggles (`usePaidItemActions`).

- `activityLog.ts`:
  ```ts
  export type ActivityAction = 'create' | 'update' | 'delete' | 'pay' | 'unpay' | 'budget' | 'category' | 'reconcile' | 'recurring' | 'goal'
  export interface ActivityEntry { id: string; at: string; email: string; name: string; action: ActivityAction; module: string; itemId: string; summary: string; device: string }
  export function logActivity(spreadsheetId: string, entry: Omit<ActivityEntry, 'id' | 'at' | 'email' | 'name' | 'device'>): void
  // builds the row and queues ONE outbox append on ACTIVITY_LOG_SHEET with writeOptions { skipActivity: true, skipRevision: true }
  // right after the operation it describes; never throws; no-op when signed out
  export function deviceLabel(): string   // 'Android' | 'Web · Chrome' …; reuse the device-label helper the push subscriptions use
  export async function fetchActivityLog(spreadsheetId: string, limit: number, offset: number): Promise<ActivityEntry[]>  // newest first, from the local mirror
  export const ACTIVITY_LOG_KEEP = 2000
  export async function sweepActivityLog(spreadsheetId: string): Promise<void>
  // when the tab has > 2000 rows: move the oldest into `فعالیت_ها_<Jalali year>` with archiveSheetName/copyRowsToArchive/deleteArchivedRows;
  // run from the existing archive sweep after a pull
  ```
- `activityLogText.ts` → `summaryFor(action, module, title, extra)` returns the Persian line the wireframe shows: ««تعمیر یخچال» را ثبت کرد», «قسط مهر وام مسکن را پرداخت‌شده زد», «بودجهٔ «خوراک» را به ۹۰۰ هزار تغییر داد». The UI prefixes the name («سارا …» / «من …»).
- Call `logActivity` from every user-initiated write listed above (one call per operation; bulk actions one call with the count). Sync pulls, archive sweeps, seeding and backups do **not** log.
- Tests: summary text per action, row shape, the 2000-row sweep plan (pure part), no-op when signed out.

**Check:** after a save, the «فعالیت_ها» tab has one row. **Commit:** `feature/ACCT-0/ACCT-0/Write an activity log row for every change`.

## Step 4 — Activity UI (A2)

Files: new `src/components/activity/ActivityPage.tsx` (+ `ActivityList.tsx`, `ActivityRow.tsx`, `useActivityPage.ts`), tab `activity` («فعالیت»), path `/settings/activity`, lazy route (`lazyPages.ts`, `AppRoutes.tsx`), Settings section «فعالیت» (link card, like «دسته‌ها»), new `src/components/dashboard/DashboardActivityBlock.tsx`, `DashboardPage` block order.

- Page: newest first, 50 per page with «بیشتر»; filter chips: person (from the editors list + «من») and module; desktop as a `DataTable` (time, person, action, summary, device). Rows: `WriterAvatar`, «<name> <summary>», meta «<relative time> · <device>» (reuse the relative-time helper the SMS duplicate badge uses).
- Dashboard: `DashboardActivityBlock` («فعالیت اخیر», three rows + «همه ←» to the page) placed right under «تراکنش‌های اخیر»; rendered **only when shared**. Skeleton parity: add the block to the dashboard skeleton behind the same condition.
- CSV export of the tab from the activity page speed dial (`useSheetImportExport`, export only).
- About: new group «با هم» (`aboutFeatureGroupsShared.ts`, new file): who recorded what, «فقط من», activity, and the sentence that the app lock, hidden mode, text size and nudges stay per device while budgets, categories, recurring items and goals are shared.

**Check:** screenshots (mobile light/dark, desktop) with sharing mocked on. **Commit:** `feature/ACCT-0/ACCT-0/Add the activity page and the dashboard activity block`.

## Step 5 — Edit conflicts (B)

Wireframe phone 2. Files: `src/services/syncOutbox.ts` (`OutboxEntry.conflict?`), new `src/services/rowConflict.ts` (pure detection), `src/services/sheetsOutboxApi.ts` (`case 'update'`), `src/services/sheetSyncOutbox.ts` (`flushPass`), new `src/stores/conflictStore.ts`, new `src/components/sync/ConflictSheet.tsx` (+ `ConflictDiff.tsx`), mounted in `Layout.tsx` next to the update banner, tests.

**Rule.** Only an `update` can conflict, and only when the row the device read (`expectedRow`) was changed by **another user** before this write lands. Inserts and deletes never conflict.

- `rowConflict.ts`:
  ```ts
  export interface RowConflict { entryId: string; sheetName: string; rowNumber: number; mine: string[]; theirs: string[]; base: string[]; theirEmail: string; theirAt: string }
  export function detectRowConflict(base: string[] | undefined, current: string[], mine: string[], myEmail: string, writerColumn: number): 'none' | 'conflict'
  // 'none' when: no base; current equals base (rowsMatchForCompare); current equals mine; writerColumn < 0;
  // current[writerColumn] is '' or myEmail. Otherwise 'conflict'.
  export function diffCells(headers: string[], mine: string[], theirs: string[]): { label: string; mine: string; theirs: string }[]
  ```
- In `executeOutboxOperation` `case 'update'`: after `resolveRowAnywhere`, read the current row from the guard session snapshot (`loadSnapshot` already caches the tab); call `detectRowConflict` with the tab's writer column (`findWriterColumn` from Step 1). On `'conflict'` throw a new `RowEditConflictError` carrying `theirs`, `theirEmail`, and the row's «زمان ویرایش»/`createdAt` cell if the tab has one (else `''`).
- In `flushPass`: catch `RowEditConflictError` → mark the entry `conflict: { theirs, theirEmail, theirAt }` (keep it in the outbox, **do not** revert, **do not** retry: `flushPass` skips entries with `conflict` set), push it into `conflictStore`, `continue`.
- `ConflictSheet` (`FormModal`, bottom sheet / panel at xl): title «این رکورد هم‌زمان عوض شده», text ««<title>» را تو و <name> هر دو ویرایش کردید. کدام بماند؟», two radio options «نسخهٔ <name> · <time>» (first, preselected) and «نسخهٔ من · <time>» each with a one-line summary (amount · category · account from `diffCells`), buttons «نگه دار» and «هر دو را ببین» (expands the full `diffCells` table in place). Shown only when `!isUserBusy()`; one conflict at a time; never auto-resolved.
  - Keep theirs: remove the outbox entry, apply `theirs` to the local mirror row (`setSheetAllRows` on that tab, or `forgetSeenSheets` + `refreshInBackground` to re-pull it), log activity «نسخهٔ من کنار گذاشته شد» with the record title.
  - Keep mine: set the entry's `expectedRow = theirs`, clear `conflict`, flush; log «نسخهٔ <name> کنار گذاشته شد».
- Sync badge / `SyncDetailsModal`: show «N تعارض» with a button that opens the sheet, so a dismissed sheet can be reopened.
- Keep detection in services behind `detectRowConflict` — the future backend reuses it (see the memory file `project_backend_readiness.md`).
- Tests: the detection matrix (no base / same as base / same as mine / writer empty / writer me / writer other), `flushPass` parking an entry and skipping it on the next pass, both resolutions (outbox state + activity row), `diffCells`.

**Check:** a Playwright flow with the mocked API returning a row whose writer is another email → sheet appears after the open form closes; both buttons work. **Commit:** `feature/ACCT-0/ACCT-0/Ask which version to keep when two people edit the same row`.

## Step 6 — Widget snapshot (C, web side)

Files: new `src/services/widgetSnapshot.ts` (+ test), new `src/services/widgetNative.ts`, call sites: after `fullSyncFromRemote` / `refreshInBackground` finish and after every successful local write (the same hook that invalidates the dashboard cache), and on app resume (`App.addListener('resume')` where the launch hook lives).

- ```ts
  export interface WidgetSnapshot { netAvailable: number; monthExpense: number; monthLabel: string; pendingSms: number; nextDue: { title: string; day: string; amount: number } | null; updatedAt: string; hidden: boolean; sheetLabel: string; accountsLabel: string }
  export async function buildWidgetSnapshot(spreadsheetId: string): Promise<WidgetSnapshot | null>
  // dashboard data via loadDashboardData (cached); nextDue via fetchDashboardReminderItems (first upcoming, overdue first);
  // pendingSms via getPendingBankSms().length; hidden via readAmountsHidden();
  // accountsLabel = bank account titles joined by « و » (max 2, then «و N دیگر»); monthLabel from DashboardData
  export function formatWidgetAmount(amount: number): string  // «۲۹٬۷۷۰٬۰۰۰» (formatMoney)
  export function formatWidgetShort(amount: number): string   // «۲۹٫۸ م» / «۸۵۰ هزار» / «۱۲٬۰۰۰»
  ```
- `widgetNative.ts`: `registerPlugin<WidgetBridgePlugin>('WidgetBridge')` with one method `setSnapshot({ json: string })`; `pushWidgetSnapshot(spreadsheetId)` = build → `JSON.stringify` → call; no-op on web (`Capacitor.isNativePlatform()` false). Debounce 2 s so bursts of writes send once. Also send when the hidden-mode toggle changes.
- Signed out / no spreadsheet → send `{ "empty": true }`.
- Tests: snapshot building from fixtures (hidden flag, nextDue pick, labels), both formatters with Persian digits, no call on web.

**Check:** unit tests. **Commit:** `feature/ACCT-0/ACCT-0/Build and push the home-screen widget snapshot`.

## Step 7 — Android widget (C, native side)

Files (all new unless noted): `android/app/src/main/java/com/omids0/accounting/widget/WidgetBridgePlugin.java`, `widget/WidgetStore.java`, `widget/AccountingWidgetProvider.java` (+ `LargeWidgetProvider.java`, `SmallWidgetProvider.java`), `widget/WidgetText.java`, `android/app/src/main/res/layout/widget_large.xml`, `res/layout/widget_small.xml`, `res/layout/widget_empty.xml`, `res/xml/widget_large_info.xml`, `res/xml/widget_small_info.xml`, `res/drawable/widget_bg.xml` + `res/drawable-night/widget_bg.xml` (rounded rect), `res/values/strings.xml` (+ widget strings), `AndroidManifest.xml` (two `<receiver>` entries with `android.appwidget.action.APPWIDGET_UPDATE` and `meta-data android.appwidget.provider`), `MainActivity.java` (`registerPlugin(WidgetBridgePlugin.class)`).

- `WidgetBridgePlugin.setSnapshot(call)`: `WidgetStore.save(context, call.getString("json", ""))` then `AccountingWidgetProvider.refreshAll(context)` (`AppWidgetManager.getInstance` → `getAppWidgetIds` for both providers → `updateAppWidget`). `call.resolve()`.
- `WidgetStore`: SharedPreferences `"accounting_widget"`, key `"snapshot"`; `load(context)` returns the JSON string or `""`.
- `AccountingWidgetProvider extends AppWidgetProvider`; the two subclasses only choose the layout. `onUpdate` → for each id `buildViews(context, large)` → `RemoteViews`. Parse the JSON with `org.json.JSONObject` inside `try/catch`; any failure or `"empty": true` → `widget_empty.xml` (app name + «باز کن»). `hidden == true` → amounts replaced by `"••••••"`.
  - Large (4×2, `minWidth 250dp`, `minHeight 110dp`): title «حساب کتاب · <accountsLabel>» + `updatedAt` time (HH:mm, Persian digits), the big amount, the line «هزینهٔ <monthLabel> <short expense> · <pendingSms> پیامک ثبت‌نشده · <nextDue.title> <nextDue.day>» (skip empty parts), three buttons.
  - Small (2×2, `minWidth 110dp`, `minHeight 110dp`): «دارایی قابل اتکا», short amount, one «+ هزینه» button.
  - `updatePeriodMillis="0"`; `resizeMode="horizontal|vertical"`; `widgetCategory="home_screen"`; preview = the launcher icon.
- Buttons: `PendingIntent.getActivity` with an explicit `Intent(Intent.ACTION_VIEW, Uri.parse("com.omids0.accounting://entry?action=expense"))` targeting `MainActivity` (`setClass`), flags `FLAG_UPDATE_CURRENT | FLAG_IMMUTABLE`, distinct request codes per button. The widget body opens the app (`…://dashboard` — add that URI to `useLaunchAction` as "open the dashboard").
- `WidgetText`: Persian digits + thousands separator «٬» and the short-form rules of `formatWidgetShort`; the month label arrives in the JSON, never computed natively. Layouts use `android:textDirection="rtl"`, `android:layoutDirection="rtl"`, and day/night colors through `drawable-night` and a `values-night/colors.xml`.
- Nothing in the widget touches the network or Google.
- About: platform group gets «ویجت صفحهٔ اصلی» (how to add it, what it shows, hidden mode). Settings «نمایش»: a one-line hint «ویجت را از منوی لانچر اضافه کن».

**Check:** `npm run types/lint/test/build/lines` (web code unchanged besides About); every XML well-formed (`xmllint --noout` if available, otherwise check each file's tags by eye); every Java file: imports present, no Kotlin syntax, braces balanced. **Commit:** `feature/ACCT-0/ACCT-0/Add the Android home-screen widget`. In the report list the files for the owner's review and the two things to test on the phone: adding both sizes, and the buttons opening the right screen.

## Step 8 — About, changelog, version

- About: Step 4 added «با هم»; Step 7 added the widget. Re-read both for accuracy against what you built.
- `aboutChangelog.ts`: version `2.5.0`, items: «نمایش ثبت‌کننده و فعالیت روی شیت‌های مشترک», «پرسش هنگام ویرایش هم‌زمان یک رکورد», «ویجت صفحهٔ اصلی اندروید».
- Bump to 2.5.0.

**Commit:** `docs/ACCT-0/ACCT-0/Describe shared spreadsheets and the widget in About and bump to 2.5.0`. Run `npm run build` once more, push, give the compare link.

## Acceptance (the owner checks these)

- Private sheet: no avatars, no «فقط من», no dashboard activity block; the activity page still lists changes.
- Shared sheet (two Google accounts): rows show the other person's avatar and name; «فقط من» hides theirs; the dashboard shows «فعالیت اخیر».
- Both people edit the same record before a sync: the second one sees the conflict sheet (after closing any open form); «نگه دار» on either option leaves one version in the sheet and one line in «فعالیت_ها».
- Widget: both sizes add to the home screen; numbers match the dashboard after a sync; hidden mode shows dots; the three buttons open the entry form (expense/income) and the SMS page; signed out shows «باز کن».
- All checks pass; size-limit under the limit; a11y suite light + dark passes.

## Out of scope (do not build)

Invitations or permission management inside the app, real-time presence, per-user budgets, conflict handling for inserts/deletes, merging field by field, iOS widgets, widget configuration screens, periodic native refresh.
