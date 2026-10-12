# UX Round 4 — Implementation Spec

Audience: the Claude agent that will implement this. Decisions were approved by the product owner; do not re-litigate them. Ask only about technical blockers or where this document says "ask first".

Rounds 1–3 are merged (`IMPLEMENTATION-SPEC.md`, `UX-ROUND2-SPEC.md`, `UX-ROUND3-SPEC.md`). This round comes from a static audit of flows never reviewed before plus performance measurements. Out of scope by decision: bottom navigation changes, module on/off switches, light-theme changes, keyboard/tablet polish (deferred until real-user feedback).

Wireframe for the two settings screens of this round: `wireframes/notifications-lock.html`.

## Project rules (mandatory)

- 300-line hard limit per staged file (`src/services/settings.ts` 299, `src/components/DataEntryForm.tsx` 298: extract, never grow).
- Reuse before create. No tooling/config changes without the owner's explicit permission, **except** the two changes this spec approves: editing `scripts/run-lighthouse.mjs` (Task C.6) and adding the Capacitor plugins named in Tasks E and F to `package.json`.
- `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run size-limit` must pass; Prettier only on touched files.
- Update About (`src/components/about/aboutFeatureGroups*.ts`) for every user-visible change; bump `version` in `package.json` and the two root `version` lines in `package-lock.json` (next: 1.22.0, or 2.0.0 if the owner prefers for the rename — ask in the first report).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per task group; branch off `main`; commit the untracked `wireframes/` files first; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...<branch>?expand=1`.
- Android cannot be built on this machine (no JDK/Android Studio); the APK is built by GitHub Actions. Native changes must be reviewed by reading, and the owner tests the APK.
- Verify visually with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md`.

## Task A — Bugs found by the audit

Each item: verified in code (✔) or inferred (?) — confirm the inferred ones first.

A1 ✔ **Reminder rules cannot be enabled in the APK.** `src/components/reminders/useRemindersPage.ts:201-205` refuses to save an enabled rule when `hasSubscription` is false; `hasSubscription` is web push only (lines 128-131) and native never registers a service worker. Fix: on native, the gate is "notification permission granted" (`LocalNotifications.checkPermissions`), not a push subscription; offer the permission request inline when missing. Then `refreshScheduledReminders` runs after save.

A2 ✔ **Failed sync writes are unrecoverable.** `SyncStatusBadge.tsx` modal lists `• <tab>: <message>` only, and «متوجه شدم» calls `dismissFailedWrites` which deletes them; the local mirror keeps showing the change until the next pull. Fix: (a) each failed entry shows what it was — operation (افزودن/ویرایش/حذف), the row's title/amount/date from `operation.row` where available, and the Persian cause via `toUserMessage`; (b) actions per entry: «تلاش دوباره» (requeue to outbox), «کپی جزئیات», «حذف»; (c) when an entry is moved to failed, revert that row in the local mirror (or mark it visually «ثبت نشد») so the UI stops lying; (d) `confirmDeleteMessageClass` or the modal body gets `whitespace-pre-line` / a real list. Keep the 50-entry cap.

A3 ✔ **A blocked queue looks like saving.** `SyncStatusBadge.tsx:43-63`: `pendingWrites` and `syncing` outrank `failedWrites`/`lastError`. Fix: error outranks pending; label «ذخیره متوقف شد (N در انتظار)» with the cause; tapping the badge opens the same details modal (works on touch, unlike the `title` tooltip). Treat 403 as permanent in `sheetsApi.ts:58` only when the message is a permission error (`isSpreadsheetAccessDeniedError`), otherwise keep retrying.

A4 ✔ **Switching spreadsheets leaves the sync engine on the old sheet.** `initializeSheetSync` is called only from `App.tsx`. Fix: `useSettingsPage` switch/create path → `resetSheetSync(old)` then `initializeSheetSync(new)`, re-run `refreshScheduledReminders`/push upsert for the new sheet; before switching, if the old sheet's outbox is not empty, confirm with «N تغییر هنوز به شیت فعلی نرسیده؛ اول همگام شود یا جابه‌جا شویم؟» offering «اول همگام کن». Show the active sheet name in the Settings header area (not only inside the select) and in the drawer footer under the app name.

