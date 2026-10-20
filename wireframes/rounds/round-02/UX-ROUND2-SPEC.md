# UX Round 2 — Implementation Spec

Audience: the Claude agent that will implement this. All items were reviewed and approved by the product owner; do not re-litigate scope. Ask only about technical blockers or where this document explicitly says "ask first".

Round 1 (`IMPLEMENTATION-SPEC.md`, merged in PR #129) covered the new-user funnel. This round fixes what a second audit found in everyday use: raw English errors, the Android back button, a blank first load, entry-form friction, quality gates that only see the login page, and skeletons that do not match their pages.

## Project rules (mandatory, same as round 1)

- 300-line hard limit per staged file. `src/App.tsx` (298) and `src/services/settings.ts` (299) have no headroom: extract, never grow.
- Reuse before create. No config/tooling changes without the owner's explicit permission — `scripts/**`, `.husky/**`, `playwright.config.ts`, `lighthouserc.cjs`, ESLint/Prettier/TS config, `package.json` scripts. Test files under `e2e/` and `src/**/*.test.ts` are fine.
- `npm run types`, `npm run lint`, `npm test`, `npm run build` must pass. Prettier only on touched files (folder-wide Prettier dirties ~380 CRLF files).
- Update `src/components/about/aboutFeatureGroups*.ts` for user-visible behavior changes; bump `version` in `package.json` (and the two root `version` lines in `package-lock.json`).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`; one commit per task group; new branch off `main`; no `gh` CLI; after push give the compare URL `https://github.com/omids0/accounting-with-google-sheet/compare/main...<branch>?expand=1`.
- Verify visually before claiming done. A working recipe for driving the built app with Playwright lives in the agent memory file `reference_playwright_sw_mocks.md`: `vite preview` on a port other than 4173, `chromium.launch({ channel: 'chrome' })`, `browser.newContext({ serviceWorkers: 'block' })`, `e2e/helpers/mockAppState.ts` for auth + settings, and a `**/values:batchGet**` route mock when rows are needed.

## Task A — Persian error messages everywhere

**Problem.** `src/utils/sheetError.ts:19` toasts `err.message` verbatim and `src/services/sheetsApi.ts:92` passes Google's English `error.message` through, e.g. «Request had invalid authentication credentials. Expected OAuth 2 access token…». 65 call sites across 35 files do `err instanceof Error ? err.message : fallback` (`grep -rn "err instanceof Error ? err.message" src`).

**Constraint.** `isAuthError` (`src/services/auth.ts:58`), `isSpreadsheetNotFoundError`, `isSpreadsheetAccessDeniedError` and `isQuotaExceededError` (`sheetsApi.ts`) match the **English** text of `err.message`. Do not translate `message` itself or they break.

**Do.**
1. Add `userMessage?: string` to `SheetsApiError`; keep `message` raw. In `apiRequest` (`sheetsApi.ts:88-104`) set `userMessage` from status: 400 → «درخواست نامعتبر بود؛ اگر تکرار شد، شیت را از تنظیمات دوباره باز کنید», 403 (permission) → «به این شیت دسترسی ندارید. از همان حساب گوگلی که شیت را ساخته وارد شوید», 404 → «شیت پیدا نشد؛ شاید حذف یا جابه‌جا شده», 429 already Persian (keep), 5xx → «گوگل شیت موقتاً پاسخ نمی‌دهد؛ کمی بعد دوباره تلاش کنید». Everything else → generic fallback.
2. New `toUserMessage(err: unknown, fallback: string): string` in `src/utils/sheetError.ts`: `SheetsApiError.userMessage` → network errors (`TypeError: Failed to fetch`, `AbortError`, `navigator.onLine === false`) → «اتصال اینترنت برقرار نیست؛ تغییرها بعد از اتصال ارسال می‌شوند» → any message that already contains Persian letters (`/[؀-ۿ]/`) is passed through → else `fallback`. `handleSheetError` uses it (auth branch unchanged).
3. Replace the 65 raw `err.message` toasts with `toUserMessage(err, '<existing Persian fallback>')`. Keep behavior where the message is intentionally Persian already (e.g. `SpreadsheetSetupPanel`, login).
4. Optional detail: `showError` stays one line; do not append the English text.
5. Unit tests for `toUserMessage` and the status mapping (vitest, mock `fetch`).

**Accept.** No toast in the app can show Latin-only text for a Sheets/Drive/network failure; auth errors still trigger re-login; quota and access-denied flows unchanged.

## Task B — Android hardware back button

**Problem.** `@capacitor/app` is only used for `resume`/`appUrlOpen` (`src/hooks/useBankSmsSync.ts:45`, `src/services/appUpdate.ts`). No `backButton` listener exists, so Capacitor's default applies: webview history back, and at the root the app closes. Overlays (`FormModal`, `ConfirmActionModal`, `ConfirmDeleteModal`, `FilterModal`, `PickerSheet`, `CategorySelectSheet`, `CounterpartyDetailModal`, `VehicleItemDeleteModal`, the drawer in `LayoutMenu`, the open `PageSpeedDial`) are not in history, so back leaves the page with the form half-filled; on the dashboard one press exits with no warning.

**Do.**
1. `src/hooks/useOverlayStack.ts`: a module-level stack of `{ id, close }`. `useRegisterOverlay(open: boolean, close: () => void)` pushes on open, removes on close/unmount. Export `closeTopOverlay(): boolean`.
2. Register in every overlay listed above (one line each; the modal components all already receive `open` + `onClose`). Drawer: `useLayoutNavigation` (`menuOpen`/`setMenuOpen`). Speed dial: `PageSpeedDial.tsx:28`.
3. `src/hooks/useAndroidBackButton.ts`, mounted once in `Layout` (and in `OnboardingWizard` so back in the wizard closes its modal, otherwise is ignored): on native only, `App.addListener('backButton', …)`: (a) `closeTopOverlay()` → done; (b) `location.pathname !== '/'` → `navigate(-1)` (if history is empty, `navigate('/')`); (c) at root: first press toasts «برای خروج دوباره بزنید», second press within 2 s → `App.exitApp()`. Remember: once any listener exists, Capacitor stops its default handling, so (b) and (c) are mandatory.
4. Unit-test the stack and the three-branch decision (pure functions, no Capacitor import in the tested module).

**Accept.** Reproduce in the Android build (CI APK) or at least in a unit test: back closes the top overlay, then navigates, then double-press exits. No change on web.

## Task C — First load: splash and lighter critical path

**Problem.** Lighthouse on `/` (login, simulated 4G): FCP 5.8 s, LCP 6.7 s, Speed Index 5.8 s, TBT 0, CLS 0. The main chunk is 641 kB and the CSS 317 kB (37 kB brotli), both before first paint, and `index.html` has no inline splash — the user sees a white page for seconds. Numbers come from `.lighthouseci/report.json` after `npm run lighthouse`.

**Constraints.** `index.html` has a CSP with `script-src` hashes; **do not add inline scripts** (the existing theme script's hash would also break if edited — see the comment in the file). `style-src 'unsafe-inline'` is allowed, so inline `<style>` is fine. Do not touch Lighthouse thresholds or `scripts/`.

**Do.**
1. Inline splash in `index.html`: a `<div id="app-splash">` inside `#root`'s sibling (not inside `#root`), with the app icon as inline SVG, app name «حسابداری شخصی» and three pulsing dots, styled by an inline `<style>` using the same colors as `loginPageClass`/`AppLoadingSkeleton`; respects `[data-theme="dark"]` (the existing pre-paint theme script sets it). Remove it in `src/main.tsx` after the first React commit (`requestAnimationFrame` after `root.render`), with a short opacity fade.
2. Split the mutually exclusive gates out of the main chunk with `React.lazy` + `Suspense` (fallback = nothing, the splash is still visible): `LoginPage`, `SpreadsheetSetupPanel`, `UnlockScreen`, `ConfigNotice`. `App.tsx` is at 298 lines: move the gate rendering into `src/components/appGates/AppGates.tsx` first (pure refactor, own commit), then lazy-load there.
3. Load the Google Identity script only when a login or silent refresh is actually needed, if `@react-oauth/google` allows it without breaking `useGoogleOAuth().scriptLoadedSuccessfully` and the native path (`isNativePlatform()`); if it does not, skip this sub-step and say so.
4. Measure: run `npm run lighthouse` before and after and put both score tables in the final report. Target: FCP/LCP noticeably lower; no regression in a11y/best-practices.

**Accept.** Something branded is visible within the first paint of `index.html`; login/unlock screens render from their own chunks; before/after Lighthouse numbers reported.

## Task D — Lighter transaction entry

**Problem.** Default forms (`src/services/settings.ts:39-49`, `61-71`) require date, title, category and amount, and `src/components/form/fieldUtils.ts:61` forces the subcategory to be required for all stored forms. A quick «نان ۲۰ هزار» needs five fields. Decided: title and subcategory become optional.

**Do.**
1. `fieldUtils.ts:61`: stop forcing `required: true` on the subcategory; stored forms that have it `true` are normalized to `false` (inverse of the current migration note there).
2. Default forms: `title.required = false`. Existing stored forms keep their own flag except the title, which is normalized to optional in `normalizeSettings` (`settings.ts:84`) — extract the normalizer if the file would exceed 300 lines.
3. On save with an empty title, store `category` + (`subCategory` ? ` · ${subCategory}` : '') as the title so lists and reports stay readable. Put this in the save path used by `DataEntryForm`, not in the UI.
4. Empty subcategory: no default written. The category tree already counts rows without a subcategory under «سایر» (About, tools group) — verify, do not duplicate.
5. About: `aboutFeatureGroupsCore.ts` line ~142 says «انتخاب زیردسته هنگام ثبت درآمد و هزینه الزامی است» — rewrite for the new rule; mention the auto title.
6. Bank-SMS entry already leaves title/category empty (commit 70fb63b) — make sure the auto-title does not fight it: SMS drafts with a chosen category get the same auto title; nothing else changes.

**Accept.** Expense with only amount + category saves; title shows the category; subcategory blank allowed; records list, dashboard and category tree still render those rows; existing rows untouched.

## Task E — Quality gates that see the real app

**Problem.** `e2e/a11y.spec.ts:6` and the Lighthouse run (`scripts/run-lighthouse.mjs:23`, `LIGHTHOUSE_PATH = '/'`) only audit the unauthenticated login page. The 40 screens behind login are never axe-checked.

**Do.**
1. `e2e/a11y.spec.ts`: keep the login test; add authenticated tests using `mockGoogleApis` + `seedMockAppState` for: dashboard `/`, entry `/entry`, wallet `/wallet`, checks `/checks`, settings `/settings`, and the onboarding wizard (`localStorage.removeItem('accounting_onboarding_v1')` in an `addInitScript`). Same axe tags; wait for animations as the login test does; block service workers in the context so route mocks hold.
2. Run them locally; fix any real violations found (expect a few: contrast on muted text, missing names on icon buttons). Fixes go in the components, not in the test.
3. Lighthouse on an authenticated dashboard needs `scripts/run-lighthouse.mjs` to inject the mock state — **ask the owner before editing anything in `scripts/`**. If approved, add a second audited path; if not, leave Lighthouse as is and note it.

**Accept.** a11y suite covers the six screens and passes in `npm run e2e:a11y` and in the pre-push hook.

## Task F — Skeletons that match their pages

**Problem (owner's words).** Skeletons do not look like the content they replace: padding differs and blocks sit in the wrong place, so the page jumps when data arrives.

**Evidence found.**
- `DangCardListSkeleton` (`src/components/skeleton/ListSkeletons.tsx:63-80`) wraps items in `skeletonListClass` (`gap-stack`) while the page uses `listCardsContainerClass` (`gap-3`).
- Loaded pages render elements the skeleton omits, so the list starts lower once loaded: `ActiveFilterChips`, `BankSmsPendingBanner`, the dashboard guide card, stat/total cards, `WalletOpeningBalanceCard`, the records header.
- `DashboardSkeleton` (`PageSkeletons.tsx:56`) has hero, stats, reminders and two breakdown cards but no filter chip row, charts card or transactions card.
- `FormSkeleton` (`PageSkeletons.tsx:148`) uses `skeletonFormClass` instead of `dataEntryPageClass` + `dataEntryFormCardClass`.
- Skeleton-only style constants in `src/components/ui/skeletonStyles.ts` re-declare paddings/radii that the real components get from `cardClassName`, `listCardClassName`, `installmentHeaderClass` etc.

**Rule to implement.** A skeleton is the real page with placeholder content: same page container class, same cards (via `cardClassName`/`listCardClassName`), same order and count of blocks above the list, same gaps. Placeholder bars only replace text, numbers and icons. Skeleton-specific classes may only add `pointer-events-none` and the shimmer.

**Do.**
1. Inventory every skeleton usage (`grep -rn "Skeleton" src/components --include=*.tsx | grep -v "^src/components/skeleton"`) and, for each page, list what the loaded page renders above and around the list that the skeleton lacks.
2. Build a comparison script (scratch, not committed) with the Playwright recipe: for each page capture (a) the skeleton by delaying the `values:batchGet` route by ~4 s and screenshotting at 1 s, and (b) the loaded state. Compare the `getBoundingClientRect()` of the top-level children of the page container; anything off by more than 4 px, or a block present in one state only, is a defect.
3. Fix each skeleton to the rule above; delete `skeletonStyles.ts` constants that become unused.
4. Put the before/after table (page, mismatched blocks, max offset before, max offset after) in the final report, plus two screenshots per fixed page.

**Accept.** For dashboard, records, wallet, checks, dang, installments, treasury, receivables, timesheets, vehicles, settings and the entry form, no top-level block moves more than 4 px between skeleton and loaded state at 390 px width.

## Task G — Small consistency fixes

1. Dashboard refresh button renders a raw `↻` character (`src/components/dashboard/DashboardContent.tsx`, transactions card header). Use `<AppIcon name="refresh" />` with `aria-label="بروزرسانی"`, same as other pages' speed dial.
2. While in `DashboardContent`, check the header row of «تراکنش‌های دوره» uses the shared `cardHeaderRowClass` spacing and not an inline `style`.

## Suggested order and commits

1. `refactor` — AppGates extraction (C.2 prep), overlay stack + back-button hook (B).
2. `bugfix` — Persian error messages (A).
3. `feature` — splash + lazy gates (C), with Lighthouse before/after in the message body.
4. `feature` — lighter entry form (D) + About.
5. `test` — a11y coverage (E) and any component fixes it forces.
6. `bugfix` — skeleton parity (F) + dashboard refresh icon (G).
7. `docs` — About + version bump (one minor: 1.20.0).

Stop after commit 2 and report; continue after the owner's go.

## Final report must include

- Lighthouse scores before/after (Task C).
- Skeleton parity table and screenshots (Task F).
- List of a11y violations found and fixed (Task E).
- Anything skipped, with the reason (e.g. C.3 if the OAuth library blocks it, E.3 if `scripts/` edit was not approved).
