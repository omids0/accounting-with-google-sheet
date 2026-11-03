# Round 3 - Saboteur (persona 4), employee dataset, port 4505

Tester: hostile user, screen + `sheet`/`requests` peeks only. Today = 5 Aban 1405.
Screenshots: `C:\Users\14022732\AppData\Local\Temp\claude\d--project-myProjects-accounting\27ae5107-8696-4a72-bcb6-e2022ae2c0ac\scratchpad\r3\saboteur\NN-*.png` (names quoted below).

## Summary

1. Two money-moving flows (new transfer, record delete) are not atomic: if the page reloads or navigates while saving, half the writes land and the books silently disagree. Nothing detects or repairs it.
2. A deleted record whose refund landed but whose row stayed gets refunded AGAIN on the next delete: account balance +7,000 / +450,000 too high, no ledger row for the first refund.
3. A transfer can be saved as a "phantom" (row in the transfers list, no ledger rows, no balance change). Deleting it later reverses money that never moved (ملی +2M, cash -2M).
4. Rapid taps (20 / 100 / 250 ms gaps) on «ثبت انتقال», «حذف», «بازگردانی», «ذخیره», «فقط موجودی» all produced exactly one effect. Delete modal, focus trap, Escape, 404 pages, markup in notes, overflow amounts and dashboard period handling held up well.
5. Transfers accept an amount larger than the source balance with no warning (cash went to -94.7M); negative sign and decimals are silently stripped («-5» becomes 5, «1e9» becomes 19).
6. Smaller issues: Latin digits in the transfers list, toast covers header title, SMS-confirmed internal transfer is invisible on the new Transfers page, misleading "enter amount" message for out-of-range amounts.

Counts: severity 1 = 3, severity 2 = 5, severity 3 = 6.

## Findings

