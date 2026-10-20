# UX Round 3 — Implementation Spec

Audience: the Claude agent that will implement this. Every decision below was approved by the product owner over the wireframes in this folder; do not re-litigate UX. Ask only about technical blockers or where this document says "ask first".

Rounds 1 and 2 (`IMPLEMENTATION-SPEC.md`, `UX-ROUND2-SPEC.md`) are merged. This round: a real icon set, a redesigned dark theme, inline help for the hard concepts, undo instead of confirm for deletes, and dark-mode accessibility tests. The bottom navigation is **out of scope** (round 4); module on/off switches were rejected.

Wireframes: `wireframes/rounds/round-03/icons.html` (icon set, in context), `wireframes/rounds/round-03/dark-mode.html` (dark theme, column **D — طلایی** is the chosen one), `wireframes/rounds/round-03/inline-help-undo.html`. Screenshots in `wireframes/shared/assets/` were taken from the real app with only the token block swapped, so they are what the implementation must reproduce.

## Project rules (mandatory)

- 300-line hard limit per staged file. `src/services/settings.ts` is at 299 and `src/components/DataEntryForm.tsx` at 298: extract, never grow.
- Reuse before create. No tooling/config changes without the owner's explicit permission (`scripts/**`, `.husky/**`, `playwright.config.ts`, `lighthouserc.cjs`, ESLint/Prettier/TS config, `package.json` *scripts*). Adding the icon dependency to `package.json` is approved by this spec.
- `npm run types`, `npm run lint`, `npm test`, `npm run build`, `npm run size-limit` must pass. Prettier only on touched files.
- Update `src/components/about/aboutFeatureGroups*.ts` for user-visible changes; bump `version` in `package.json` and the two root `version` lines in `package-lock.json` (next: 1.21.0).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per task group; branch off `main`; commit the `wireframes/` additions (spec, three html pages, `assets/`) in the first commit; no `gh` CLI; after push give `https://github.com/omids0/accounting-with-google-sheet/compare/main...<branch>?expand=1`.
- Verify visually. Recipe for driving the built app with Playwright is in the agent memory file `reference_playwright_sw_mocks.md` (`serviceWorkers: 'block'`, `channel: 'chrome'`, `e2e/helpers/mockAppState.ts`, `**/values:batchGet**` mock for rows; set `settings.theme = 'dark'` in an `addInitScript` for dark screenshots).

## Task A — Phosphor Regular icons

**Decision.** `@phosphor-icons/react`, weight **Regular everywhere** (no Fill, no Duotone — the owner found Fill too busy). Active state = color plus the existing indicator line, not a weight change. Menu and sidebar icons lose their rounded background boxes: the bare icon only.

**Current state.** `src/components/AppIcon.tsx` + `src/components/appIcon/{IconSvg,businessIcons,detailIcons,themeIcons,uiIcons}.tsx` (635 lines of hand-drawn SVG, 45 names in `appIcon/types.ts`). 212 call sites use `<AppIcon name="…" size strokeWidth>`; `SpeedDialIcon` and `PRIMARY_NAV_ICONS` go through the same names. Two-tone fills come from `appIconBgClass` / `appIconAccentClass` in `src/components/ui/chartStyles.ts:285-287`.

**Do.**
1. `npm i @phosphor-icons/react` (tree-shakeable; expect +15–20 kB brotli; `size-limit` budget is 800 kB JS).
2. Rewrite `AppIcon` to map `AppIconName` → Phosphor component with `weight="regular"`, `size` as today (default unchanged), `strokeWidth` prop kept in the type but ignored (remove it from call sites only where trivial; it must not break anything). `className` passes through. Keep `aria-hidden` behavior as today.
3. Name map (current → Phosphor export):
   dashboard→SquaresFour · wallet→Wallet · receivables→HandCoins · debt→HandArrowUp · installments→CalendarCheck · checks→Receipt · treasury→Vault · counterparties→Users · car→Car · records→ListBullets · bell→Bell · chart→ChartBar · calculator→Calculator · clock→Clock · info→Info · settings→Gear · add→Plus · edit→PencilSimple · trash→Trash · search→MagnifyingGlass · filter→Funnel · refresh→ArrowsClockwise · import→DownloadSimple · export→UploadSimple · pdf→FilePdf · copy→Copy · swap→ArrowsLeftRight · map-pin→MapPin · empty-inbox→Tray · folder→Folder · contact→AddressBook · warning→Warning · lock→Lock · fingerprint→Fingerprint · eye→Eye · eye-off→EyeSlash · sun→Sun · moon→Moon · menu→List · close→X · x-mark→X · check→Check · back→ArrowRight (RTL: points to the right, as today) · chevron-down→CaretDown · grip→DotsSixVertical.
