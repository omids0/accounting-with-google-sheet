# New-User Onboarding & Feature Discovery — Implementation Spec

Audience: the Claude agent (Sonnet/Opus) that will implement this. All UX decisions below are final — agreed with the product owner over interactive wireframes in this folder (`wireframes/index.html`). Do not re-litigate UX; ask only about technical blockers.

## Context

Personal accounting PWA (React 18 + TS + Vite + Tailwind 4, Zustand, Google Sheets backend, Persian RTL). Problem: a brand-new user lands on an all-zero dashboard with 39 tabs and no guidance. Solution: a full-screen setup wizard, a resume card, a dashboard empty-state CTA, unified page empty states, menu hints, and a feature-discovery card.

Wireframes (open in browser, interactive):

| File | Shows |
|------|-------|
| `onboarding-wizard.html` | Wizard: 4 steps, progress bar, continue/skip/exit, summary screen |
| `dashboard-new-user.html` | Dashboard after wizard: 3 states (exited mid-wizard / tx skipped / normal) |
| `empty-states.html` | Unified EmptyState pattern: purpose line + message + add CTA |
| `feature-discovery.html` | "می‌دانستی؟" discovery card |

## Locked UX decisions

1. **Wizard trigger**: shown when the active spreadsheet has **no wallet accounts AND no records** (fresh sheet or existing-but-empty sheet) and onboarding was not completed/dismissed for that spreadsheet. Shown after sheet setup, before the main app.
2. **Steps** (Android 4, web 3 — SMS step only when `isBankSmsAvailable()`):
   1. Create first wallet account (name, kind, current balance — the balance field *is* the opening balance).
   2. Add remaining accounts (same form; list of created accounts shown).
   3. Record first transaction (embed the real entry form).
   4. Enable bank SMS (runs the real permission flow inline).
3. **Buttons per step**: «ادامه» (primary) — **disabled until at least one item saved in that step**; «رد شدن از این مرحله» — always enabled; «بعداً تکمیل می‌کنم — برو به داشبورد» — always visible, exits to dashboard and persists progress.
4. **Dependency**: skipping step 1 auto-skips step 2.
5. **Progress bar**: segmented; filled = done, hatched = skipped, gray = current. Final summary screen lists each step as «✓ انجام شد» / «— رد شد» with a «ورود به داشبورد» button.
6. **Resume card** (dashboard, top): only when the user exited mid-wizard. One line «ادامه راه‌اندازی» + «x از ۴ مرحله مانده» + button that reopens the wizard at the first unfinished step. Disappears once every step is done or skipped.
7. **Dashboard transactions empty state**: replace the bare `<p>` with `EmptyState` + action «ثبت اولین تراکنش» → opens the entry form. Shows whenever the period has no records (not only first run).
8. **Unified EmptyState**: extend `EmptyState` with an optional `description` prop (one muted line: what the page is for), rendered above the message. Apply everywhere (see task C).
9. **Menu hints**: every menu item gets a one-line hint like the two existing ones; `LayoutSidebarNav` (primary tabs) gains the same hint rendering.
10. **Discovery card «می‌دانستی؟»** (dashboard): one suggestion per dashboard visit from a fixed queue — سرویس خودرو، یادآوری شخصی، چک‌ها، محاسبه دنگ، تایم‌شیت. Buttons: «برو ببین» (navigate), «بعدی» (cycle), «دیگر نشان نده» (dismiss forever). Appears only after onboarding is closed (done or dismissed) AND an activity threshold (≥5 records or ≥3 days since onboarding). Never shown together with the resume card (resume wins). A feature that already has data is removed from the queue automatically; empty queue removes the card permanently. Contextual triggers (e.g. suggest vehicle service when a «خودرو» expense category appears) are **out of scope** — future phase.

## Codebase inventory (verified; reuse these, do not rebuild)

