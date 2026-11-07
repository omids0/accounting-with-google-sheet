# Parent view of a teenager's account + quick SMS entry from the notification

Date: 2026-11-03. Owner decisions are marked (owner). Everything else is the author's call.

## Feature 1 — Parent monitors a child's account (read-only)

### Intent
A parent wants to see all of a teenager's income and spending, live, to help them control spending. The teenager keeps using the app normally on their own personal spreadsheet.

### Owner decisions
- Parent sees **everything** the child records, automatically, not per record (owner).
- Parent **invites** the child (owner). Parent has **view only** access, no editing, no limits/alerts (owner).
- One parent can follow **several children** (owner).
- The child **cannot** remove the parent in the app, only the parent can end it (owner).

### Design
- Mechanism: the child's personal spreadsheet is shared with the parent as Drive **reader** (`driveShare.shareFile`). Nothing is copied. The parent app opens the child's sheet like it opens a building/shared sheet (`ConnectBuildingSheet`, `useEnterWorkspace`).
- New device-local `WorkspaceKind` `'child'`. The sheet's own marker row still says `personal`, so `syncWorkspaceTypeFromSheet` must never overwrite a `child` entry, and every personal-only writer must stay off for it (they already gate on `isPersonalWorkspace`).
- Read-only: no `ensureAllSheets` / `prepareSpreadsheetContents`, no outbox, no sync writes, no speed dial, no edit/delete actions. A Drive 403 is only the backstop.
- Parent screens (menu «فرزندان من», next to «فضاهای من»): children list; invite text for a child (parent's email + app link, via share/copy); connect a child's sheet; open child → read-only space with a banner «نمای فقط‌خواندنی حساب <نام>»: month summary (income, expense, balance, month navigation), category breakdown, transaction list with search, budgets read-only if the sheet has them.
- Child screens (menu «والدین من», personal workspace only): explains in plain Persian exactly what a parent sees; field for the parent's email (prefilled when the invite link is used); a consent checkbox; on confirm → `shareFile(personalSheetId, parentEmail, 'reader')` and a marker row in «تنظیمات دوره» so the app can list parents. The list shows who has access and the sentence «فقط والد می‌تواند دسترسی را قطع کند». No remove button in the app. The child always sees an active-parent notice (transparency).
- Parent ends it: «حذف فرزند» forgets the child locally and best-effort removes the parent's own permission. If access is lost (child unshared in Drive), reuse the `sharedAccessLost` pattern to tell the parent.
- Honest limit: the child owns the file, so they can still unshare it in Google Drive. The app cannot prevent that. The parent gets the «دسترسی قطع شد» message.
- Leak guard: the child space downloads only record tabs (no `ناتیف`, `قفل_اپ`, `یادآوری*`, `فعالیت*`, `قالب_پیامک`). The parent's device must never write its push keys into the child sheet (`refreshRemindersForSheet`). Add `parentLeakGuard.test.ts` next to `sharedLeakGuard.test.ts`. Known remaining exposure: the parent can open the raw Google Sheet in Drive and see those tabs; document in About.
- Storage: new key `accounting_children_v1` (add to `localDataWipe` `ACCOUNT_KEYS`), `settings.spreadsheets[]` entry with `kind: 'child'`.
- Android: Picker is web-only (`isPickerAvailable()`); same gap as the shared account and building flow, reuse its behaviour as is.

### Non-goals
Parent editing, spending limits, alerts, per-record privacy, several parents UI polish beyond the list, schema change of the child's sheet beyond one marker row.

## Feature 2 — Quick entry from the SMS notification (option A, owner)

### Intent
Tapping the bank-SMS notification (or its new action button) opens a compact sheet over the current screen that behaves exactly like one SMS card in «بررسی پیامک‌ها»: income/expense, category, sub-category, the same extra fields, and the «ثبت» button. After saving, the user is where they were.

### Design
- Native (`BankSmsNotifier.java`): look up the newest in-range pending SMS id (same SHA-256 id as the web) and add an action «ثبت سریع» with the URI `com.omids0.accounting://bank-sms/quick?id=<id>` (explicit `MainActivity` intent, distinct request code, `FLAG_IMMUTABLE`). When exactly one SMS is pending the content tap uses the same quick URI; with more it keeps `://bank-sms` (full page). The notification text stays amount-free (lock screen).
- Web: `launchAction.parseLaunchUrl` parses `://bank-sms/quick?id=` BEFORE the generic `://bank-sms`, new `LaunchAction` kind `smsQuick`. A small store holds the open quick id. A lazy `BankSmsQuickSheet` (PickerSheet) is mounted by `Layout`, runs `useBankSmsReview`, finds the `single` item with `key === id`, renders `BankSmsEntryCard` (reuse, parity with the review page; no copy of the save path). If the id is not a single pending item in this workspace, or the workspace is not personal, navigate to `/bank-sms` instead. Old APKs keep sending `://bank-sms` → page.
- The save path stays the shared one (`confirmSmsEntry`...). The cases that already redirect to the full entry form (probable duplicate, no choice, vehicle, debt/receivable) keep doing so.
- Native cannot be compiled on this machine (no JDK); the dev APK is built by GitHub Actions on push to `develop`.

### Non-goals
Registering from the notification without opening the app, one notification per SMS, showing amounts in the notification.

## Shared
- Size limit raised to 1400 KB JS (owner approved), new code lazy loaded.
- About page: new groups for both features; bump `package.json` to 2.19.0.
- Branch `feature/ACCT-0/ACCT-0/parent-view-and-sms-quick-entry` from `develop`; two commits (one per feature).
