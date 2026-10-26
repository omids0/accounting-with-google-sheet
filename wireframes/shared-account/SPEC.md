# UX Shared Account — Design Spec («حساب مشترک»)

Audience: the Claude agent that will plan and implement this. Decisions marked **(owner)** were made by the product owner while reviewing the live prototype; decisions marked **(my call)** are the designer's and the owner can overrule them. Source of truth for look and behavior: `prototype.html` in this folder (one clickable page; `css/` and `js/` hold its parts). Where this document and the prototype disagree on _behavior_, this document wins; on _look_, the prototype wins.

The feature was first called «حساب کتاب خانوادگی». **The name is now «حساب مشترک»** and it is not tied to spouses: any two people who share expenses (partners, roommates, siblings, a parent and a child). Copy must say «شریک», never «همسر».

## Intent

Two people who pay for a shared life want one place where the shared expenses live, without giving up their own private accounting. Today each person's personal spreadsheet is private and nothing crosses. The owner's reluctance about a big "family mode" shaped everything below: the app is used by many people who will never want this, so it must cost them nothing, and the people who do want it must never leak private data by accident.

## Goals

- A second, **separate spreadsheet** that two people (plus optional viewers) read and write: shared expenses and incomes, who paid, who it was for, a running balance «چه کسی به چه کسی بدهکار است», and settlements.
- **Opt-in and invisible by default.** Until a user turns it on, no menu row, tab, sheet, request, nudge or bundle cost is added for them.
- **Privacy by construction.** The shared spreadsheet is the only file the partner is given access to. Nothing from the personal spreadsheet is ever readable by the partner. A personal record reaches the shared account only when its owner ticks a box on that record.
- **Real access control** between two Google accounts: roles, per-permission switches, a Drive share that matches, clear guards (no locking yourself out, no orphaned file), and honest wording about what the app can and cannot enforce.
- A complete, shippable feature (not a "light" version): setup, invitation, shared records, balance, settlement, member management, personal↔shared linking with edit/delete rules and change notices, backup safety, About page, tests.

## Non-goals

- Splitting by income ratio, percentages, itemized shares, or more than two people sharing a balance (v1: «نصف‌نصف» or «فقط برای یک نفر») **(my call)**.
- More than one account-owner or transferring ownership of the file **(my call)**. The owner is the Google account that owns the Drive file.
- Automatic sending of anything to the shared account: not bank SMS, not recurring items, not imports **(owner)**.
- iOS bank-SMS workarounds (already rejected by the owner).
- A new backend. Everything stays on Google Sheets/Drive, written so a future Postgres repository can replace it (see memory «Backend readiness»: keep the sheet access behind services).

## Anti-goals (what would make this a failure even if it technically works)

- A user who never enabled it sees any trace of it, or the app gets measurably heavier for them.
- The partner can see anything from the personal spreadsheet, or a private record lands in the shared account without the owner ticking it.
- A shared record is silently changed or deleted on one side without the other side knowing or deciding.
- Someone can remove the last owner, or revoke their own access by accident, or the file is lost because the owner deleted it with nobody holding a copy.
- The UI claims enforcement the Drive share does not give.

## The architectural decision (read first)

**A shared account is its own spreadsheet**, exactly like a building in round 11: the same engine (records with categories, line items, attachments, counterparties, wallet, reports, activity log, outbox, conflicts) under a different workspace type and menu. Reuse, do not fork:

- `WorkspaceKind` (`src/types/forms.ts`) becomes `'personal' | 'building' | 'shared'`; `src/services/workspace.ts` stores/reads the type through the «تنظیمات دوره» marker row `نوع فضا` (`WORKSPACE_TYPE_ROW`) with the value `حساب مشترک`. Spreadsheet title: «حسابداری · مشترک <name>» so Drive listing finds it and `personalSpreadsheet()` never mistakes it for the personal sheet (extend its building-name check).
- Members, roles, per-permission overrides, Drive share, invitation, status «دعوت‌شده/فعال», guards: **generalize** what already exists for buildings (`buildingRoles.ts`, `buildingMembers.ts`, `buildingMemberDrive.ts`, `buildingInvites.ts`, `driveShare.ts`, `useBuildingMembers`, `MemberCard`, `InviteMembersSheet`, `BuildingMembersPage`) instead of copying them. The role registry and permission set become data keyed by workspace type; the building behavior must not change (its tests must still pass untouched).
- Writing to the other spreadsheet from the personal one reuses the round-11 **bridge** machinery: `workspaceBridge.ts` (`writeToWorkspace`, `drainWorkspace`), `bridgeRows.ts` (pure row builders, the `مرجع` reference column), `bridgeSync.ts` / `bridgeSyncRows.ts` / `bridgePrefs.ts` (a per-device queue of pending edits/deletes, retried when online). The shared-account link is a new bridge in the **opposite direction** (personal → shared) with its own reference format.

## Opt-in (owner)