A5 ✔ **Escape closes nested overlays together.** `useModalLock.ts:48-54` adds one `document` keydown listener per open modal; `Select`, the drawer and the speed dial do the same. Fix: Escape goes through the overlay stack from round 3 (`closeTopOverlay()`), handled once by a single global listener; remove the per-component Escape handlers. Also: initial focus lands on the first field, not ✕; `aria-labelledby` ids are unique per instance (`useId`).

A6 ✔ **Cancelling the import file picker locks the confirm modal.** `src/utils/csv.ts:124-140` `pickTextFile` never resolves without `onchange`. Fix: handle the `cancel` event (Chrome 113+/Firefox/Safari 16.4+) and a `window` focus fallback after 1 s with no file → resolve `null`; the caller resets `confirming`.

A7 ✔ **Session expiry is unexplained.** `App.tsx` start-up: cached dashboard shows, then silent refresh fails → bare login page. Fix: pass a reason to `LoginPage` (`reason: 'expired'`) that renders a compact variant: «نشست شما منقضی شده. اطلاعات روی این دستگاه محفوظ است؛ برای ادامه دوباره وارد شوید.» plus the pending-writes count if any; no marketing bullets in that variant.

A8 ✔ **Returning user sees the new-user empty state.** Dashboard default range is the current month; on day 1 or after a long absence it shows «هنوز تراکنشی در این دوره ثبت نشده» + «ثبت اولین تراکنش». Fix: when the sheet has records outside the range, show «در این بازه تراکنشی نیست» with actions «ماه قبل» and «ثبت تراکنش»; keep the «اولین» wording only when the sheet has no records at all (reuse `countRecordRows` from `services/onboarding.ts`).

A9 (?) **Re-importing a CSV duplicates rows and ids.** `src/services/importExport.ts` keeps the CSV's id (`newImportId` path); duplicates later break `findRowIndexById` with a misleading conflict message. Covered by Task E (import preview + de-duplication). Also fix the conflict copy in `sheetsRowGuard.ts:9` to mention duplicates: «این ردیف پیدا نشد یا چند بار تکرار شده».

A10 ✔ **Developer jargon in user screens.** `PushStatusSection.tsx` («Service Worker», «VAPID», «dev را restart یا deploy کنید»), `CronSetupSection.tsx` (cron/Cloudflare/npx) shown on Android, `SettingsRemindersCard.tsx:19` «نوتیف PWA», typo «نوتیf». Covered by Task B's screen redesign; remove or move developer setup behind a collapsed «تنظیمات پیشرفته (برای توسعه‌دهنده)» section that never shows on native.

## Task B — Notifications: on by default, nightly digest, no jargon

**Decisions.** Reminders are ON by default; the user turns them off if bothered. One nightly digest around 21:00 that says what was left undone today. Permission is asked only after the user taps something that needs it, with one sentence of context. No developer jargon anywhere a normal user can reach.

**Facts to build on** (from the inventory): web push = `src/services/pushNotifications.ts` + Apps Script cron `scripts/google-apps-script/RemindersCron.gs` (15-minute trigger) + Cloudflare relay; Android = `src/services/localNotifications.ts` (30-day horizon, 64 max, `daily` and vehicle kinds ignored) + native `BankSmsDailyCheck.java` at 10:00; `useEngagementReminders.ts` auto-prompts web permission with no click; rules in sheet tab «یادآوری», defaults in `reminders.ts:51-60`.