| id | sev | reproduction | expected | actual | evidence |
|----|-----|--------------|----------|--------|----------|
| S-01 | 1 | Wallet > FAB «عملیات کیف پول» > «انتقال». Fill from=«حقوق — بانک ملی», to=«پول نقد», 2,000,000. In the page run `b=document.querySelector('[role=dialog] button[type=submit]');b.click();b.click();b.click()` (3 clicks in the same tick). Then open the transfers page. | One transfer, or none; books consistent. | URL becomes `/wallet?` (native form GET: the page reloads). The transfer row (id d522e800…) WAS written to sheet «انتقال‌ها» but no ledger rows in «گردش حساب» and no balance change. Transfers list shows 5 transfers = 9,000,000, balances reflect only 7,000,000. Reproduced twice (also with an empty form). | `sheet title="انتقال‌ها"` sum 9,000,000 vs ledger pairs afc299/d8f7ea/3f6461/c64178 = 7,000,000; `sheet title="گردش حساب"` has no rows for d522e8; ملی 57,171,250 / cash 7,410,000 (expected 55,171,250 / 9,410,000). Screens s08, s09, s15 (trace lists only 4 transfers, list page 5). Real-user variant: any reload/kill/network drop right after tapping save. |
| S-02 | 1 | Delete the phantom from S-01 (transfers page, 4th row, «حذف»). | Deleting a transfer that never moved money should not move money. | Modal says 2,000,000 returns to ملی and leaves cash; ledger gets «لغو انتقال» pair: ملی 57,171,250 -> 59,171,250, cash 7,410,000 -> 5,410,000. Per-account balances are now wrong by 2,000,000 each (total unchanged so the total/diff cards look fine). | `sheet title="گردش حساب"` rows `۱۹:۵۶:۲۳ ... لغو انتقال ...`; wallet card values via screen. s20. |
| S-03 | 1 | Records page. Click delete on an expense paid from ملی (e.g. «خوراک» 7,000), press «حذف», wait 500 ms, `reload`. | Either fully deleted or fully intact. | Balance refunded (ملی 162,257,193 -> 162,264,193) but record stays, no ledger row. Deleting it again refunds AGAIN (162,271,193) and writes a ledger row based on the old balance. Real instance also hit with «ناهار بیرون» 450,000 (reload ~1 s after the second delete): balance +450,000 with no ledger row, then double refund. Dashboard difference card moved by the extra amount (+1,096,200 -> +1,546,200). | `sheet title="کیف پول"` / «گردش حساب» chain breaks: `...۲۰:۱۰:۵۹ 7000 162250193`, `۲۰:۱۱:۰۴ 7000 162257193`, wallet 162264193 after reload, `۲۰:۱۱:۳۱ 7000 162271193`. Two normal consecutive deletes (no reload) behaved correctly. |
| S-04 | 2 | Transfer form: from=«پول نقد» (balance 5.4M), to=«حقوق — بانک ملی», amount 100,000,000, submit. | Warning or block "more than the balance". | Saved silently; cash = -94,714,715 and shown as a normal card. No confirmation anywhere. | `sheet title="کیف پول"`: `پول نقد=-94714715`; s21. |
| S-05 | 2 | Amount field in transfer form and entry form: type `-5`, `1.5`, `1e9`, `NaN`, `-500`. | Reject, or show the parsed value before saving. | Characters silently dropped: `-5` becomes 5, `1.5` becomes 1, `1e9` becomes 19, `-500` becomes 500 and the record is saved (expense 500, 19). Only the field text changes; no message. User asked for a minus/decimal gets a different amount. | `trows` rows 5 / 1 / 19; `sheet title="گردش حساب"` `-19`, `-500`. |
| S-06 | 2 | Transfer amount 1000000000000000 or 99999999999999999999. | Clear "too large" message. | Field empties itself and the error says «مبلغ را وارد کنید» (as if nothing was typed). No transfer saved (good). | Dialog text after submit. |
| S-07 | 2 | Confirm SMS «موجودی ۵۳٬۴۴۱٬۲۵۰» (loan instalment 4,350,000, ملی) when the app balance is 162,271,193. | Notice should say old balance after the payment -> new. | Notice reads «از ۱۶۲٬۲۷۱٬۱۹۳ به ۵۳٬۴۴۱٬۲۵۰ تنظیم شد» (the number before subtracting the 4.35M payment); the ledger line is stored as the instalment with amount -108,829,943 (not 4,350,000). | `lastled` `۲۰:۱۲:۴۸ ... -108829943 53441250 قسط: وام شخصی (#7)`; s43. (Dataset was polluted by my earlier attacks, so the size of the jump is mine; the wording/ledger-amount issue remains.) |
| S-08 | 2 | Confirm SMS «تأیید انتقال» (ملی -> ملت 5,000,000). | The transfer appears on «انتقال‌ها» like any transfer, deletable. | Only a ledger line «انتقال بین حساب‌ها» (ملت +5,000,000) is written; transfers sheet unchanged (22 rows before/after), so the new Transfers page never shows it and the user cannot undo it from there. | `trows` rows=22 before and after; `sheet title="گردش حساب"` `۲۰:۱۳:۴۱ b55c48 5000000 ...`. |
| S-09 | 3 | Wallet and transfers list. | Same digit style everywhere. | Transfer rows show Latin digits for the amount («1,001 تومان», «2,000,000») while date/count are Persian («۵ آبان ۱۴۰۵», «۱۲ انتقال»); card balances are also Latin on the wallet screen. | s10, s22, s31. |
| S-10 | 3 | Transfers page, delete one, or entry form with empty amount. | Toast should not hide the title. | Success/error toast sits over the page title («انتقال‌ها», «ثبت جدید»). The row that slides into the deleted row's place keeps a red hover/focus trash icon. | s20, s35, s38. |
| S-11 | 3 | Wallet banner says 10 bank SMS waiting; open «بررسی». | Same number. | Page says «۸ پیامک در انتظار بررسی» (filter «۷ روز اخیر», and still 8 at «۹۰ روز اخیر»). The banner and page agree later (3 and 3). | s41/s42. |
| S-12 | 3 | Confirm SMS «فقط موجودی» for ملت +1,230,000 when app balance is 71,113,008. | Same jump notice as the 4.35M case, or a rule the user can see. | Only «موجودی به‌روز شد»; ledger shows amount 1,266,992 (not the SMS 1,230,000) and no «تنظیم شد» notice. Probably a threshold, but invisible. | `sheet title="گردش حساب"` `۲۰:۱۳:۲۸ b55c48 1266992 72380000`. |
| S-13 | 3 | Wallet > delete account that has transfers (net balance 53,800). | Warn that money moved by transfers leaves the total. | Modal only says records remain; net worth silently drops by the account's balance (135,731,250 -> 135,727,450, difference +1,100,000 -> +1,096,200). Transfers to it remain as «حساب حذف‌شده» (deleting them is handled with a clear message and changes no balance: good). | s30, s31. |
| S-14 | 3 | Transfer form with `<b>x</b><img src=x onerror=alert(1)> 😀` as note. | Escaped. | Escaped correctly (no execution), but the mixed LTR/RTL text renders scrambled in the list row («b>x</b><img…»). 200-char maxlength truncates a 2,100-char paste silently. | s22. |

## Invariant log

Baseline: ملت 71,150,000 · ملی 64,171,250 · cash 410,000 · total 135,731,250 · wallet reconciliation difference +1,100,000.