- Off by default. The only entry point is «فضاهای من» (a new page reached from the More menu / the drawer's workspace row): it lists «حساب شخصی» (always) and a dashed card «حساب مشترک» with a short explanation and «راه‌اندازی». It says in plain words that nothing changes until it is turned on.
- No push, banner, badge or onboarding nudge anywhere else for non-users. About lists the feature (user-facing, Persian) but nothing else prompts it.
- All shared-account code is lazy-loaded behind that entry point and the workspace type; nothing of it ships in the main chunk beyond the type union and the entry page. Check `npx size-limit` before and after.
- «خاموش کردن»: two choices, both leave the personal account untouched: «فقط از منوی من پنهان شود» (file and the partner's access stay; can be turned on again) and «دسترسی همه قطع شود» (all Drive shares are removed; the file stays in the owner's Drive, the owner deletes it by hand). Only the owner can do it.
- A non-owner can «ترک این فضا»: their Drive access is removed, their personal account is untouched, the records they wrote stay.

## Setup flow (owner creates)

Three steps (prototype `راه‌اندازی`):
1. **What is shared / what stays private** (two columns) and one line: a new sheet is created in your Drive and shared only with the e-mail you enter.
2. **Name** (default «خانهٔ <me> و <partner>» is only an example in the prototype; no default name that guesses a partner) + **partner's Google e-mail** + **role** (`شریک` recommended, or `ناظر`). On finish the app creates the spreadsheet (`createSpreadsheet` in `sheetsCreate.ts`), writes the type marker, the owner's role row, default categories, then shares the file with the e-mail (`shareFile` in `driveShare.ts`, Drive sends its own invitation mail with the app's instructions: reuse `inviteMessage`, adapted to this workspace; the steps must say how to connect to the existing sheet).
3. **Default split** («نصف‌نصف»; income-ratio is out, see non-goals) and the reassurance that no record ever goes to the shared account by itself, bank SMS included.

Drive first, rows second: a refused or offline share leaves no half-invited member (same rule as `inviteMember`).

## Roles and permissions (owner approved the model; defaults are my call)

Roles: **مالک** (owner of the Drive file; fixed), **شریک** (writes), **ناظر** (reads only). v1 allows exactly **one شریک** besides the owner; any number of ناظر **(my call)** — the balance and settlement are between two people.

| Permission key        | Label                         | مالک | شریک | ناظر |
| --------------------- | ----------------------------- | ---- | ---- | ---- |
| `record`              | ثبت هزینه و درآمد             | yes  | yes  | no   |
| `editOthers`          | ویرایش و حذف ثبت‌های دیگران   | yes  | no   | no   |
| `settle`              | ثبت تسویه                     | yes  | yes  | no   |
| `budget`              | بودجه و دسته‌ها               | yes  | yes  | no   |
| `members`             | دعوت و مدیریت اعضا            | yes  | no   | no   |
| `export`              | خروجی و پشتیبان               | yes  | yes  | no   |

- Effective permission = the member's override (`دسترسی:<email>` row, same format as buildings), else the role default. Changing a role clears the overrides. A value equal to the role default is not stored.
- Drive role: مالک and شریک = «ویرایش» (writer), ناظر = «فقط مشاهده» (reader). A ناظر who is given a writing permission needs Drive «ویرایش»: the app raises the share and says so (buildings already do: `viewerCanWrite`).
- Guards (the same as buildings): the owner's role/permissions cannot change; nobody changes their own role or switches; the last owner cannot be removed; every writer re-checks `can()` before writing so a stale screen cannot bypass it.
- **Honest wording, shown in the member sheet:** real access is the Drive share. The app only limits screens and buttons. Someone with Drive «ویرایش» can edit the sheet directly. Do not claim more.
- The partner cannot delete or edit the other person's records unless `editOthers` is on **(owner agreed with the default; my call on the exact default)**.

## Records, payer and split

- Shared records are the normal expense/income record forms with new **last columns** (round-6 rule): `پرداخت‌کننده` (the payer's e-mail), `تقسیم` (`equal` | `only:<email>`), `مرجع` (see linking). Nothing else about the record forms changes.
- **Balance** (computed, never stored): for every expense, the payer is credited the full amount and each person is charged their share (`equal` = half each; `only:<email>` = that person bears all). Settlements move the balance. Incomes never change the balance; they appear only in the shared account's reports **(owner)**.
- **Settlement** = a record with a system category «تسویه» written only by the settle sheet (like the building transfer/correction records: skipped by reports and by «وصول − هزینه»). It states payer→receiver and amount; it moves no wallet money by itself.
- Screens: خانه (balance card, month totals, who paid how much, last records), ثبت‌ها (filter all / each person; record sheet), تسویه (current state + history), اعضا (see below). The add-expense sheet exists inside the shared account (payer, for whom, preview of each person's share).

## Linking a personal record to the shared account (owner)

On the **personal** entry and edit forms, only when the shared account is on and the user has `record` there, show a checkbox «در «<name>» هم ثبت شود».

- **Default off, always.** No memory per category, no per-card or per-SMS default, no rule that ticks it for the user.
- Ticking and saving a **new** record writes the personal record first, then a **copy** into the shared spreadsheet through the bridge queue. The copy's `مرجع` is `share:<personalSpreadsheetId>:<personalRecordId>`; the personal record keeps a marker that it is shared (a new last column on the record tabs, or the bridge prefs, builder's call; it must survive sync and show the pill «در حساب مشترک» in lists).
- Expense ticks ask «برای چه کسی است؟» (`equal` | only me | only the partner) and show each person's share. Income ticks show only «مبلغ را شریک هم می‌بیند»; the income copy is report-only and carries no split.
- **Editing a personal record while ticked** updates the copy (amount, title, category, split). **Un-ticking and saving deletes the copy** from the shared account; **ticking a previously unticked record and saving creates it**. The tick state on save is the single source of truth **(owner)**. The form warns before saving: «با ذخیره، نسخهٔ حساب مشترک حذف می‌شود» / «با ذخیره، یک نسخه در «<name>» ساخته می‌شود».
- **Deleting a personal record that is shared** asks: «از هر دو حذف شود» or «فقط از حساب شخصی». Choosing the second leaves the copy in the shared account, unlinked (its `مرجع` is cleared) **(my call; owner accepted asking)**.
- A record created in the shared account directly has no personal counterpart and never gets one.
- The link is idempotent: before appending a copy, look up its `مرجع`; a retry after a failure must never produce a second copy. Same for deletes (already gone = done).
- Offline or a Drive failure: the personal write is saved at once; the copy waits in the per-device bridge queue (the `bridgePrefs` pattern: `PendingBridgeSync`), retried when online, and the record shows a small «در انتظار ارسال» state until it lands. A permanently failing copy (no access, file gone) is reported and can be cancelled by the user.

### What a copy carries (my call, privacy-first)

A whitelist, nothing else crosses: **title, amount, date, category, record type (expense/income), payer, split, creator e-mail (`ایجادکننده`), `مرجع`**. Never copied: notes, line items, attachments, counterparty, wallet account / «اعمال روی کیف پول», SMS source text, tags, vehicle or other category-specific blocks. The shared record applies no wallet effect.

- **Category:** the tick panel shows a category select fed by the **shared account's** category list, pre-selected by an exact name match with the personal category, else «سایر». The app never creates a category in the shared sheet from a personal one (that would leak its name). A later category change made in the shared account applies back to the personal record only when a personal category of that name exists; otherwise the notice shows the change and offers only the other fields.
- **Creator vs payer:** `ایجادکننده` is whoever ticked and wrote the copy; `پرداخت‌کننده` defaults to the same person (the personal form has no payer field) and can be changed in the tick panel. Notices go to `ایجادکننده`, the only person who has a personal counterpart.
- **If the owner edits a personal record while a notice about it is pending:** the form shows «شریک این ثبت را در حساب مشترک تغییر داده؛ ذخیره، تغییر او را جایگزین می‌کند» with a link to the notice. Saving proceeds and the pending notice is removed (the owner saw it and chose to overwrite). Nothing is blocked.

### When the partner edits or deletes a copy (owner)

Neither accept nor reject: **inform, and let the record's owner manage it.**

- The shared copy changes immediately (the shared account is the shared truth).
- If the copy has a `share:` reference and the editor is not the record's payer/owner, a **notice** is written for that owner. Storage **(my call)**: rows in the shared spreadsheet's «تنظیمات دوره», key `اعلان:<ownerEmail>:<noticeId>`, value JSON `{ recordRef, field, old, new, by, time, kind: 'edit' | 'delete' }`. The owner's device reads its own notices on sync and shows a banner (shared home, «فضاها», personal records list): «<partner> مبلغ «<title>» را در حساب مشترک عوض کرد: از X به Y».
- The notice sheet offers «اعمال در ثبت شخصی من» (write the new value to the personal record) or «نادیده بگیر» (the personal record stays). Either way the notice row is deleted and the shared copy stays as the partner left it.
- v1 notices cover **amount, title, category, split and deletion** of a copy. A deleted copy also clears the personal record's shared marker.
- This only arises when the editor holds `editOthers` (the owner always does; the partner only if granted).

## Members screen

Own role card; members list with role, status («دعوت‌شده» until they write something, same detection as buildings: invite row + activity log, `claimOwnInvite`), custom-permission marker; «+ دعوت» (needs `members`); tapping a member opens the sheet: role selector (not for the owner or yourself), the six switches (disabled unless you may change them), the Drive access line, «ارسال دوبارهٔ دعوت» for pending members, «قطع دسترسی» (removes the Drive share first, then the rows). Non-owners see «ترک این فضا».

**Data safety card:** the file lives in the owner's Drive; if the owner deletes it everyone loses it. Offer a **monthly backup copy in the partner's Drive** (`export` permission) using the existing Drive backup service (`driveBackups.ts`, `driveBackupRun.ts`). If a backup of a file the partner only opened through the Picker is not possible under the `drive.file` scope, fall back to a manual «ذخیرهٔ نسخه در درایو من» button and report the limit in the PR **(builder's call; the prototype shows only the toggle)**.

## What the user sees, per role (prototype: «الان چه کسی اپ را باز کرده؟»)

- مالک: everything, including «خاموش کردن» and member management.
- شریک: records, settlement, budget, export; sees members read-only; «ترک این فضا». Cannot edit/delete the owner's records unless granted.
- ناظر: sees home, records (read-only detail with a lock note), settlement history, members read-only; no «+», no add button, banner «شما ناظر هستید و فقط می‌بینید».

## Project constraints (mandatory)

- 300-line hard limit per staged `*.{js,jsx,ts,tsx,css,scss,html}` file after Prettier (this spec's own prototype is split into `css/` and `js/` parts for that reason). Extract rather than grow.
- Reuse before create (list above). No tooling or config changes; **no new dependencies**; no change to `size-limit` without asking.
- New sheet columns go at the end of the row (round-6 rule): `sheetNames.ts`, `sheetHeaders*.ts`, `moduleSheetSpecs.ts`, `sheetSyncSheetNames.ts`, CSV, backup. New localStorage keys per spreadsheet and in `ACCOUNT_KEYS`, unless per device.
- A personal spreadsheet must never receive shared-account tabs or marker rows (mirror `assertBuildingSpreadsheet`), and the shared spreadsheet never receives personal data except a copy the owner ticked.
- Dev builds isolate storage with the `dev:` prefix; read no storage before `devStorageIsolation` runs.
- Update About (`aboutFeatureGroupsCore.ts` / `Extended.ts`, user-facing Persian, new group «حساب مشترک») and `aboutChangelog.ts`; bump the minor in `package.json` at the final step (read `main`'s version then; it is 2.10.0 at the time of writing).
- QA rule applies: end-user brief, side-effect and parity checks before editing, real-browser screenshots (with a `motion` step for every sheet) and the evidence report before «done». Two-account behavior (a real invitation, a real Drive share, a partner editing on another device) cannot be proven in headless Chrome: report it NOT RUN and leave it to the owner.
- Commit format `<type>/ACCT-0/ACCT-0/<description>`, branch off `develop`, PR into `develop` (use the compare link, no `gh`), commit messages end with the Co-Authored-By line.

## Build order (a plan will detail it; each phase ends green and committed)

1. Workspace type `shared`, generalized roles/permissions/members/Drive-share registry (buildings unchanged), «فضاهای من», lazy-load boundary.
2. Create / invite / join flow and the opt-in off/on switch.
3. Shared records: payer and split columns, balance, settlement, shared home/records/settle screens.
4. Personal↔shared link: checkbox, bridge queue, idempotent copy/update/delete, pending state, delete choice.
5. Change notices (partner edits/deletes a copy) and the notice sheet.
6. Members screen, permission switches, backup safety, leave/revoke.
7. About, changelog, version, tests, QA evidence.

## More calls made after an independent builder review (my calls, overrule freely)

- **One shared account per user in v1.** The checkbox says «در «<name>» هم ثبت شود», not a picker; the bridge queue, `مرجع`, notice reads and the turn-off flow use one account key. The type and keys must not _prevent_ several accounts later (key them by spreadsheet id). _Pending the owner's answer below._
- **Reaching the shared sheet from the personal side:** the shared account is read on app start and when the personal records list opens, at most once every few minutes (builder picks the interval), reusing the existing sync/fetch helpers. Under `drive.file` each device needs its own Picker grant of the shared file (the building «اتصال به شیت موجود» flow, `buildingConnect.ts`). On a device without the grant the checkbox is replaced by a «اتصال این دستگاه به «<name>»» row; the personal form still saves normally.
- **Leaving, removal or switching off with an unsettled balance:** never blocked. The sheet shows the balance first («مینا ۳٬۱۴۰٬۰۰۰ تومان به شما بدهکار است») and asks to confirm. The balance stays visible to whoever remains; the leaver's records stay.
- **«ترک این فضا»** removes the member's own Drive permission through the Drive API when it allows it. If the API refuses (the `drive.file` scope may not cover self-removal), fall back: remove the member's rows, hide the account on this device, and tell the user to remove access in Drive; report which case happened in the PR.

## Open question for the owner

Can one person have **more than one** shared account (for example one with a partner and one with roommates), or exactly one? The plan above assumes **one**: it removes a workspace picker from the checkbox, per-account queues and keys, and a «which account?» step in every notice. Say so if you want several.

## Changes made during implementation

What shipped differs from the text above in these places. Where this list and the sections above disagree, this list wins.

- **Creator column is «ایجادکننده»** (field id `sharedCreator`), not «ثبت‌کننده». «ثبت‌کننده» already exists (`writerColumn.ts`) and holds the _last editor_, so the copy's creator needed its own column. Notices go to «ایجادکننده».
- **The hub is the retitled existing page.** «فضاهای من» is the old «مدیر ساختمان» home (`buildings-home`, same tab id and path), with the dashed «حساب مشترک» card below the buildings. No new menu row. The building connect path now reads «بیشتر › فضاهای من».
- **The member card expands inline** (the building `MemberCard`), not in a bottom sheet as in the prototype.
- **One shared account per user in v1.** Creating or connecting a second one is refused, a hidden one still counts, and the hub offers «روشن کردن دوباره» instead. The owner wants several accounts as a later phase; keys are by spreadsheet id so nothing prevents it.
- **Recurring items are skipped in a shared account for v1.** They carry no payer, split or creator, so the balance would ignore them. Auto-post does nothing and the recurring writers refuse. Report exports, budgets, categories and backup are gated by their permission keys.
- **Backup is the existing weekly auto-backup switch** («پشتیبان خودکار هفتگی در درایو شما», in the data-safety card of «اعضا»), not a monthly one. It runs when the shared account is opened. A partner cannot write to the owner's folder, so the zip goes to a «پشتیبان» folder in the partner's own Drive. There is no manual button.
- **Leaving.** «ترک این فضا» removes the member's own Drive permission first; if Drive refuses (403/404) it removes the member's own rows, hides the account and tells the user to remove access in Drive. Either way the account is then unregistered on this device after the switch back to the personal sheet. «فقط از منوی من پنهان شود» only hides and never unregisters. The unsettled balance is shown first and never blocks.
- **Balance when the partner's role row is gone** (after a leave or removal): the pair is inferred as the owner plus the other e-mail the records name most often as payer or `only:` bearer, so the balance stays visible to whoever remains.
- **Settlement rows are expense rows** with the system category «تسویه» (payer = from, split `only:<to>`, no wallet field). `balanceOfRows` partitions them so a settlement is never counted as an expense; they are left out of reports, dashboard and budgets inside shared accounts only. A malformed «تسویه» row counts on neither side.
- **Equal split rounding:** the payer bears `floor(amount/2)` and the other person the rest; nets always sum to zero. A suggested settlement below 1 toman is none.
- **Notices.** Only amount, title, category and deletion can be applied to the personal record (the personal record has no split), and the referenced personal sheet must be one of the user's own personal spreadsheets. Delete and split notices offer one button («باشه» / «بعداً») because both choices would do the same. Inside the personal edit form the notice sheet does not apply anything (the form's values would overwrite it on save); it says to change the form and save.
- **Push-key leak guard.** A shared sheet is readable by the partner, so the reminder, push-subscription, activity and app-lock-scrub writers do nothing for shared sheets (the engagement startup and the sheet switch skip them). The same leak exists for building sheets and is unchanged.
- **Personal side details.** The link marker is a synced personal column «حساب مشترک» (`sharedLink`), added only when a shared account is registered; vehicle expenses get no tick; a copy carries only a title the user typed (never an auto-generated or vehicle title); the «اتصال این دستگاه» row opens «فضاهای من» (`?shared=connect`) after a confirmation when the form has input; partner names on the personal side are the e-mail local part.
- **Generic write paths are closed in a shared account:** `/entry`, `/records`, wallet, close-year, reminders and `?action=` links redirect to the shared pages, and CSV import, restore and column repair need the matching permission.
- **Not proven in headless Chrome, left for the owner:** a real invitation mail and Drive share, Drive self-removal under `drive.file`, a partner editing on a second device (notice pickup), real Sheets row deletes, and a real phone.
