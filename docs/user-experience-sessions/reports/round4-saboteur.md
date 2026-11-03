# Round 4 — Saboteur (persona 4) — areas the earlier rounds skipped

Tester view only: screen + browser tool + `sheet` / `requests` peeks. Employee dataset, phone 375x812, today = 6 Aban 1405. The Google server is a simulated in-memory sheet. Screenshots of this run: `C:\Users\14022732\AppData\Local\Temp\claude\d--project-myProjects-accounting\27ae5107-8696-4a72-bcb6-e2022ae2c0ac\scratchpad\r4\saboteur\` (about 28 PNGs).

## Summary

1. 16 findings: 4 severity 1 (wrong numbers / lost data), 9 severity 2, 3 severity 3.
2. Worst: **one tap on a single button can leave the account balance different from its own ledger**: double-tapping «ثبت همه» on the dashboard posted the 3 recurring items twice (salary 130 M instead of 65 M) and the stored balance of the Melli account ended at 257.8 M while the last ledger row says 163.8 M (a 94 M gap).
3. Marking a vehicle service «انجام شد» a second time deletes the old expense and refunds it, but never deducts the new one: the account grows by the service cost every time (+1.45 M and +2.1 M seen, deterministic with single taps).
4. Goals: a 1 000 000 000 toman deposit from a 26 M account is accepted (account -973.85 M), and an archived goal (46 M) disappears from the treasury page with no way back, yet the dashboard still counts it in assets.
5. The app protects well against zero / text / empty values, double-taps on most save buttons, deep links to missing ids and focus-trapping, but silently turns «-5» into «5» in every amount field and has no sanity ceiling anywhere (10^9 km, 10^6 coins, 10^12 budget).
6. Coverage is partial: lock/PIN could not be tested (the security tile freezes the page in this sandbox), and categories, counterparties, recurring-item settings, theme/digit toggles, network cut and the 50-records run were NOT RUN (see list).

## Coverage matrix

| # | Area | Status | Reason / what is missing |
|---|------|--------|--------------------------|
| 1 | Vehicles | partial | Done: mileage lower / 0 / -5 / text / 10^9 / 10^20, service interval 0, service mileage 0 and 1000, triple-tap save, create 4 vehicles (same name, empty, markup/emoji, negative, 300 chars, 10^12 km), delete vehicle with services. NOT RUN: fuel price 0 / negative litres (fuel modal not reached), date in the future / past century (wheel picker not exercised), 3 vehicles with an identical plate (my plate fill landed in the wrong cells). |
| 2 | Goals | partial | Done: deposit > balance, deposit > target, withdraw > saved, full withdraw, target 0 / -5, triple-tap deposit, archive goal with money. NOT RUN: target date before today (picker), a real delete (the UI has only archive). |
| 3 | Vault | done | -5 coins, 0, text, price 0, 10^6 coins, sell more than owned, edit price to text / 0 / -50, delete (undo toast seen). |
| 4 | Dang-split | partial | Done: 0 shares, share weight 0 / -2 / 10^9, expense with nobody, 1 toman among 3, settle 99 999 999 vs 5.75 M owed, delete a person, duplicate person name. NOT RUN: percentages not summing to 100 (UI has weights, not percentages), rename two people to one name. |
| 5 | Timesheets | partial | Done: 25 h label, identical overlapping entries, triple-tap save, delete confirm text, end-before-start (wheel limits it). NOT RUN: edit approved entries (found no approval state, only selection checkboxes). |
| 6 | Recurring / reminders | partial | Done: double-tap «ثبت همه», reminder with amount 0, triple-tap save, delete reminder. NOT RUN: day 31 in a short month, 0 interval, delete a recurring item that already posted, reminder in the past, many reminders, snooze twice. |
| 7 | Counterparties / categories / budgets | partial | Done: budget 0 / -500 / 10^12. NOT RUN: rename / delete / merge category, duplicate counterparty, delete counterparty used by a check. |
| 8 | Settings / lock / backup | partial | Done: currency to ریال, backup/settings page read, row-check button. NOT RUN: PIN and wrong PIN (security tile freezes the page), digit style / theme / language toggles, CSV import with no file, About links. |
| 9 | Navigation chaos | partial | Done: 11 deep links to missing ids, focus trap + Escape on one dialog, reload on settings, modal stacking (sell + edit). NOT RUN: keyboard-only on 5 screens, 15-screen sweep (about 8 screens looked at). |
| 10 | Resilience | partial | Done: triple-tap on service / goal / withdraw / reminder / timesheet / vehicle, reload on settings. NOT RUN: network cut (no tool), save-then-reload at several depths, 50 quick records then delete half. |
| 11 | Ideas | done | 12 ideas below. |

## Findings

Severity: 1 = blocks / loses data / wrong number, 2 = annoying, 3 = minor. Account names: «ملی» = حقوق — بانک ملی (stored balance cell 'کیف پول' tab), ledger = 'گردش حساب' tab.

| id | area | sev | reproduction | expected | actual | evidence |
|----|------|-----|--------------|----------|--------|----------|
| S-01 | Recurring / wallet | 1 | Dashboard, card «ثبت تکرارهای آبان» (3 of 3 selected), tap «ثبت همه» twice quickly. | One set of 3 records; account balance = ledger. | Toast «۳ تراکنش تکراری ثبت شد» twice. Records: salary 65 M x2, rent 18 M x2, internet 1.35 M x2. Month income 19 M -> 149 M, month expense 16.28 M -> 54.98 M. Stored balance of ملی = 257 776 250 while last ledger balance = 163 776 250 (94 M gap). Wallet reconciliation card now says wallet is 52.65 M above computed. | `sheet هزینه/درآمد` rows duplicated; `sheet گردش حساب` last row 163 776 250; `sheet کیف پول` row 257 776 250; requests show account PUT 166 476 250 then 257 776 250. |
| S-02 | Vehicles / wallet | 1 | Vehicle page, tap «انجام شد» on an item that already has a paid expense (oil, cost 1 450 000), save with one tap. Repeat with brake pads (2 100 000). | Old expense replaced by new one: balance unchanged (or minus new cost). | Old expense (dated 19 Sep) is deleted and refunded (+cost), new expense is written to the ledger (-cost) but the account PUT is written with the refunded value only. Account grew by the cost each time: 68.93 M -> 70.38 M (ledger says 68.93 M), then 70.38 M -> 72.48 M (ledger says 70.38 M). Side effect: a past month's closing balance is rewritten (1405-07: 130 095 000 -> 131 545 000) and September loses its expense. | Ledger rows 'حذف' +1 450 000 and 'ثبت' -1 450 000 with balance 68 926 250; account PUT 70 376 250 twice. |
| S-03 | Goals | 1 | Treasury, goal «صندوق اضطراری», «واریز به هدف», source ملت (26.15 M), amount 1 000 000 000, save. | Block or warn: more than the account has. | Accepted. Only hint: «از مبلغ هدف بیشتر می‌شود». ملت = -973 850 000, wallet total = -900 963 750, goal 1 045 000 000 of 240 000 000 shown as 100%. No negative-balance warning anywhere. | Wallet page text after deposit; goal card «۱٬۰۴۵٬۰۰۰٬۰۰۰ از ۲۴۰٬۰۰۰٬۰۰۰ · ۱۰۰٪». |
| S-04 | Goals | 1 | Goal with 46 M saved -> «ویرایش» -> «بایگانی». | Confirm; money returned or clearly kept; archived goals listed and restorable; totals agree. | One tap, no confirm. Goal vanishes from the treasury page, which has no archived view or filter for it. Dashboard «دارایی‌های منتخب» still includes the 46 M (assets 144 036 250 = wallet 98 036 250 + 46 M). The money is neither back in an account nor visible. | Treasury screen shows «هنوز دارایی‌ای ثبت نشده»; dashboard assets figure. |
| S-05 | Vehicles | 2 | Vehicle with 2 services, 15 history rows and 10 expenses -> trash icon -> «حذف». | Confirm names what goes with it (services, history, N expenses), or block. | Generic text «از حذف این خودرو مطمئن هستید؟». After delete: 2 service rows and 15 history rows stay orphaned in the sheet; the 10 expenses stay in the books titled «… — تیبا ۲ — شخصی» for a vehicle that no longer exists. | `sheet سرویس_خودرو`, `تاریخچه_خودرو`, `هزینه` after delete. |
| S-06 | Vehicles / Goals / Vault / Budgets | 2 | Type a leading minus: vehicle mileage -100, vault quantity -5, goal target -5, vault price -50, budget -500. | Reject «negative» with a message. | The minus is dropped silently and the positive value saved: vehicle 100 km, +5 coins, target 5 toman, price 50, budget 500 toman. (Mileage modal with -5 and some others do reject.) | Vehicle list «خودرو منفی … ۱۰۰ کیلومتر»; vault card «۵ عدد»; goal «از ۵»; budget «خودرو ماهانه ۵۰۰ تومان». |
| S-07 | Vehicles / Vault / Budgets / Dang | 2 | Mileage 1 000 000 000; vehicle with 10^12 km; 1 000 000 coins at 269 500; budget 10^12; person weight 10^9; settle 99 999 999 on a 5.75 M debt. | A «is this right?» warning for absurd values. | All saved silently. Mileage 10^9 turns two services to «گذشته» at once; 10^6 coins shows total value 256 181 326 900 000 toman; the settled person becomes creditor of 94 247 166; group creditors total 107.5 M against 6.5 M debtors. | Vault card, dang summary text, vehicle list. |
| S-08 | Dang-split | 2 | Group «سفر شمال» -> items -> add expense 5 000, pick «هیچ‌کس», save. | Block or force an allocation. | «هزینه ثبت شد», total 54 345 000 -> 54 350 000 but nobody's share changed: 5 000 belongs to nobody, sum of shares != total. List says «بدون تخصیص», no warning. | Dang summary before/after. |
| S-09 | Vehicles | 2 | Oil service «انجام شد» with mileage 1000 (current car mileage 63 050). | Warn that this is below the current mileage; do not break the schedule. | Saved. Next due becomes 6 000 km so the item shows «گذشته» forever. The form pre-fills 61 350 (planned previous service) instead of the current mileage 63 050. | Item card «گذشته · بعدی: ۶٬۰۰۰ کیلومتر». |
| S-10 | Vehicles | 3 | Mileage modal, type 99999999999999999999, save. | Either saved with a sane cap or an error. | Success toast «کارکرد به‌روزرسانی شد», but mileage and history count unchanged (nothing saved). Not fully certain: toast may have been from the earlier save. | History count stayed 9 -> 10 only after the next real save. |
| S-11 | Vehicles / Dang | 2 | Add a second vehicle named exactly like an existing one; add a second person «رضا مرادی» to the dang group. | Duplicate guard. | Both accepted. In the dang expense form two identical «رضا مرادی» rows are indistinguishable; two vehicles named «تیبا ۲ — شخصی» in the list. | Vehicle list screenshot, allocation list text. |
| S-12 | Vehicles | 3 | Vehicle title of 300 characters. | Wrap or truncate. | The title runs off the card without wrapping; the 10^12 km figure is clipped; the markup title `<img onerror>` + emoji is shown as plain text (safe). | Vehicle list screenshot 12. |
| S-13 | Timesheets | 3 | Add an entry identical in time to an existing one («هم‌پوشان», 10:32-11:32 twice). Triple-tap save. | Overlap warning. | Saved once (triple-tap safe) but overlapping entries are double counted: total 5 h from 4 distinct hours. Delete-timesheet confirm says «تمام رکوردهای آن» without a count. | Timesheet detail totals. |
| S-14 | Settings | 2 | Settings -> عمومی -> «واحد پول» -> ریال; open wallet, dashboard, records, reload. | Every amount re-labelled (text promises «در تمام نمایش مبالغ اعمال می‌شود») and a clear note whether stored numbers are converted. | The picker says ریال but wallet, dashboard and records still show «تومان» with identical numbers, also after reload. Either the setting does nothing or it is not wired to the displays. (I could not tell whether I left it on ریال; the control later read empty.) | Wallet text after change and after reload. |
| S-15 | Settings | 2 | Settings -> tap the «امنیت» tile (also tried via the text «قفل اپ با رمز»). | The lock settings open. | The page stops responding: `eval` times out and `goto`/screenshot time out with «Execution context was destroyed … navigation», i.e. the page keeps reloading; recovered only by navigating to /about. Reproduced 3 times. Possibly caused by the sandbox (no native plugins), so PIN/wrong-PIN tests could not run. | Driver errors; `consoleErrors: 0` reported. |
| S-16 | Settings | 2 | Settings -> «حساب و داده» -> «بررسی ردیف‌ها». | An integrity check would catch the 94 M balance-vs-ledger gap. | Message: «همهٔ ردیف‌های درآمد و هزینه در ستون درست هستند» (column placement only). The separate wallet reconciliation card does flag the gap, but nothing says which tap caused it. Also «آخرین پشتیبان: هنوز گرفته نشده». | Settings text. |

## Invariant log

| Area | Held | Violated |
|------|------|----------|
| 1 Vehicles | Triple-tap save made one record each time (service, vehicle). Service interval 0 and mileage 0 rejected. Sum of accounts = wallet total at every look. | S-02: account balance != ledger after a re-done service; past month's closing balance rewritten. S-05 orphans: expenses of a deleted vehicle remain. Mileage lower than current is confirmed first (good) but see S-09. |
| 2 Goals | Withdraw > saved rejected; triple-tap deposit and double-tap withdraw made one entry; transfer to goal does not change net worth (account -1 M, goal +1 M). | S-03: account negative -973 M, goal 4x its target. S-04: archived goal still in dashboard assets but invisible on its own page. |
| 3 Vault | Sell > owned rejected («موجودی کافی نیست»); price 0, quantity 0 and text rejected; delete has undo. | S-06/S-07: negative sign stripped, absurd quantity accepted. Not checked: whether purchases move wallet money (appeared not to). |
| 4 Dang | Sum of shares equals total for all normal items (54 345 000 checked); 1 toman among 3 kept totals consistent; deleting a person reassigns the item with undo. | S-08: item with nobody -> total grows, shares do not. S-07: overpayment accepted and inflates creditor total. |
| 5 Timesheets | End cannot be before start (wheel limits hours/days); triple-tap = one entry. | S-13: identical overlapping entries double counted. |
| 6 Recurring / reminders | Reminder triple-tap = one record. | S-01: double-tap on «ثبت همه» doubles all three records, income and expense totals double, balance != ledger. |
| 7 Budgets | Budget 0 rejected. | S-06 (-500 -> 500); 10^12 accepted. |
| 8 Settings | Settings pages read-only otherwise. | S-14 currency has no visible effect; S-15 freeze. |
| 9 Navigation | 11 missing-id deep links show clean «not found» pages (vehicles, timesheets, dang-split have a back-to-list button); focus trap keeps Tab in the dialog and Escape returns focus to the trigger. | Modal stacking: a sell dialog stayed open behind the edit dialog I opened next (cosmetic). |
| 10 Resilience | Most save buttons are double-tap safe. | S-01 and S-02 show that the multi-write flows (recurring batch, service redo) are not atomic, so a stale second balance write wins. |

Baseline note: before I touched anything the wallet reconciliation card already said the wallet (95 486 250) was 43.9 M below the computed balance (139 386 250). That is the seed data; every drift in this report is on top of it.

## What held up well

- Mileage lower than the previous one asks «اشتباه تایپی نیست؟» and records it as «اصلاح کارکرد»; 0, text and negative-with-confirm handled.
- Triple-tap on service done, goal deposit, goal withdraw, vehicle save, reminder save, timesheet save, dang item save: always exactly one record.
- Goal withdraw beyond saved, vault sell beyond owned, interval 0, budget 0, 0/negative person weight: clear validation messages.
- Delete flows for vault entries and dang persons show an undo toast («بازگردانی»).
- Markup/emoji text is shown literally (no injection); deep links to missing ids never crash.
- Dialogs trap focus and Escape restores focus to the opener.
- The wallet page's «تطبیق کیف پول» card flags balance drift and shows by how much.
- An «فعالیت_ها» activity tab exists in the sheet (who/what/when), a base for an audit trail.

## Ideas

| # | Risk found | Idea | Why | Size | Where |
|---|------------|------|-----|------|-------|
| 1 | S-01/S-02: two writes race, balance != ledger | Make every money flow one transaction: compute the new balance once from the ledger, plus a global «busy» lock on batch buttons (disable on first tap) | A user can never produce a wrong balance by tapping fast | medium | `src/services` write path, shared button hook |
| 2 | S-16: integrity check checks only columns | «Check my books» button: recompute each balance from the ledger, compare with stored cell, month closings vs records, orphan rows (services of deleted vehicles), duplicate records; offer one-tap repair | Catches every drift in this report; builds trust | medium | Settings «حساب و داده», service layer |
| 3 | S-01: duplicate recurring posts | Duplicate guard everywhere: same title+amount+date+account within 60 s asks «ثبت دوباره؟»; recurring items remember «posted for Aban» per item | Stops double posts from any path (tap, SMS, import) | small | shared record-write path |
| 4 | S-03: balances go to -973 M | Overdraft warning on any debit that makes an account negative («موجودی کافی نیست، ادامه؟») | A hostile or careless 10^9 deposit is caught at once | small | transfer / goal / record forms |
| 5 | S-07: 10^9 km, 10^12 budget, 10^6 coins | Sanity warning «این مبلغ ۱۰۰ برابر معمول شماست / خارج از محدوده معمول» using the user's own median per category and per-field sane maxima | Typo guard for the Persian-digit keyboard | small | shared amount input |
| 6 | S-06: minus sign silently removed | Reject or confirm: «علامت منفی حذف شد؟»; or show an inline error under the field | Silent rewriting of the user's input is the worst kind of bug | small | `normalizeDigits`/amount input |
| 7 | S-04, S-05: archive/delete with hidden money or dependents | Dependency-aware delete dialog: «این خودرو ۲ سرویس و ۱۰ هزینه دارد»; archive of a goal asks where the money goes; «بایگانی‌شده‌ها» tab with restore | No data disappears without a visible way back | medium | goals, vehicles, counterparties |
| 8 | Deleted data is hard to recover | 30-day trash for every record type (not only the 5-second undo) | Recovery from mistakes found days later | medium | service layer, new «سطل بازیافت» |
| 9 | Months can be silently rewritten (S-02 changed July's closing balance) | Month locking: after «بستن ماه» edits/deletes in that month need an explicit «باز کردن ماه» and are logged | Protects closed reports and tax figures | medium | period close, month balance tab |
| 10 | No audit trail visible to the user | Show the existing activity tab as «تاریخچه تغییرات» with filter by record and an «undo this change» where safe | Lets the user find which tap broke things | medium | Settings «فعالیت» |
| 11 | «آخرین پشتیبان: هنوز گرفته نشده» | Backup reminder after N changes / 7 days, and an automatic backup before risky actions (year close, import, bulk delete) | Safety net for all of the above | small | backup service, dashboard banner |
| 12 | CSV import is all-or-nothing | Dry-run import: preview rows, duplicates and totals before anything is written; accountant export (CSV/PDF of ledger with opening/closing balance per account) | Prevents bulk damage; makes the books auditable by a third party | medium | import / export pages |
| 13 | Two devices may write at once (S-01 style stale writes) | Optimistic version/etag per row with a conflict dialog («این رکورد در دستگاه دیگر تغییر کرده») | The last writer wins silently today | large | sheets repository |
| 14 | Duplicate names (S-11) and unassigned dang items (S-08) | Duplicate-name guard in every list (vehicles, people, counterparties) and «پخش نشده: ۵٬۰۰۰» banner / block in dang | Keeps lists unambiguous and sums honest | small | shared form validation |

## NOT RUN list

- Fuel entry with price 0 and negative litres; service/fuel dates in the future or a past century (wheel picker not driven).
- Three vehicles with an identical plate (plate cells filled wrongly; only the name duplicate was tested).
- Goal target date before today; deleting a goal (UI offers only archive).
- Dang percentages not summing to 100 (UI uses weights); rename two people to the same name.
- Timesheet: approved entries edit (no approval state found).
- Recurring items: day 31 in a 29-day month, 0 interval, delete one that already posted, what happens to posted records; reminders: in the past, many, snooze twice.
- Categories: rename / delete in use / merge into itself; counterparties: duplicate name, delete one used by a check.
- App lock / PIN / wrong PIN / reload while locked (security tile froze the page).
- Digit style, theme, language toggles; CSV import with no file; About links; backup page buttons (read only).
- Keyboard-only use of 5 screens (one dialog tested); 15-screen visual sweep (about 8 viewed).
- Network cut (no tool to drop the network); save-then-reload at several depths; 50 quick records then delete half.
- Real Google Sheets behaviour and a real phone (only a simulated sheet was used).

## Environment oddities

- The page froze / reloaded endlessly after tapping the «امنیت» settings tile; recovery needed navigation to another route. Could be the missing Android plugins in the sandbox.
- Many speed-dial and card buttons are found by text only through `eval` clicks; plain `click text=` sometimes timed out when the dial was closed or the label also appeared in a tab.
- Wheel date pickers cannot be driven by `fill`, so date-range attacks were not possible.
- The seed already had a wallet-vs-computed gap of -43.9 M and bank-SMS gaps on both bank accounts, so «balance != computed» alone is not a new signal; the new signal is stored balance != ledger last row (S-01, S-02).
- My test data is still in the in-memory sheet: duplicated recurring records, service redo refunds, 4 test vehicles, extra dang people/items, an archived goal.