| attack group | invariants checked | result |
|--------------|-------------------|--------|
| Transfer 1M (single click) | sum of cards = total, total unchanged, diff unchanged, dashboard income/expense unchanged | held |
| 3 sync clicks on «ثبت انتقال» (S-01) | transfers list vs ledger vs balances | VIOLATED (phantom transfer 2M) |
| Gap 20/100/250 ms taps (3 clicks each) | one transfer per attempt, balances | held (1 transfer each, ledger pair each) |
| Delete phantom (S-02) | per-account vs ledger | VIOLATED; sum = total still held, diff unchanged |
| 0, -5, 1.5, 0.001, 1, 5, 19, 1,234, 123,456 (Persian/Arabic/Latin digits), 100M, 10^15, 10^20, «abc» | sum of cards = total, total and diff unchanged | held (only per-account overdraft, S-04) |
| Notes: markup, emoji, 2,100 chars | rows saved, escaped, 200-char cut | held |
| Dates 1395 and 1415 via wheel (1300/2100 unreachable, wheel limited to 1395-1417) | transfer applied to current balances; list shows it after sync | held (a stale list for a few seconds right after save: first `goto` showed 12 rows while the sheet had 13) |
| from = to trick | from list excludes the chosen «به» account | held |
| 8 rapid transfers (1,111..8,888) then deletes | ledger chain per account, balances | held |
| Triple tap «حذف» in modal on transfer / record | single reversal | held |
| Delete transfer whose account was deleted (2 transfers) | no balance change, clear modal text | held (S-13 about the account delete itself) |
| Record delete + double «بازگردانی» / delete two quickly | one refund each, undo within window | held |
| Reload 500 ms after delete (S-03) | record vs balance vs ledger | VIOLATED; second delete double-refunds; difference card +450,000 |
| Entry form: empty, 0, 0.001, NaN, ١٢٣٤, ۱۲۳۴, 1e9, -500, 3 rapid saves (0/20/120 ms) | validation, single record per save | held except S-05 |
| SMS: newest first (4.35M), then older (2.38M), then ملت balance-only double tap, internal transfer, «نادیده» + reload | badge count = page count, no double count, jump notice only on the big mismatch | held except S-07, S-08, S-11, S-12 (older SMS did not change balance: consistent with newer SMS balance) |
| Dashboard period: «ماه گذشته» | breakdown +75,850,000 - 70,033,750 = +5,816,250; «جزئیات ←» opens the report with the same period and same 43,081,499 | held |
| Dashboard: custom range start in future (end before start) | end clamped to start (1 آبان ۱۴۱۵ to same day), income/expense 0, headline = today's wallet | held |
| Final: ملی 53,441,250 + ملت 77,380,000 + cash -94,472,738 = 36,348,512 = «مجموع کل حساب‌ها» = report «کیف پول» = headline | sum = total | held |

## What held up well

- Delete confirmation: default focus on the quiet «انصراف», Tab cycles inside the dialog, Escape closes, triple tap on «حذف» deletes once, copy explains consequences (transfer, orphan transfer, check with linked record, undo window).
- Transfer form: from-list excludes the chosen to-account (no from = to), zero/empty/out-of-range amounts rejected, notes are escaped, many tiny sequential transfers keep the ledger chain exact.
- Rapid double/triple taps on save and undo (staggered by 20-250 ms) never duplicated an effect; entry form saves exactly once.
- Dead deep links show a proper 404 or «حساب یافت نشد» with a way back; dashboard period carries into the report via «جزئیات ←» and a fresh navigation does not inherit it.
- Wallet trace lists transfers in their own «انتقال بین حساب‌ها» group marked as deliberate and does not flag them as errors.

## NOT RUN (reason)

- Delete an account from another tab while the transfer form is open: the driver controls a single page.
- Escape during the "deleting" state of the delete modal: the state lasts a few milliseconds in the simulation, could not be observed.
- Debt with partial payments: dataset has no debts; creating one was out of the command budget. Check delete was run only WITH the linked-records checkbox (linked record removed, no balance change; undo and the unchecked variant not run).
- Reload during the undo window of a deletion that has completed its writes (only reload during the writes was tested, S-03).
- Dates in 1300 and 2100: the wheel only offers 1395-1417 (extremes 1395 and 1415 tested).
- Opening 3 modals in a row and rapid tab switching with screenshots: only partly covered (menu, filter, date wheel, transfer modal).
- Browser back after delete and browser back after submit.
- Multiple-screen clipping review: ~12 screens looked at, no clipped text found besides S-10.

## Environment oddities

- «70 plugin not implemented» page errors and the simulated Sheets (no concurrency, no latency) are simulation artifacts. S-01/S-03 depend on an interrupted save; in the simulation the write sequence takes ~1 s so reload at 500 ms hits the middle of it; on a real phone the window is larger.
- The first attack runs polluted the dataset (ملی 159M, cash -94M), which inflated SMS jump sizes (S-07). The SMS «مانده» checks were therefore wording/ledger checks, not threshold checks.
- Lists can be stale for a few seconds after a write when navigating by full page load (first transfers list showed 12 of 13 rows); not counted as a finding.