4. Delete the hand-drawn icon files, `IconSvg`, `appIconBgClass`, `appIconAccentClass` and any CSS that only served them (`.app-icon` drop-shadow in `headerIconAppIconClass` may stay).
5. Remove the icon background boxes: `appMenuItemIconClass` (drawer + sidebar) and the bottom-nav tab icon box (`bottomNavTabIconClass`) become transparent, no border/radius/background; keep the element for layout and the active color. The raised center dashboard button keeps its circle. Check the wireframe's "در متن" row for the intended look.
6. Replace text glyphs used as icons: `▼` in `src/components/treasury/TreasuryHoldingCard.tsx:73` (`installmentChevronClass`) and any other `▼ ▲ × ✓ ↻ ‹ ›` found by `grep -rnP "[▼▲×✓↻‹›]" src/components --include=*.tsx`, with `AppIcon` (`chevron-down` rotated for expanded, `close`, `check`, `refresh`).
7. Skeletons: `SkeletonActionButton` and icon placeholders still fit (they size by `cardActionBtnClass`); re-run the skeleton check on two pages to be sure nothing shifted.
8. Screenshots of the drawer, bottom nav, a list page and the entry form, light and dark, in the final report.

**Accept.** Every icon in the app comes from Phosphor Regular; no hand-drawn SVG left; no icon boxes in menu/sidebar/bottom tabs; no text glyph used as an icon; `size-limit` passes; a11y suite passes.

## Task B — Dark theme D (warm graphite + gold)

**Decision.** Column **D** of `wireframes/rounds/round-03/dark-mode.html`. Surfaces: warm near-black graphite layered by lightness, hairline white borders; accent in dark mode is **soft gold** (light mode stays teal — deliberate). Income/expense green/red stay (semantic).

**Token block** (replace the whole `[data-theme='dark']` block in `src/styles/theme.css`; keep any variable that exists today and is not listed here, re-tinting it to the new palette):

```css
[data-theme='dark'] {
  color-scheme: dark;
  --color-primary: #c99a3f; --color-primary-dark: #e8c57a; --color-primary-light: #f0d79a;
  --color-bg: #0a0a09; --color-surface: #141412;
  --color-text: #efece6; --color-text-muted: #9b968c;
  --color-border: rgba(255,255,255,0.08);
  --color-accent-soft: #1f1b14; --color-accent-mid: #2a2418; --color-surface-gradient-start: #1a1813;
  --color-focus-ring: rgba(201,154,63,0.35);
  --color-income: #4ade80; --color-success: #4ade80; --color-expense: #f87171; --color-danger: #f87171;
  --color-income-bg: rgba(74,222,128,0.08); --color-success-bg: rgba(74,222,128,0.08);
  --color-expense-bg: rgba(248,113,113,0.08); --color-danger-bg: rgba(248,113,113,0.08);
  --color-income-border: rgba(74,222,128,0.22); --color-success-border: rgba(74,222,128,0.22);
  --color-expense-border: rgba(248,113,113,0.22); --color-danger-border: rgba(248,113,113,0.22);
  --form-input-bg: #1a1917; --form-input-border: rgba(255,255,255,0.10); --form-input-border-hover: rgba(255,255,255,0.2);
  --form-input-focus-shadow: 0 0 0 3px rgba(201,154,63,0.22); --form-label-color: #b3ada2;
  --form-card-bg: linear-gradient(165deg,#1a1813 0%,#131210 100%);
  --color-nav-bg: rgba(16,15,13,0.92);
  --header-bg: linear-gradient(135deg,#131210 0%,#1f1b14 100%);
  --header-shadow: 0 1px 0 rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.5); --header-border: rgba(255,255,255,0.06);
  --hero-bg: radial-gradient(120% 140% at 85% 0%, rgba(201,154,63,0.22) 0%, rgba(201,154,63,0) 55%), linear-gradient(135deg,#1c1812 0%,#262015 100%);
  --hero-shadow: 0 8px 24px rgba(0,0,0,0.5); --hero-ring: rgba(232,197,122,0.18);
  --btn-primary-bg: linear-gradient(135deg,#a67c2b,#8c6420); --btn-primary-bg-hover: linear-gradient(135deg,#c99a3f,#a67c2b);
  --nav-fab-bg: linear-gradient(145deg,#b9892f 0%,#8c6420 100%); --nav-fab-bg-active: linear-gradient(145deg,#8c6420 0%,#6f4f18 100%);
  --nav-fab-ring: rgba(232,197,122,0.3); --nav-fab-shadow: 0 0 22px rgba(201,154,63,0.22), 0 8px 24px rgba(0,0,0,0.55);
  --shadow: 0 1px 0 rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.45); --shadow-lg: 0 12px 40px rgba(0,0,0,0.6); --shadow-card-hover: 0 8px 28px rgba(0,0,0,0.5);
  --color-overlay: rgba(0,0,0,0.7); --color-overlay-light: rgba(0,0,0,0.5);
  --page-glow: radial-gradient(90% 60% at 50% -10%, rgba(201,154,63,0.07) 0%, rgba(201,154,63,0) 60%);
}
```