- **Wallet account form**: `src/components/wallet/WalletFormModal.tsx` (props incl. `open`, `onSubmit(values: WalletFormState)`, category lists). Save logic lives in `useWalletMutations.handleSubmit` (`src/components/wallet/useWalletMutations.ts:97-164`): `createWalletAccount` (`src/services/wallet.ts:111`) + `logBalanceSet(..., 'موجودی اولیه')`. Page state comes from `useWalletData()`. Wiring reference: `WalletPage.tsx:213-225`. The modal is standalone-renderable.
- **Entry form**: `src/components/DataEntryPage.tsx` — standalone, no Layout/nav dependency; accepts `initialFormType` and `onSaved`. Renders `DataEntryForm` internally. `onSaved` fires instead of form reset.
- **Opening balance**: there is **no** per-account opening-balance page; `OpeningBalancePage` edits *monthly* balances. Opening balance = the balance field in the wallet form (already logged as «موجودی اولیه»). This is why wizard step 2 is "more accounts", not a balance page.
- **Bank SMS**: `src/services/bankSmsNative.ts` — `isBankSmsAvailable()`, `requestBankSmsPermission()`, `setBankSmsCaptureEnabled()`. The full enable sequence (permission → LocalNotifications → capture → `updateBankSmsPrefs`) is in `BankSmsSettingsCard.enable()` (`src/components/bankSms/BankSmsSettingsCard.tsx:36-59`); extract it into a service/hook so both the card and the wizard step call it.
- **Emptiness check**: do NOT use `hasStoreData` (only checks cached sheets exist). Use `getSheetDataRows(spreadsheetId, sheetName)` (`src/services/spreadsheetStore.ts:128`): wallet sheet is `WALLET_SHEET = 'کیف پول'` (`src/services/wallet.ts:22`); records = iterate `getSettings().forms[].sheetName`. `null` result = not cached yet (treat as unknown, don't flash the wizard).
- **Persistence pattern**: single localStorage key mapping `Record<spreadsheetId, state>` — copy the pattern in `src/services/migrateCompactGrids.ts:15-35`. Use key `accounting_onboarding_v1` (and `accounting_discovery_v1`). **Add both keys to `ACCOUNT_KEYS` in `src/services/localDataWipe.ts:28-38`** so logout wipes them.
- **Gate placement**: `App.tsx` gate order ends with `<AppAuthenticatedRoutes/>` (l.292-297); the wizard gate goes between the lock check (l.290) and that. `BrowserRouter` wraps `App` in `main.tsx`, so router hooks work pre-Layout. Caveat: `useNavigationStore` handlers are registered by Layout (`useLayoutNavigation.ts:166`) and do nothing pre-Layout — the wizard must not rely on them. The dashboard CTA (inside Layout) may use `useNavigationStore.onOpenEntry` like `RecordsPage.tsx:101` does.
- **EmptyState**: `src/components/EmptyState.tsx` (33 lines) — `{ icon, message, action?, className? }`.

## Tasks

### A. Onboarding wizard (new feature folder `src/components/onboarding/`)

1. `src/services/onboarding.ts`: per-spreadsheet state `{ steps: Record<StepId,'done'|'skipped'|null>, closed: boolean }`, get/update helpers, `shouldShowOnboarding(spreadsheetId)` combining state + emptiness check. Unit-test this module (vitest).
2. Wizard UI: progress segments, step shell (title, subtitle, content, actions), summary screen. Steps embed: `WalletFormModal` (steps 1-2, with category state + the create branch of `useWalletMutations` — extract the create logic into a reusable hook if needed to avoid duplicating it), `DataEntryPage` with `onSaved` (step 3), extracted SMS-enable hook (step 4).
3. Gate in `App.tsx`. **App.tsx is at 298/300 lines** — extract the render-gate chain into a component/hook first (e.g. `src/components/appGates/` or a `useAppStartup` hook) as a pure refactor, then add the wizard gate.
4. Mark step state on each save/skip; «ادامه» enablement from "saved at least one item in this step this session OR data already exists for the step".

### B. Dashboard additions

1. Resume card component in `src/components/dashboard/`, rendered from `DashboardContent` top when onboarding state says exited-incomplete; button re-opens wizard (a plain state/flag the App gate reads, or a route — implementer's choice, keep it simple).
2. Replace the bare empty `<p>` at `DashboardContent.tsx:240-243` with `EmptyState` + action «ثبت اولین تراکنش» via `useNavigationStore.onOpenEntry`. Keep the "no match for filter" branch as text or `SearchEmptyState`.

### C. EmptyState unification

1. Add optional `description?: string` prop to `EmptyState` (muted line above message).
2. Migrate hand-rolled empties to `EmptyState`: `OpeningBalancePage.tsx:175-180`, `vehicles/VehicleDetailTabContent.tsx:62-103`, `TimesheetDetailPage.tsx:116-124`, `dangSplit/DangSplitExpensesTab.tsx:27-38`, `dangSplit/DangSplitPeopleTab.tsx:90-100`, `dangSplit/DangSplitSummaryTab.tsx:125-130`, `DashboardPage.tsx:84-90` (not-configured). `RecordsPage.tsx:110-115` filter branch → `SearchEmptyState`.
3. Add `action` where missing: `WalletAccountDetailPage`, `InstallmentsList.tsx:61` (empty month).
4. Write Persian `description` copy for each main page (see `empty-states.html` for tone: «چک‌های پرداختی و دریافتی‌ات را با تاریخ سررسید اینجا مدیریت کن…»). Keep every sentence one line, user-facing Persian matching existing copy style.
5. Report pages and inline/informational empties stay as-is.

### D. Menu hints

1. `LayoutMenu.tsx`: add `hint` to the remaining `MenuLinkItem`s (vehicle-service, counterparties, about) and to group labels where sensible.
2. `LayoutSidebarNav.tsx` (53 lines, room to grow): add a `Partial<Record<Tab, string>>` hint map + the same promo-text rendering used in `LayoutMenu` (`appMenuPromoTextClass` / `appMenuPromoHintClass` from `src/components/ui/sidebarMenuStyles.ts:153,159`). Hints for: کیف پول، طلب‌ها، بدهی، اقساط، چک‌ها، صندوقچه.
3. Hint copy: short (≤6 words), e.g. صندوقچه «پس‌انداز هدف‌دار»، دنگ/بدهی «بدهی‌هایت به دیگران»، طلب‌ها «طلب‌هایت از دیگران».

### E. Discovery card

1. `src/services/featureDiscovery.ts`: queue definition (5 features: tab id + title + one-line pitch), eligibility (`onboarding closed AND (records ≥ 5 OR 3 days since onboarding closed)`), per-feature auto-removal when the feature has data (vehicle sheet rows, checks rows, reminders rows, dang-split rows, timesheets rows — same `getSheetDataRows` approach), dismissed-forever flag, "advance on each dashboard mount" logic. Unit-test eligibility + auto-removal.
2. Card component in `src/components/dashboard/`, rendered from `DashboardContent` (never together with the resume card — resume wins). «برو ببین» navigates via the nav store.

### F. Project rules (mandatory)

- **300-line limit per staged file** — `App.tsx` (298) and `src/services/settings.ts` (299) have no headroom; don't grow them, extract instead. Keep every new file under 300.
- **Reuse-before-create** rule: compose existing components/hooks; new shared code generic.
- **About page**: update `src/components/about/aboutFeatureGroups*.ts` — new behavior (setup wizard, discovery card) must be documented in Persian; bump `version` in `package.json`.
- **No config/tooling changes** without explicit user permission.
- Quality gates before commit: `npm run types`, `npm run lint`; Prettier only on touched files (full-folder Prettier dirties ~380 CRLF files). Commit format: `feature/ACCT-0/ACCT-0/<description>`.
- No `gh` CLI; after push give the compare URL.
- New branch off `main`, e.g. `feature/ACCT-0/ACCT-0/new-user-onboarding`.

## Acceptance

1. Fresh (or empty existing) spreadsheet → wizard appears before the main app; web shows 3 steps, Android build path shows 4.
2. «ادامه» disabled until a save in the step; skip works; skipping step 1 skips step 2; summary screen correct.
3. Exit mid-wizard → dashboard shows resume card with correct remaining count; reopening resumes at first unfinished step; completing/skipping all removes the card.
4. Dashboard with zero records in period shows EmptyState + «ثبت اولین تراکنش» opening the entry form.
5. All listed hand-rolled empties replaced; main pages show purpose line + CTA when empty.
6. Menu + sidebar items show hints.
7. Discovery card: appears only when eligible, cycles, dismisses forever, drops features that have data, never co-shows with resume card.
8. Onboarding/discovery state is per-spreadsheet, survives reload, and is wiped on logout.
9. `npm run types`, `npm run lint`, `npm test`, `npm run build` all pass; no file ≥300 lines; About page + version updated.
