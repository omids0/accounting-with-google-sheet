# UX Round 5 — Implementation Spec

Audience: the Claude agent that will implement this. Decisions were approved by the product owner over the wireframes in this folder; do not re-litigate them. Ask only about technical blockers or where this document says "ask first".

Rounds 1–4 precede this (`IMPLEMENTATION-SPEC.md`, `UX-ROUND2-SPEC.md`, `UX-ROUND3-SPEC.md`, `UX-ROUND4-SPEC.md`). Out of scope by decision: bottom navigation (never), module on/off switches, light-theme colors, and **any redesign of the installments, checks, dang, receivables, treasury or other list pages on mobile** — they stay as they are. Desktop gets a different *layout* for those lists (Task C), not different content or behavior.

Wireframes: `mobile-calm.html` + `mobile-calm-2.html` (dashboard, charts page, menu), `desktop-layout.html` + `desktop-layout-2.html` (desktop, tablet, list page with side panel, entry form, settings), `round5-extras.html` (contextual discovery, native polish, keyboard, backup).

## Project rules (mandatory)

- 300-line hard limit per staged file; extract rather than grow.
- Reuse before create. No tooling/config changes without explicit permission; this spec approves adding `@capacitor/haptics` and `fflate` (Task G) to `package.json`.
- `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run size-limit` and the a11y suite (light + dark) must pass; Prettier only on touched files.
- Update About for every user-visible change; bump `version` in `package.json` and the two root `version` lines in `package-lock.json` (next minor).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per task group; branch off `main`; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...<branch>?expand=1`.
- Android is built by GitHub Actions only; native changes are reviewed by reading and tested by the owner.
- Skeletons must keep matching their pages (round 2 rule); re-run the skeleton comparison for the dashboard after Task A.
- Verify visually with the Playwright recipe in the agent memory file `reference_playwright_sw_mocks.md` (mobile 390×844, tablet 820×1180, desktop 1440×900).

## Task A — Calm mobile dashboard and a charts page

**Why.** The dashboard is 3400 px tall with 12 blocks, every one a tinted card; numbers repeat. Wireframe: `mobile-calm.html` (left phone = proposal, right = today).

**Rules.** One tinted block per screen (the hero); everything else is a flat list with dividers — no card borders, no gradients. Every number appears once. Nothing that is not tappable gets a card.

**Dashboard, top to bottom (exactly these five blocks):**
1. Period row: month picker chip («مهر ۱۴۰۵ ▾») and today's date — replaces the filter chips row; the full date-range filter stays reachable from the chip.
2. Hero «دارایی قابل اتکا»: amount, the ✎ button (→ `net-available-settings`, as today), the «؟» HelpHint (round 3), and a strip inside the card with three figures: درآمد ماه / هزینه ماه / خالص. This strip replaces the four stat cards. The sparklines go.
3. «پیش رو» — up to three rows from the existing dashboard reminders (installments, checks, dang, personal, vehicle; 30-day horizon), **overdue items first** with a red day badge and «معوق · N روز گذشته»; header shows «· N معوق» when any; «همه ←» opens the due-dates report. Rows: day badge · title · amount.
4. «تراکنش‌های اخیر» — five rows (day badge · title · category · account · signed amount) + «همه ←» to records. Keep the empty-state CTA logic from rounds 1 and 4 («ثبت اولین تراکنش» only when the sheet has no records; «ماه قبل» otherwise).
5. «تحلیل این ماه» — toggle **هزینه | درآمد** (default هزینه) and the top three categories as rows with a thin bar and amount; «نمودارها ←» opens the charts page.
6. «دارایی و بدهی» — two rows: دارایی‌های منتخب (sub: کیف پول · صندوقچه · طلب‌ها) and بدهی‌های منتخب (sub: اقساط این دوره · چک‌ها · بدهی) with amounts; one line «تفاوت این دو = دارایی قابل اتکا»; «جزئیات ←» opens the full breakdown (today's two cards, moved to their own view or the assets/liabilities report).
7. End. The discovery card («می‌دانستی؟») and the resume card stay as they are (above the period row), but the discovery card becomes a single row (title + «برو ببین» + ✕) when shown.

Dark mode uses the same structure; the hero keeps its gradient, the lists are flat on the page background.

**Charts page** (`/charts`, new tab `charts`, title «نمودارها», back to dashboard):
- Top: toggle **ماه | سال** and a period picker.
- «دسته‌ها»: toggle **هزینه | درآمد**; one donut (total in the center) and the category list with percent and amount. Reuse `CategoryDonutChart`.
- «درآمد در برابر هزینه · ۶ ماه»: paired bars (reuse `IncomeExpenseMonthlyChart`).
- «روند دارایی قابل اتکا · ۶ ماه»: a line. Compute month-end values from the data already loaded by the dashboard bundle (opening balances + monthly net flow + selected assets/liabilities at that time); if a true history is not derivable, plot «خالص تجمعی ۶ ماه» and label it so — ask first if unsure.
- «خالص ماهانه · ۶ ماه»: single bars (income − expense).
- Nothing else. Reports stay in the drawer's «گزارشات».

**Accept.** Dashboard at 390 px shows the five blocks in order with no tinted cards besides the hero; overdue items lead «پیش رو»; the toggle switches analysis between expense and income; charts page renders the four sections; skeleton parity for the new dashboard; a11y light + dark pass.

## Task B — Drawer menu and sidebar

Wireframe: `mobile-calm-2.html` (menu), `desktop-layout.html` (sidebar).

1. Remove the gradient profile header. Replace with one 52 px user row: avatar 32 px, name, second line «شیت: <active sheet label>», theme toggle on the end.
2. Items single-line 44 px, icon + label only. **Drop the menu hints**: remove `MenuItemLabel`'s hint rendering and `navHints.ts` (EmptyState descriptions and the «؟» hints carry that meaning now).
3. Three groups with small muted headers: «پول» (داشبورد، کیف پول، رکوردها), «تعهدات» (اقساط، چک‌ها، بدهی، طلب‌ها، صندوقچه), «بیشتر» (یادآوری، سرویس خودرو، طرف حساب‌ها، گزارشات ▾، محاسبات ▾، تایم‌شیت ▾, پیامک بانکی on Android), then «اپ» (تنظیمات، درباره و راهنما) with icons — not footer text.
4. Footer: app name · version · active sheet label (one muted line).
5. The desktop sidebar (Task C) is the same component at 220 px, always open.
6. Update About's navigation paragraph.

**Accept.** Drawer fits the groups without scrolling on 844 px; no hints; settings/about are regular items; sheet name visible in the user row.

## Task C — Desktop and tablet layout

**Why.** One breakpoint (`lg` 1024) makes 481–1023 px a centered phone column and ≥1024 a stretched single column; the owner's user called the desktop «بدترکیب». Wireframes: `desktop-layout.html`, `desktop-layout-2.html`.

1. **Breakpoints**: mobile < 768; tablet 768–1279 (`md`); desktop ≥ 1280 (`xl`). `lg` usages in layout styles move to these two. Content max width 1200 px.
2. **Tablet**: icon rail 64 px (icons only, labels on hover/long-press tooltip), two-column grids, bottom nav hidden, drawer never detached from the app column.
3. **Desktop**: sidebar 220 px (Task B), header 48 px with page title, period chip, and the page's **primary action** («+ ثبت تراکنش», «+ ثبت چک»…) plus the other speed-dial actions as header buttons; the floating speed dial is hidden at `xl` (`PageSpeedDial` renders into the header slot instead — one source of actions, `usePageSpeedDial` config stays).
4. **Dashboard** ≥ 1280: 12-column grid — hero c4, «پیش رو» c4, «تحلیل» c4; «تراکنش‌های اخیر» as a table c8; «دارایی و بدهی» c4. Tablet: two columns in the same order.
5. **List pages** ≥ 1280 (checks, dang, receivables, installments, treasury, counterparties, personal reminders, vehicles, timesheets): a table view with sortable columns and the same row actions, filters in the header row, totals as two cards under the table. Add/edit opens the existing `FormModal` as a **side panel** (380 px, left edge, list stays visible) — add a `variant="panel"` to `FormModal` that applies only at `xl`. Mobile and tablet keep today's cards and bottom-sheet modals untouched.
6. **Entry form** ≥ 1280: two-column grid inside a 760 px card; a «ذخیره و بعدی» button that saves and keeps the form open with focus on amount.
7. **Settings** ≥ 1280: section list on the right, selected section's content on the left (today's accordion stays below 1280).
8. Skeletons follow the new layouts at `md`/`xl` (same containers).

**Accept.** Screenshots at 820×1180 and 1440×900 match the wireframes for dashboard, checks, entry, settings; no centered phone column on tablets; speed dial absent at `xl` with its actions in the header; mobile screenshots unchanged except the dashboard (Task A) and drawer (Task B).

## Task D — Contextual discovery (replaces the generic card where a signal exists)

**Rules.** Deterministic signals only — exact category/field values, never text guessing. Shown only when the target feature has **no data**. Each signal **once per period (month)**; «دیگر نپرس» is permanent per signal; at most one nudge per day; never on the user's first day. Never a modal: an inline card under the «ذخیره شد» toast that disappears after 8 s. A positive answer finishes the job on the record just saved (no dead end).

| Signal | Condition | Card | Positive action |
|---|---|---|---|
| Expense saved with category «خودرو» and vehicle = «سایر» | zero vehicles | «این هزینه خودرو بود؟ با تعریف خودرو، سرویس بعدی و کارکرد حساب می‌شود.» | open the vehicle form; on save, link the saved expense to it (vehicle expense meta) |
| First check saved | checks reminder rule off | «یادآوری سررسید چک روشن شود؟» | enable the rule (and ask permission if needed) |
| Same counterparty name typed 3× in dang/receivable/check | name not in counterparties | «<name> را به طرف حساب‌ها اضافه کنم؟» | create the counterparty with that name |
| 10 transactions in a row without an account | ≥ 1 wallet account exists | «حساب کیف پول برای تراکنش‌ها انتخاب می‌کنی تا موجودی خودکار به‌روز شود؟» | open the saved record's account field |

Storage: `accounting_nudges_v1` per spreadsheet `{ [signalId]: { shownPeriod: 'YYYY-MM', never: boolean } }`; add to `ACCOUNT_KEYS` in `localDataWipe.ts`. Unit-test the gate (period, never, daily cap, first-day, target-has-data). The generic «می‌دانستی؟» card keeps features without a data signal (تایم‌شیت، محاسبات) and is skipped on any day a contextual nudge was shown.

## Task E — Native polish

1. **Pull-to-refresh** on the dashboard and every list page: a small spinner row above the content, threshold 64 px, triggers the page's existing refresh (the speed-dial «بروزرسانی» callback); web and Android, touch only; respects `prefers-reduced-motion`.
2. **Haptics** (APK only, `@capacitor/haptics`): Light on the raised dashboard button and on a successful save; Medium when a delete starts (undo window); Selection on toggles and the paid checkbox; Error on a failed save; Success on undo. One `haptic(kind)` helper that no-ops on web.
3. **Safe areas**: header padding uses `env(safe-area-inset-top)` (check it does today — the bottom nav does, the header may not); the drawer user row and the onboarding header too. Verify with a notch-sized inset in the browser (`--safe-top` override) and on the owner's phone.

## Task F — Keyboard and accessibility

1. Focus ring: a solid 2–3 px ring at ≥ 3:1 against both themes (token `--focus-ring`), applied through one global `:focus-visible` rule; remove the 30 % color-mix rings.
2. «پرش به محتوا» skip link as the first focusable element; `main` gets `tabindex="-1"` and receives focus on route change.
3. Escape closes only the top overlay (round 4 A5); verify after Task C's side panel.
4. Arrow keys: `WheelPicker` (↑↓ value, ←→ between columns, one tab stop per column), custom `Select` listbox (↑↓, Home/End, type-ahead), `CategorySelect` list, speed dial menu (↑↓). Drawer: focus moves in on open and back to the hamburger on close.
5. Unique dialog ids via `useId`; initial focus on the first field (round 4).
6. Add keyboard checks to the a11y suite where axe cannot see them: a Playwright test that opens the entry form, tabs through it, picks a date with arrows only, saves.

## Task G — Full backup and restore

Wireframe: right phone in `round5-extras.html`.

1. Settings → «حساب و داده» → card «پشتیبان کامل»: «دانلود پشتیبان کامل (.zip)» = every tab as CSV plus `manifest.json` (app version, spreadsheet label, export time, row counts) zipped with `fflate` (approved); on Android, write with the round-4 filesystem/share path. File name «حساب کتاب · پشتیبان · ۱۴۰۵-۰۷-۲۰.zip».
2. «بازیابی از پشتیبان…»: pick a zip, show a preview («۱۲ تب، ۸۴۰ ردیف · نسخه ۱٫۲۲ · ۳ مهر ۱۴۰۵»), choose «جایگزین» (clear the tab, write rows) or «ادغام» (skip ids that exist), confirm, run with progress, report counts. Reuse the round-4 import machinery per tab.
3. «آخرین پشتیبان» timestamp stored per spreadsheet; a dashboard guide card «۴۰ روز از آخرین پشتیبان گذشته» after 30 days (same component family as the resume card; lowest priority among guide cards; dismiss = snooze 30 days).
4. About: new feature entry.

## Task H — Performance, remaining

Only what round 4 did not finish; report measured numbers before/after with the same method (source-map breakdown, network bytes, Lighthouse for `/` and the dashboard).
1. Google Identity script lazy-loaded (if round 4 skipped it, try once more with a thin wrapper around `GoogleOAuthProvider`; skip and say why if the library resists).
2. `react-router` and `tailwind-merge` share of the main chunk: check for a lighter import path or a `cn` without `twMerge` on hot paths; do not replace libraries without asking.
3. Target: Lighthouse performance ≥ 90 on `/` and ≥ 85 on the dashboard — do not change the thresholds in `scripts/`; just report.

## Task I — About and version

Update About for the dashboard, charts page, menu, desktop layout, nudges, pull-to-refresh/haptics, backup; bump the version.

## Suggested order and commits

1. `docs` — commit any untracked `wireframes/` files.
2. `feature` — B (menu/sidebar) — small, and A and C build on it.
3. `feature` — A (dashboard + charts page) with skeleton parity.
4. `feature` — C (breakpoints, header actions, desktop/tablet layouts, side panel, table views).
5. `feature` — D (nudges) with tests.
6. `feature` — E (pull-to-refresh, haptics, safe area).
7. `feature` — F (keyboard) with the Playwright keyboard test.
8. `feature` — G (backup).
9. `perf` — H.
10. `docs` — I.

Stop after commit 3 and report with mobile/tablet/desktop screenshots of the dashboard; then continue. Final report: screenshots of every changed screen in light and dark, perf tables, anything skipped with the reason.