**Wiring beyond tokens (found while prototyping).**
1. Drawer header `appMenuProfileClass` (`src/components/ui/sidebarMenuStyles.ts:29`) uses `--hero-bg`; make it use `--header-bg` so the menu top is not a second hero.
2. Page ambient glow: `body` (or the app shell) gets `background: var(--page-glow, none), var(--color-bg)`; light theme defines `--page-glow: none`.
3. `Button.tsx` primary variant has a hard-coded teal shadow `rgba(15,118,110,…)` and `text-white`; the inflow/outflow variants have hard-coded hover hexes. Tokenize: `--btn-primary-shadow`, `--btn-primary-fg`. **White on `#a67c2b` is ~3.7:1** — in dark mode the primary button and the raised nav button must use dark text (`--btn-primary-fg: #1a1408`) or a darker gold fill; pick whichever keeps ≥4.5:1 and matches the wireframe. The a11y dark tests (Task E) decide.
4. `--color-warning` (`#fb923c`) and the warning card tints sit next to gold; pick a dark-mode warning that stays distinct (e.g. `#f97316` with a stronger red lean, or keep orange but drop the tinted background to a left border only) — check the dashboard reminders card and `WalletReconciliationAlert` in dark.
5. Anything else still teal in dark mode after the swap (grep for `0f766e`, `14b8a6`, `2dd4bf`, `0d9488`, `teal` in `src/components/ui/*.ts`, `src/index.css`, `src/styles/*.css`) is a hard-coded color to tokenize, except the bank card gradients in `bankCardColorVariants.ts` which are data.
6. `index.html` splash dark colors (`.boot-splash`, `.boot-title`, `.boot-dots` under `[data-theme='dark']`) must match the new bg/accent, and `<meta name="theme-color">` may get a dark variant via `media="(prefers-color-scheme: dark)"` — ask first if that needs anything beyond the HTML (no inline script!).
7. `useChartTheme.ts` reads CSS vars at runtime; verify charts pick the gold primary and still read fine.

**Accept.** Dark screenshots of dashboard, wallet, checks, entry form and drawer match column D; light theme pixel-identical to before (compare screenshots); no teal left in dark mode except bank card art; dark a11y tests pass.

## Task C — Inline help «؟»

**Decision.** A small "؟" button beside hard concepts opens a two-to-three-line popover in plain Persian with a link to the relevant setting and to «درباره». Wireframe: left phone in `inline-help-undo.html`.