**Do.**
1. **Defaults**: `DEFAULT_RULES` → installments, checks, dang, personal: `enabled: true`, hour 9 (keep daysBefore); vehicle kinds stay off (only matter when a vehicle exists). Existing users: a one-time migration flag (`accounting_reminder_defaults_v2`) that turns the four on **once** unless the user had explicitly saved rules (any row in the «یادآوری» tab) — do not override explicit choices.
2. **Nightly digest** — new kind `nightly` (label «جمع‌بندی شبانه», default on, 21:00):
   - Android: a native receiver modelled on `BankSmsDailyCheck.java` (`HOUR_OF_DAY = 21`, inexact repeating alarm, rescheduled on app start and on `BOOT_COMPLETED` — add the receiver and permission; none exists today). Body is built at fire time from SharedPreferences: unrecorded bank-SMS count (`BankSmsStore.pendingInRangeCount`) and "no entry today" (mirror `accounting_activity.lastOperationDate` into SharedPreferences through a new plugin method like `setViewDays`). Copy: «امروز N پیامک بانکی ثبت نشده» / «امروز هنوز چیزی ثبت نکردی» / both; nothing is sent when nothing is pending. Tap → `com.omids0.accounting://bank-sms` when SMS pending, else the entry form.
   - Web: add `nightly` to `VALID_KINDS`/labels/defaults in `reminders.ts`, a finder in `RemindersCron.gs` (fires at the rule's hour when `فعالیت.lastOperation` ≠ today, dedup reference `nightly_<date>`), title «حساب کتاب». SMS counts are not available on web — say so in the UI.
   - The existing `daily` 09:00 "you didn't open the app yesterday" rule becomes a user-visible toggle (default off now that nightly exists) instead of being forced on every launch (`ensureDefaultReminderRules`).
3. **Permission flow**: remove the automatic web prompt in `useEngagementReminders.ts:56-66`. Ask when the user turns a reminder on, after a one-line explainer. After denial: badge «اجازه داده نشده» + «چطور فعال کنم؟» opening a short per-platform how-to (browser site settings / Android app settings; on Android use `App.openSettings`-style deep link if available via a plugin, otherwise instructions). On Android, enabling SMS capture must not silently chain the notification prompt; ask it explicitly in the nightly-digest step with its own sentence.
4. **Reminders screen redesign** (wireframe left phone): one list of toggles with a time picker per row — اقساط، چک‌ها، بدهی‌ها، مواعد شخصی، جمع‌بندی شبانه، «دیروز سر نزدی» — plus the vehicle rows only when a vehicle exists. Status line at top: «اعلان‌ها روشن است» / «اجازه داده نشده — چطور فعال کنم؟». Developer setup (Apps Script, worker, VAPID, SW status) moves under a collapsed «تنظیمات پیشرفته» that is hidden on native. No «نوتیف PWA» wording; use «اعلان».
5. About: rewrite the reminders group accordingly.

**Accept.** Fresh install: the four due-date reminders and the nightly digest are on; no OS prompt until the user acts; APK users can toggle rules (A1); at 21:00 with an unrecorded SMS the digest arrives (owner tests on device); no developer text visible without opening «پیشرفته»; existing users with saved rules keep them.

## Task C — Performance

Measured on the current build (uncompressed): login page downloads 1.45 MB for a 5 kB screen — main JS 694 kB, Google Identity script 270 kB, CSS 301 kB, font 109 kB. After sign-in the dashboard fires 124 requests / 1.7 MB of JS because every page is prefetched. Source-map breakdown of the main chunk: `src/services` 28 % (137 files, 503 kB source), `react-router` 23 %, `@phosphor-icons/react` 10 %, `tailwind-merge` 6 %.

1. **Stop the services avalanche.** `src/services/sheetSyncSheetNames.ts` imports every module's service only for its `*_SHEET` constant, so checks/dang/treasury/reminders/vehicle code ships to the login page. Move all tab-name constants into one dependency-free `src/services/sheetNames.ts` (re-export from the old modules for compatibility), and make `sheetSyncSheetNames.ts`, `localDataWipe.ts`, `featureDiscovery.ts`, `onboarding.ts` import from it. Same for `routes/*Route.tsx` (`WalletAccountDetailRoute`, `VehicleDetailRoute`, `DangSplitDetailRoute`, `TimesheetDetailRoute`): load their service with a dynamic import or move the data fetch into the lazy page. Target: `src/services` share of the main chunk under 10 %; report before/after with the same source-map method (build with `--sourcemap` to a scratch dir, group `sourcesContent` by folder).
2. **Prefetch only what the thumb can reach.** `usePrefetchAppPages`: prefetch bottom-nav pages on idle as today; prefetch the rest on drawer open (already partly done) or on `pointerenter`/`touchstart` of a menu item, and never when `navigator.connection.saveData` or `effectiveType` is `2g`/`slow-2g`. Target: dashboard first load under 40 requests.
3. **Subset the Farsi-digit fonts.** `src/styles/fonts.css` loads five full `Vazirmatn FD` weights (~49 kB each) only for digits. Generate subsets containing digits, decimal/thousands separators, minus, percent and space (U+0030–0039, U+06F0–06F9, U+066B, U+066C, U+002C, U+002E, U+2212, U+002B, U+0025, U+0020) with the `subset-font` npm package (harfbuzz wasm, no Python) through a one-off script committed under `scripts/` **(ask first — it is a scripts/ change)** or a prebuild step; commit the subset files to `src/assets/fonts/` and point `@font-face` at them with `unicode-range`. Target: FD fonts under 5 kB each.
4. **Phosphor without the five unused weights.** `@phosphor-icons/react` ships all six weights per icon. Switch `AppIcon` to the regular SVG data from `@phosphor-icons/core` (one path per icon) rendered by a tiny local component, keeping the round-3 name map and API. Target: icons under 30 kB source in the main chunk.
5. **Google Identity script**: load `GoogleOAuthProvider` lazily — only when a login or a silent web refresh is actually needed (never on native). If `@react-oauth/google` cannot be split that way, skip and say so.
6. **Lighthouse on a signed-in screen** (approved `scripts/` change): `scripts/run-lighthouse.mjs` audits `/` today. Add a second run against the dashboard with the mock state injected (reuse `e2e/helpers/mockAppState.ts` data: set `localStorage` before load via a Lighthouse `extraHeaders`-less approach — simplest is a tiny static page or a query flag that the static server maps to an HTML that seeds localStorage then redirects to `/`; keep the existing thresholds and report both scores). Do not change thresholds.
7. Report: Lighthouse before/after for both pages, network bytes for login and dashboard before/after (uncompressed and gzip), main chunk composition table.

## Task D — Rename to «حساب کتاب»

Change only visible brand text; identifiers stay. From the inventory:

- Change: `index.html` title/description/`apple-mobile-web-app-title`/splash `.boot-title`; `AppSplash.tsx`; `vite.config.ts` manifest `name`/`short_name`/`description` (**not** `id`); `capacitor.config.ts` `appName` (**not** `appId`); `android/app/src/main/res/values/strings.xml` `app_name`, `title_activity_main`; `LoginPage.tsx` h1; `AboutPage.tsx` h1/subtitle; drawer footer in `LayoutMenu.tsx`; `NativeNotificationSection.tsx` path text; `appLockWebAuthn.ts` `rp.name`; notification title in `reminders.ts` and `RemindersCron.gs`; `public/privacy.html`; `README.md`; package `description` if any.
- Keep: `SPREADSHEET_TITLE_PREFIX = 'حسابداری · '`, the Drive query `name contains 'حسابداری'`, `isAccountingSpreadsheetTitle`, all `accounting_*` storage keys, `appId`/`applicationId`/`namespace`, worker name, APK file name and the update URL, `VITE_BASE_PATH`, `package.json` `name`.
- Copy that mentions the sheet prefix («شیت‌ها با فرمت «حسابداری · سال» ساخته می‌شوند») stays true and stays.
- About: add one line that sheets are still named «حسابداری · …» on Drive so old users are not confused.

## Task E — Import / export that users can trust

1. **Export feedback**: drop the «آیا مطمئن هستید؟» confirm for exports (keep it for import). Toast names the file: «ذخیره شد: چک‌ها ۱۴۰۵-۰۷-۲۰.csv». File names get the Jalali date. Rename «اکسل» to «CSV» in copy.
2. **Android save path**: add `@capacitor/filesystem` + `@capacitor/share` (approved); on native write to `Directory.Cache` and open the share sheet, so the file lands where the user chooses. Web keeps the blob anchor.
3. **Import preview**: parse first, show «N ردیف پیدا شد · M تکراری (رد می‌شود) · K نامعتبر (ردیف‌های …)» with the first invalid row numbers and reasons, then «ایمپورت N ردیف». De-duplicate by id against the existing sheet rows; rows with an existing id are skipped (or updated if the owner prefers — ask in the first report). Generate new ids for rows without one.
4. **Partial failure**: if the loop fails mid-way, the toast says how many were added before the failure and that the rest were not.
5. **Offline export**: an export failure while offline must not use the "will be sent after reconnect" message; exports are not queued — say «برای خروجی به اینترنت نیاز است».

## Task F — App lock that does not nag, and a privacy screen

**Owner's pain.** Switching to the SMS app for a moment and coming back asks for the PIN again. Today `DEFAULT_APP_LOCK_POLICY = 'background'` (`src/services/appLockPolicy.ts:8`) locks on every app switch; the five policies exist (`APP_LOCK_POLICY_OPTIONS`) but the default is the harshest and the chooser is buried in the lock settings.

**Do.**
1. **Default policy → `idle` with 5 minutes** for new lock setups (`DEFAULT_APP_LOCK_POLICY`), and a one-time migration for users still on the implicit default `background` (they never chose it): move them to `idle`/5 and tell them once in a toast «قفل اپ حالا بعد از ۵ دقیقه بی‌فعالیت فعال می‌شود؛ در تنظیمات قابل تغییر است». Users who explicitly saved a policy keep it (store a `policyChosen` flag when the user saves).
2. **Chooser in the lock setup flow**: when the user enables the lock (`AppLockPrompts` / `useAppLockSettings`), the policy step is part of the setup — three big options: «بعد از ۵ دقیقه بی‌فعالیت» (پیش‌فرض), «هر بار خروج از اپ», «فقط هنگام باز شدن اپ» (= `session`), with «گزینه‌های بیشتر» for `always`, `manual`, and the idle minutes. Wireframe: right phone in `notifications-lock.html`.
3. **Keep the cold-start truth honest**: the data key lives in memory, so a real cold start (process killed by Android, page reload) must still ask — keep `APP_LOCK_COLD_START_NOTE` in the chooser. Investigate and report whether Android is killing the WebView on short app switches on the owner's device (that would explain "every time" even with `background`); if so, consider keeping the WebView alive is not possible, but the unlock screen can offer biometrics first and show the cached dashboard blurred behind it.
4. **Privacy screen** (new toggle «محو کردن اپ در پس‌زمینه», default on when the lock is on):
   - Android: `@capacitor-community/privacy-screen` (approved) → `FLAG_SECURE`, which also blanks the recents thumbnail and blocks screenshots; document that screenshots are blocked while it is on.
   - Web/PWA: on `visibilitychange` → hidden, add a full-screen overlay with `backdrop-filter: blur(16px)` plus the app logo; remove on visible. This also covers the moment before the lock screen mounts.
5. About: update the lock group with the new default, the chooser and the privacy screen.

**Accept.** New lock users default to 5-minute idle; a 10-second trip to another app does not ask for the PIN; the chooser is shown during setup; with the privacy toggle on, the recents thumbnail is blank on Android and the web app blurs when hidden; existing explicit policies untouched.

## Task G — About and version

Update About for every group touched (reminders rewritten, lock, import/export, sync failures, rename note); bump the version (1.22.0 or 2.0.0 — ask).

## Suggested order and commits

1. `docs` — commit the untracked `wireframes/` files.
2. `bugfix` — A1, A3, A5, A6, A7, A8 (small, independent).
3. `bugfix` — A2 + A4 (sync failures and sheet switch; touch the same services).
4. `feature` — F (lock default, chooser, privacy screen).
5. `feature` — B (notifications) — biggest; includes native receiver changes, reviewed by reading.
6. `feature` — E (import/export).
7. `perf` — C.1–C.5, then C.6 Lighthouse change in its own commit.
8. `feature` — D rename.
9. `docs` — G.

Stop after commit 3 and report (with the Android-kill investigation from F.3), then continue. Final report must include: the perf before/after tables, Lighthouse scores for both pages, screenshots of the reminders and lock screens, and anything skipped with the reason.