**Do.**
1. `src/components/HelpHint.tsx`: `{ title, text, actions?: { label, onClick }[] }`. Trigger: round 20–22 px button, `aria-label="راهنما: <title>"`, `aria-expanded`. Popover anchored below the trigger (not a modal; no backdrop blur), closes on outside tap, Escape, and the Android back button — register with `useRegisterOverlay` (`src/hooks/useRegisterOverlay.ts`). One open at a time.
2. Placement and copy (shorten from the About text; keep one source of truth by reusing sentences from `aboutFeatureGroups*.ts` where possible):
   - Dashboard hero «دارایی قابل اتکا»: «جمع حساب‌ها و دارایی‌هایی که خودت انتخاب کرده‌ای، منهای بدهی‌های فعال — پولی که واقعاً می‌توانی رویش حساب کنی.» Actions: «کدام‌ها حساب شوند؟» → `net-available-settings`; «بیشتر» → about.
   - Stat «مانده محاسبه‌شده»: «موجودی اول دوره + درآمدها − هزینه‌های همین دوره. اگر با موجودی واقعی کیف پول فرق دارد، صفحه کیف پول پیشنهاد تطبیق می‌دهد.» Action → `wallet`.
   - Stat «خالص دوره»: «درآمد منهای هزینه در بازه انتخاب‌شده بالای صفحه.»
   - Wallet «موجودی اول دوره» card and `OpeningBalancePage` header: «موجودی حساب‌ها در شروع هر ماه. ماه اول را خودت تعیین می‌کنی؛ ماه‌های بعد از مانده پایان ماه قبل ساخته می‌شوند.» Action → `opening-balances`.
   - `WalletReconciliationAlert` «تطبیق»: «وقتی جمع حساب‌های کیف پول با مانده محاسبه‌شده فرق دارد، یک رکورد اصلاحی اختلاف را می‌بندد؛ هیچ رکورد قبلی تغییر نمی‌کند.»
3. Navigation from the popover goes through `useNavigationStore.getState().onTabChange(...)` (inside Layout).
4. About: mention the «؟» buttons in the dashboard group.

**Accept.** Five hints present, keyboard and screen-reader operable (axe clean), close on back button; copy matches the table.

## Task D — Undo instead of confirm for deletes

**Decision.** Immediate removal + toast «… حذف شد — بازگردانی» for 5 s; the write to the sheet happens only after the window closes. Confirm modals stay for deletes with dependants: wallet account, dang-split group, vehicle, a whole timesheet, categories. Wireframe: right phone in `inline-help-undo.html`.

**Do.**
1. `src/hooks/useUndoableDelete.ts`: `schedule({ label, optimisticRemove, commit, restore })` → removes from the list at once, shows a custom `react-hot-toast` toast (`toast.custom` or `toast(message, { duration: 5000 })` with an action button rendered through the existing `AppToaster`), on «بازگردانی» calls `restore` and dismisses, on timeout calls `commit` (the existing delete service call) and handles errors with `handleSheetError` + `restore`. Pending commits flush immediately on route change, `visibilitychange` → hidden, and `beforeunload`, so nothing is lost when the user leaves. Only one pending delete per list; a second delete flushes the first.
2. Apply to: records (`RecordsPage`/`useRecordsPage`), checks, dang, receivables, installment plans, treasury transactions, counterparties, personal reminders, timesheet entries, dang-split expenses and people, vehicle active items/history. Keep `ConfirmDeleteModal` for the dependants list above.
3. Toast styling: dark surface, action in accent color, 44 px tall action target, RTL; respects `prefers-reduced-motion`.
4. Unit-test the hook's state machine (schedule → undo; schedule → timeout → commit; schedule → navigate → flush; commit failure → restore + error).
5. About: update the «حذف» wording in each affected group (search `حذف` in `aboutFeatureGroups*.ts`) to describe the undo window.

**Accept.** Deleting a check removes it instantly, «بازگردانی» brings it back without any sheet write, waiting 5 s writes the delete; leaving the page mid-window still deletes; tests pass.

## Task E — Dark-mode accessibility tests

**Do.** In `e2e/a11y.spec.ts` add a `test.describe('signed-in screens accessibility (dark)')` that reuses the signed-in list and the wizard with `settings.theme = 'dark'` set in `addInitScript` (same mocks, `serviceWorkers: 'block'`). Fix every violation it finds in the new theme (expected: gold-button text contrast, muted text on tinted cards, warning card). Report the list of violations found and fixed.

**Accept.** 7 light + 7 dark a11y tests pass locally and in the pre-push hook.

## Task F — About and version

Update About for icons (no user-facing change beyond look — one sentence in the platform group is enough), the dark theme («حالت تاریک جدید: زمینه گرافیتی و رنگ طلایی»), the «؟» hints and the undo window; bump to 1.21.0.

## Suggested order and commits

1. `feature` — icons (A). Big mechanical change first, so everything after is reviewed on the new icons.
2. `feature` — dark theme D (B) + dark a11y tests (E) in the same commit, since E validates B.
3. `feature` — inline help (C).
4. `feature` — undo delete (D).
5. `docs` — About + version (F).

Run the full gates before each commit. Final report must include: light/dark screenshots of five screens, the a11y violations found and fixed, bundle size before/after, and anything skipped with the reason.
