# Shared Account («حساب مشترک») Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the opt-in «حساب مشترک»: a second spreadsheet shared by two people with roles, a payer/split balance and settlements, plus a default-off tick on personal records that copies them into it.

**Architecture:** A third workspace type `'shared'` next to `'personal'` and `'building'`. Member/role/permission/Drive-share code that exists for buildings is generalized through a per-type registry (buildings unchanged). Personal→shared copies reuse the round-11 bridge machinery (`workspaceBridge`, per-device pending queue, `مرجع` references) in the opposite direction. All shared UI is lazy-loaded.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind 4, Zustand, vitest (`src/**/*.test.ts` only), Google Sheets/Drive REST.

**Spec:** `wireframes/shared-account/SPEC.md` (behavior wins) and `wireframes/shared-account/prototype.html` (look wins). Read both before any task.

## Global Constraints

- 300-line limit per `*.{js,jsx,ts,tsx,css,scss,html}` file after Prettier (`scripts/line-check.sh` on staged files). `buildingMembers.ts` is 289 lines and `aboutFeatureGroupsCore.ts` 282: extract before growing.
- Reuse before create (list in the spec). No config/tooling changes, **no new dependencies**, no `size-limit` change (1200 KB JS / 150 KB CSS) without asking the owner.
- Building behavior and all existing tests must keep passing untouched: `npm test` is green after every task.
- Persian copy only; say «شریک», never «همسر». Feature name «حساب مشترک». Spreadsheet title `حسابداری · مشترک <name>`.
- New sheet columns go at the end of the row. New account-bound localStorage keys go in `ACCOUNT_KEYS` (`src/services/localDataWipe.ts`); read no storage before `devStorageIsolation`.
- Tick on personal forms is **default off, always**: no memory per category/device, no auto-tick for SMS or recurring.
- One shared account per user in v1 (key per spreadsheet id so several can come later; the owner wants several-accounts in a later phase).
- Commit format `<type>/ACCT-0/ACCT-0/<description>`, trailing `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. One commit per task. Branch `feature/ACCT-0/ACCT-0/shared-account` (worktree `.claude/worktrees/family-accounting`). No `gh`, no push to `main`/`develop`.
- Gates before each commit: `npm run types`, `npm run lint`, `npm test`; before the final push also `npm run build` and `npx size-limit`.

## Review Focus

- A user with no shared account sees no new tab, column, request or setting anywhere (personal sheets get no new header until a shared account exists).
- `can()` in a shared workspace denies by role (a viewer can never write); it must not default to «allowed» like it does for non-building sheets.
- Retrying a copy/update/delete after an offline failure never duplicates or loses a copy (idempotent by `مرجع`).
- A personal record with a pending «در انتظار ارسال» copy that is deleted/unticked before the copy landed does not leave an orphan.
- Removing the last owner, changing your own role, or inviting a second شریک is refused.
- A copy never carries notes, attachments, line items, counterparty, wallet account, SMS text or tags.
- Offline, or on a device that never opened the shared file (`drive.file` grant missing): the personal save always succeeds and the tick shows «اتصال این دستگاه».

---

### Task 1: Workspace type `'shared'`

**Files:**
- Modify: `src/types/forms.ts:27` (`WorkspaceKind`), `src/services/workspace.ts`, `src/hooks/useWorkspaceType.ts`, `src/services/settings.ts` (~106 `normalizeSettings`), `src/services/buildingTemplate.ts:147` (`registerBuildingSpreadsheet` stays building-only), `src/routes/workspaceRedirect.ts`, `src/routes/WorkspaceRouteGuard.tsx`
- Create: `src/services/sharedWorkspace.ts`, `src/services/sharedWorkspace.test.ts`

**Interfaces:**
- Produces:
  - `WorkspaceKind = 'personal' | 'building' | 'shared'`
  - `WORKSPACE_SHARED_VALUE = 'حساب مشترک'` and `sharedLabel(name: string): string` → `'مشترک ' + name.trim()` in `src/services/sharedWorkspace.ts`
  - `assertMemberWorkspace(spreadsheetId: string): void` in `workspace.ts` (throws unless type is building or shared) and `isSharedEntry(entry: {id: string; kind?: WorkspaceKind}): boolean`
  - `useIsSharedWorkspace(): boolean`; `hasSharedAccount(): boolean` (any registered spreadsheet with `kind === 'shared'`); `sharedSpreadsheetId(): string | null`
  - `workspaceRedirect(pathname: string, type: WorkspaceType): string | null` (signature widened from the boolean)

- [ ] **Step 1: Write failing tests** in `sharedWorkspace.test.ts`: `getWorkspaceType` returns `'shared'` after `setWorkspaceType(id, 'shared')`; `syncWorkspaceTypeFromSheet` maps marker `حساب مشترک` to `'shared'` and `ساختمان` still to `'building'`; `personalSpreadsheet([{id, name:'حسابداری · مشترک X', kind:'shared'}, {id:'p', name:'حسابداری · ۱۴۰۵'}])` returns `p`; `assertMemberWorkspace` throws for a personal id and passes for building/shared; `workspaceRedirect('/shared', 'personal')` returns `'/'` and `workspaceRedirect('/shared', 'building')` returns the building dashboard.
- [ ] **Step 2: Run** `npx vitest run src/services/sharedWorkspace.test.ts` → FAIL.
- [ ] **Step 3: Implement** the widened type and the three-way logic in `workspace.ts` (marker read, `getWorkspaceType`, `isBuildingEntry` untouched, `personalSpreadsheet` also skips `kind === 'shared'` and names starting `مشترک `, `rememberPersonalSheet` is called whenever the sheet being left is personal). `settings.normalizeSettings` keeps `withStandardFields(forms, type === 'building')` unchanged for shared. Route guard and redirect take the `WorkspaceType`; PERSONAL-only/shared-only tab sets are defined in Task 4 (use empty placeholder arrays now).
- [ ] **Step 4: Run** the new test and `npm test` → PASS (all existing workspace/building tests untouched).
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Add the shared workspace type next to personal and building`.

### Task 2: Member registry and generalized member services

**Files:**
- Create: `src/services/memberRegistry.ts`, `src/services/memberRegistry.test.ts`, `src/services/sharedMembers.test.ts`
- Modify: `src/services/buildingRoles.ts` (`parseMembers`, `members`, `can`, `memberCan`, `roleOf`), `buildingMembers.ts`, `buildingMemberDrive.ts`, `buildingInvites.ts`, `buildingSettings.ts`, `driveShare.ts:101`, `src/components/buildings/buildingOptions.ts` (add shared roles beside `BUILDING_ROLES`)

**Interfaces:**
- Produces in `memberRegistry.ts`:
  - `type SharedRole = 'owner' | 'partner' | 'viewer'`; `type SharedPermission = 'record' | 'editOthers' | 'settle' | 'budget' | 'members' | 'export'`; `type MemberKind = 'building' | 'shared'`
  - `interface MemberRegistry { roles: {value: string; label: string; hint: string}[]; permissions: string[]; permissionLabels: Record<string,string>; rolePermissions: Record<string, Record<string, boolean>>; driveRole: Record<string, DriveShareRole>; writePermissions: string[]; ownerRole: string; defaultInviteRole: string; settingsPermission: string; lastOwnerMessage: string; fileNoun: string; connectPath: string }`
  - `memberKindOf(spreadsheetId?: string): MemberKind | null` (null for personal) and `registryOf(kind: MemberKind): MemberRegistry`
  - Shared defaults exactly as the spec table: owner all true; partner `record, settle, budget, export` true and `editOthers, members` false; viewer all false.
- Changes (signatures keep working for buildings): `can(permission: string, spreadsheetId?: string): boolean` — personal sheet → `true`, building → today's rule, shared → registry rule with `parseRole` unknown→`viewer`; `parseMembers(rows, kind?: MemberKind)`; `inviteMember(spreadsheetId, email, role, name)` picks the registry by type and, for shared, refuses a second `partner` with block `'partner-limit'`; `memberBlock` treats the registry's `ownerRole` as the last-owner guard; `setBuildingSetting`/`deleteBuildingSettings` call `assertMemberWorkspace`; `inviteSteps` text and `driveShare.shareErrorMessage(err, fallback, noun?)` take the file noun («ساختمان» / «حساب مشترک»), and the shared invite steps say «بیشتر › فضاهای من › اتصال به حساب مشترک».

- [ ] **Step 1: Write failing tests**: registry defaults for each shared role (assert every cell of the spec table); `can('record', sharedViewerSheet)` is `false` and for the owner `true`; a personal sheet still returns `true`; `memberBlock` refuses removing/changing the only `owner` with `'last-manager'`-equivalent block and a self change with `'self'`; `inviteMember` on a shared sheet with an existing partner returns `'partner-limit'`; `viewerCanWrite` is true for a viewer given `settle`; `shareErrorMessage(404, …, 'حساب مشترک')` mentions «حساب مشترک».
- [ ] **Step 2: Run** `npx vitest run src/services/memberRegistry.test.ts src/services/sharedMembers.test.ts` → FAIL.
- [ ] **Step 3: Implement** `memberRegistry.ts` and thread `kind` through the listed functions. `buildingMembers.ts` is at 289 lines: move `memberStatus*`/`claimOwnInvite` into `buildingMemberStatus.ts` (re-export from the old path) before adding code.
- [ ] **Step 4: Run** `npm test` → all existing `building*.test.ts` and `driveShare.test.ts` still pass untouched.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Generalize member roles and Drive sharing for the shared account`.

### Task 3: Member UI generalized

**Files:**
- Modify: `src/components/buildings/MemberCard.tsx`, `InviteMembersSheet.tsx`, `useBuildingMembers.ts`, `BuildingMembersPage.tsx`
- Create: `src/components/shared/SharedMembersPage.tsx` (thin wrapper), `src/hooks/useMemberKind.ts`

**Interfaces:**
- Consumes: `registryOf`, `memberKindOf`, `can` (Task 2).
- Produces: `MemberCard`/`InviteMembersSheet`/`useBuildingMembers` take an optional `kind?: MemberKind` (default `'building'`, copy and role lists come from `registryOf(kind)`); `SharedMembersPage` renders the own-role card, member list, «+ دعوت» (needs `members`), «ترک این فضا» for non-owners and the data-safety card slot (filled in Task 11).
- Decision (my call): keep the existing inline-expanding `MemberCard` for shared too (reuse-before-create) instead of the prototype's bottom sheet; the six switches, Drive-access line, «ارسال دوبارهٔ دعوت» and «قطع دسترسی» come from the registry.

- [ ] **Step 1: Write failing tests** (`.ts` only): pure helpers extracted to `src/components/shared/memberCopy.ts` — `memberRoleLabel('shared','partner') === 'شریک'`, `inviteSheetTitle('shared') === 'دعوت عضو'`, `driveAccessLabel('shared','viewer') === 'فقط مشاهده'`; `driveAccessLabel('shared','viewer', {settle: true}) === 'ویرایش'`.
- [ ] **Step 2: Run** `npx vitest run src/components/shared/memberCopy.test.ts` → FAIL.
- [ ] **Step 3: Implement** the helpers, add the `kind` prop plumbing and `SharedMembersPage`. Building pages must render identically (no copy change).
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Reuse the member screens for the shared account`.

### Task 4: Navigation, routes and layout for the shared workspace

**Files:**
- Modify: `src/components/layout/types.ts` (Tab union, `TAB_TITLES`, new `SHARED_TABS`, `SHARED_BOTTOM_NAV_TABS`, extend `PERSONAL_ONLY_TABS` handling), `navMenuGroups.ts`, `LayoutMenu.tsx`, `LayoutMenuRail.tsx`, `Layout.tsx`, `LayoutMenuUserRow.tsx`, `useLayoutNavigation.ts`, `src/routes/paths.ts`, `AppRoutes.tsx`, `lazyPages.ts`, `pageChunks.ts`, `src/components/buildings/useEnterBuilding.ts`, `useReturnToPersonal.ts`
- Create: `src/routes/sharedPaths.ts`, `src/components/shared/SharedHomePage.tsx`, `SharedRecordsPage.tsx`, `SharedSettlePage.tsx` (placeholders that render the page title until Task 8), `src/components/layout/sharedNavigation.test.ts`

**Interfaces:**
- Produces: tabs `'shared-home' | 'shared-records' | 'shared-settle' | 'shared-members'`; `SHARED_TAB_PATHS: Partial<Record<Tab,string>>` = `/shared`, `/shared/records`, `/shared/settle`, `/shared/members`; `SHARED_TABS: Tab[]`; `useEnterWorkspace()` (the shared core of `useEnterBuilding`, which becomes a thin caller) with `enter(spreadsheetId, tab?)`.
- Behavior: inside a shared workspace the drawer shows the four shared rows + a fixed return row «↩ برگشت به حساب شخصی» (reuse `BUILDING_RETURN_LABEL`), a **bottom nav** with the four shared tabs (prototype), no building rows; personal-only tabs redirect to `/shared`; shared tabs redirect to `/` from personal/building; `PermissionGate` hides `shared-members` management for viewers per `can('members')` (viewers still see the read-only list).

- [ ] **Step 1: Write failing tests** `sharedNavigation.test.ts`: `getPathForTab('shared-home') === '/shared'`; `getTabFromPath('/shared/records') === 'shared-records'`; `workspaceRedirect('/wallet', 'shared')` redirects to `/shared`; `workspaceRedirect('/shared/settle', 'personal')` returns `/`; `SHARED_TABS` has no duplicate in `PERSONAL_ONLY_TABS`; every `Tab` has a `TAB_TITLES` entry (existing exhaustiveness).
- [ ] **Step 2: Run** `npx vitest run src/components/layout/sharedNavigation.test.ts` → FAIL.
- [ ] **Step 3: Implement** types, paths, lazy loaders (dynamic `import()` so the shared chunk stays out of the main bundle), menu variant and guard. `useEnterBuilding.enter` behavior for buildings is unchanged.
- [ ] **Step 4: Run** `npm run types && npm test && npm run build` → PASS; run `npx size-limit` and record the JS delta in the commit body.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Add shared workspace navigation, routes and lazy pages`.

### Task 5: «فضاهای من» hub and opt-in on/off

**Files:**
- Modify: `src/components/buildings/BuildingsHomePage.tsx` (+ `useBuildingsHome.ts`), `src/components/layout/types.ts` (`TAB_TITLES['buildings-home'] = 'فضاهای من'`), `navMenuGroups.ts` label
- Create: `src/components/shared/SharedSpaceCard.tsx`, `SharedOffSheet.tsx`, `src/services/sharedAccountSwitch.ts`, `src/services/sharedAccountSwitch.test.ts`

**Interfaces:**
- Decision (my call): the hub is the existing `buildings-home` page retitled «فضاهای من» (one More-menu row stays; no row is added for anyone). It gets a «حساب شخصی» card, the building cards as today, and below them the dashed «حساب مشترک» card (not set up) or the account card with member avatars (set up). Say so in the PR; the owner can overrule.
- Produces: `hideSharedAccount(spreadsheetId): void` / `showSharedAccount(spreadsheetId): void` (per-device flag `accounting_shared_hidden_v1`, added to `ACCOUNT_KEYS`); `revokeAllSharedAccess(spreadsheetId): Promise<void>` (removes every Drive share except the owner's, via `unshareFile`, then hides the account); owner-only «خاموش کردن» with the two choices of the spec.

- [ ] **Step 1: Write failing tests**: hiding removes the shared entry from `visibleSharedAccount()` but keeps the registry entry; `revokeAllSharedAccess` calls `unshareFile` once per non-owner member and never for the owner (mock `driveShare`); a non-owner cannot call it (`can('members')` false → throws).
- [ ] **Step 2: Run** `npx vitest run src/services/sharedAccountSwitch.test.ts` → FAIL.
- [ ] **Step 3: Implement** the service and the cards (`FormModal`/`ConfirmActionModal` for the off sheet, plain-language copy from the spec).
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Add the opt-in shared account entry to the spaces page`.

### Task 6: Create, invite and join

**Files:**
- Create: `src/services/sharedTemplate.ts`, `sharedTemplate.test.ts`, `sharedConnect.ts`, `src/components/shared/SharedSetupWizard.tsx`, `SharedConnectSheet.tsx`
- Modify: `src/services/workspace.ts` (`syncWorkspaceTypeFromSheet` reads both markers), `buildingConnect.ts` (marker param), `src/components/buildings/JourneyStepper.tsx` (take a `steps` prop), `useClaimInvite.ts` (also runs in a shared workspace)

**Interfaces:**
- Produces: `buildSharedTemplateRows(name: string, creatorEmail: string, now?: Date): { period: string[][] }` (rows: `[WORKSPACE_TYPE_ROW, WORKSPACE_SHARED_VALUE, stamp]`, `[ROLE_ROW_PREFIX + email, 'owner', stamp]`); `createSharedSpreadsheet(name: string, partnerEmail: string, partnerRole: 'partner' | 'viewer'): Promise<string>` (order: `createSpreadsheet(formatSpreadsheetTitle(sharedLabel(name)), getDefaultForms(), tabs)`, `markFreshlyCreated`, `markCompactGridsMigrated`, `setWorkspaceType(id,'shared')`, `registerSharedSpreadsheet` with `kind:'shared'`, then `inviteMember` — Drive first, so a refused share leaves no half-invited member and the file is kept but the error is shown); `connectSharedAccount(spreadsheetId: string, title?: string): Promise<boolean>`.
- UI: 3-step wizard exactly as the prototype (what is shared / name + partner e-mail + role / default split text and the «هیچ ثبتی خودکار به حساب مشترک نمی‌رود» line); busy overlay like `BuildingCreateJourney`; on success `useEnterWorkspace().enter(id, 'shared-home')`.

- [ ] **Step 1: Write failing tests**: template rows contain the marker and the owner row; `createSharedSpreadsheet` with a mocked share failure still registers nothing as invited (no `دعوت:` row) and rethrows; `connectSharedAccount` returns `false` for a building file and `true` for a shared one (mock `loadBuildingSummary`/marker read); a second `partner` invite is refused.
- [ ] **Step 2: Run** `npx vitest run src/services/sharedTemplate.test.ts` → FAIL.
- [ ] **Step 3: Implement** services, then the wizard (steps are pure state; reuse `FormModal`, `FormField`, `Select`).
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Add the shared account setup, invitation and connect flow`.

### Task 7: Shared record columns, balance and settlement domain

**Files:**
- Create: `src/components/form/sharedFields.ts` (+ test), `src/services/sharedBalance.ts` (+ test), `src/services/sharedSettlement.ts` (+ test)
- Modify: `src/components/form/fieldUtils.ts:188` (`withStandardFields(forms, building, shared?)`), `src/services/settings.ts`, `src/services/protectedCategories.ts` (system category «تسویه»), `src/services/reportsExcluded*.ts` (wherever transfers/«اصلاح موجودی» are skipped — add «تسویه»)

**Interfaces:**
- Produces:
  - Field ids (distinct from building's `payer`/`split`): `SHARED_PAYER_FIELD_ID = 'sharedPayer'`, `SHARED_SPLIT_FIELD_ID = 'sharedSplit'`, `SHARED_CREATOR_FIELD_ID = 'sharedCreator'`, `SHARED_REF_FIELD_ID = 'sharedRef'`; labels `پرداخت‌کننده`, `تقسیم`, `ثبت‌کننده`, `مرجع`; `withSharedFields(forms: CustomForm[]): CustomForm[]` / `withoutSharedFields`; `hasSharedFields(form): boolean` (building's `hasBuildingExpenseFields` must stay false for them).
  - `type SharedSplit = 'equal' | \`only:${string}\``; `parseSplit(value: string): SharedSplit`.
  - `computeBalance(records: SharedRecordLite[], settlements: SettlementLite[], emails: [string, string]): { net: Record<string, number>; paid: Record<string, number>; share: Record<string, number> }` where `SharedRecordLite = { type: 'income'|'expense'; amount: number; payer: string; split: SharedSplit }`; incomes never move `net`.
  - `settlementRecord(from: string, to: string, amount: number, dateIso: string): Record<string,string|number>` writing category «تسویه» (system), no wallet effect; `suggestSettlement(net): { from: string; to: string; amount: number } | null`.
- A personal sheet gets **no** shared columns; the shared workspace's expense/income forms get them (`normalizeSettings` adds them when `getWorkspaceType(id) === 'shared'`).

- [ ] **Step 1: Write failing tests** with the prototype's numbers: expenses 18,000,000 (A, equal), 1,850,000 (B, equal), 640,000 (A, equal), 420,000 (A, `only:B`), 1,350,000 (B, equal) and one settlement B→A 5,000,000 → `net[A] === 3,140,000`, `net[B] === -3,140,000`; an income of 60,000,000 changes nothing; `only:A` for A's own payment leaves net 0; `suggestSettlement` returns `{from: B, to: A, amount: 3140000}`; a zero net returns `null`; `withSharedFields` is idempotent and `withoutSharedFields(withSharedFields(f))` equals `f`.
- [ ] **Step 2: Run** `npx vitest run src/services/sharedBalance.test.ts src/components/form/sharedFields.test.ts src/services/sharedSettlement.test.ts` → FAIL.
- [ ] **Step 3: Implement** the pure modules, wire `withStandardFields`, register the system category and the report exclusion.
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Add shared record columns, balance and settlement logic`.

### Task 8: Shared pages (home, records, settle, add)

**Files:**
- Modify: `src/components/shared/SharedHomePage.tsx`, `SharedRecordsPage.tsx`, `SharedSettlePage.tsx` (from placeholders), `src/components/records/RecordDetailSheet.tsx` (shared panel next to `BuildingExpenseDetail`)
- Create: `src/components/shared/useSharedRecords.ts`, `SharedBalanceCard.tsx`, `SharedAddSheet.tsx`, `SharedSettleSheet.tsx`, `SharedViewerBanner.tsx`

**Interfaces:**
- Consumes: `computeBalance`, `settlementRecord`, `suggestSettlement`, `can`, `RecordDetailSheet` (`readOnly` prop for viewers), `AmountField`, `FormModal`, `Select`/`PickerSheet`, `JalaliDatePicker`.
- Behavior (spec «Screens» and «What the user sees, per role»): home = balance card («شما به X بدهکارید» / «X به شما بدهکار است» / «حساب شما صاف است»), month total, bar of who paid, three last records; records = filter all/each person, tap → detail with amount edit + delete gated by `record` and (own record or `editOthers`) and a lock note otherwise; settle = current state + history + «ثبت تسویه» (no wallet fields); viewer sees banner «شما ناظر هستید و فقط می‌بینید» and no add button. The add sheet writes through `appendRecord` + `logRecordActivity` with `sharedPayer`, `sharedSplit`, `sharedCreator`.

- [ ] **Step 1: Write failing tests** for the pure view-model `src/components/shared/sharedViewModel.ts`: `balanceHeadline(net, me)` returns the three Persian sentences for me-owes / owed-to-me / settled; `canEditRecord({ me, creator, can })` is false for a viewer, false for another's record without `editOthers`, true for own record; `splitPreview(amount, split, emails)` returns each person's share.
- [ ] **Step 2: Run** `npx vitest run src/components/shared/sharedViewModel.test.ts` → FAIL.
- [ ] **Step 3: Implement** view-model first, then pages and sheets (copy from the prototype, tokens from the app, no custom switches/selects/modals).
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Add the shared account home, records and settlement pages`.

### Task 9: Personal → shared link (tick, copy, update, delete)

**Files:**
- Create: `src/services/sharedLink.ts`, `sharedLink.test.ts`, `sharedLinkRows.ts`, `sharedLinkRows.test.ts`, `sharedLinkPrefs.ts`, `src/components/shared/SharedTick.tsx`, `SharedDeleteChoiceSheet.tsx`, `src/hooks/useSharedLinkDrain.ts`
- Modify: `src/components/DataEntryForm.tsx` (render `SharedTick` after the attachment field, before `EntryFormActions`), `src/components/records/RecordsEditFormModal.tsx`, `src/components/records/recordsMutations.ts` (`submitRecordEdit` ~125-132, `deleteStoredRecord` ~150), `src/components/dataEntry/writeEntryRecord.ts`, `src/hooks/useBridgeDrain.ts` (also drains shared links), `src/services/workspaceBridge.ts` (`tabSpecOf` knows the shared record tabs), `src/services/localDataWipe.ts` (`accounting_shared_link_v1`)

**Interfaces:**
- Produces:
  - `sharedRef(personalSpreadsheetId: string, recordId: string): string` → `share:${personalSpreadsheetId}:${recordId}`
  - `buildCopyRow(input: { form: CustomForm; headers: string[]; recordId: string; values: Record<string,string|number>; split: SharedSplit; payer: string; creator: string; category: string; ref: string }): string[]` — **whitelist only**: title, amount, date, category, type, payer, split, creator, ref; never notes, line items, attachments, counterparty, wallet, SMS text, tags.
  - `interface SharedLinkTask { id: string; kind: 'create' | 'update' | 'delete'; sharedId: string; personalId: string; recordId: string; ref: string; values: Record<string,string|number>; split: SharedSplit; payer: string; attempts: number }`
  - `enqueueSharedLink(task: Omit<SharedLinkTask,'id'|'attempts'>): void` (replaces a queued task of the same `ref`; a `delete` cancels a queued `create` that has not landed), `runSharedLinks(): Promise<void>` (single-flight, skips offline, finds the existing copy by `ref` via a direct read before appending; already-gone delete = done), `pendingSharedLink(recordId: string): boolean`.
  - Personal link marker: personal expense/income forms gain one last field `sharedLink` (label `حساب مشترک`, value = shared spreadsheet id) only when `hasSharedAccount()`; `isLinked(values): boolean`.
- Behavior (spec «Linking»): `SharedTick` is a **controlled, non-persisted** `ToggleSwitch` row «در «<name>» هم ثبت شود», rendered only when `hasSharedAccount() && can('record', sharedId)`; when the shared file is not granted on this device it shows «اتصال این دستگاه به «<name>»» instead (opens `SharedConnectSheet`); expense ticks show a category select fed by the shared category list (exact name match else «سایر»), a split select («نصف‌نصف» / «فقط من» / «فقط <partner>») and the share preview; income ticks show only the one-line note. Saving: tick on a new/unlinked record → personal write first, then `create`; tick on a linked record → `update`; tick turned off on a linked record → `delete` (the form warns «با ذخیره، نسخهٔ حساب مشترک حذف می‌شود»). Deleting a linked personal record opens `SharedDeleteChoiceSheet` («از هر دو حذف شود» / «فقط از حساب شخصی» → the copy's `ref` is cleared). A pending task shows «در انتظار ارسال» in the list; a permanently failing task (no access/file gone) is reported and cancellable.

- [ ] **Step 1: Write failing tests**: `buildCopyRow` output contains none of a record's note/lineItems/attachments/counterparty/walletAccount values (assert by giving them sentinel strings); `sharedRef('p1','r9') === 'share:p1:r9'`; queue semantics — `create` then `delete` before running leaves an empty queue; two `update`s keep the latest; `runSharedLinks` with a mocked `writeToWorkspace` + `batchFetchSheetRangesFromApi` that already contains the `ref` appends nothing on `create` (idempotent) and updates the row on `update`; a `delete` of a missing `ref` completes without error; offline leaves tasks queued.
- [ ] **Step 2: Run** `npx vitest run src/services/sharedLink.test.ts src/services/sharedLinkRows.test.ts` → FAIL.
- [ ] **Step 3: Implement** rows, prefs, runner and the UI hooks. The personal write never waits for the copy; any bridge error is shown with `showError` and does not invite a second save.
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Link personal records to the shared account with a default-off tick`.

### Task 10: Change notices

**Files:**
- Create: `src/services/sharedNotices.ts`, `sharedNotices.test.ts`, `src/components/shared/SharedNoticeBanner.tsx`, `SharedNoticeSheet.tsx`, `src/hooks/useSharedNotices.ts`
- Modify: `src/components/shared/SharedRecordsPage.tsx` (edit/delete of a copy raises a notice), `src/components/records/RecordsEditFormModal.tsx` (warning when a notice is pending), `src/components/buildings/BuildingsHomePage.tsx` and the personal records list (banner), `sharedLink.ts` (supersede)

**Interfaces:**
- Produces: rows in the shared sheet's «تنظیمات دوره»: key `اعلان:<ownerEmail>:<noticeId>`, value JSON `SharedNotice = { recordRef: string; field: 'amount'|'title'|'category'|'split'|'delete'; old: string; new: string; by: string; time: string; kind: 'edit'|'delete' }`. API: `raiseNotice(sharedId: string, copy: { ref: string; creator: string }, editor: string, change: Omit<SharedNotice,'by'|'time'|'recordRef'>): Promise<boolean>` (writes only when `creator !== editor` and the ref starts with `share:`), `readNotices(sharedId: string, email: string): SharedNotice[]` (from the local mirror), `applyNotice(notice): Promise<void>` (updates the personal record's value for that field, only when a personal category of that name exists for `category`), `dismissNotice(sharedId, noticeId): Promise<void>`.
- Reading: on app start and when the personal records list or shared home opens, at most once per `SHARED_NOTICE_REFRESH_MS = 5 * 60 * 1000`, reusing the existing sheet fetch helpers; not when the shared file is not granted on this device.
- Behavior: notice sheet «اعمال در ثبت شخصی من» / «نادیده بگیر»; both delete the notice row and leave the shared copy as the partner left it; editing the personal record while a notice is pending shows the spec warning, saves, and removes that notice.

- [ ] **Step 1: Write failing tests**: `raiseNotice` is a no-op for the creator editing their own copy and for a copy without `share:` ref; it writes one row per edit with the exact key format; `applyNotice` for `amount` changes only the amount; for `category` with no matching personal category it changes nothing and reports `'skipped'`; `readNotices` returns only the given e-mail's notices; superseding removes the pending notice for that `recordRef`.
- [ ] **Step 2: Run** `npx vitest run src/services/sharedNotices.test.ts` → FAIL.
- [ ] **Step 3: Implement** service, hook with throttle, banner and sheet.
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Notify a record's owner when a partner changes its shared copy`.

### Task 11: Members tab, data safety, leave

**Files:**
- Create: `src/components/shared/SharedSafetyCard.tsx`, `src/services/sharedLeave.ts`, `sharedLeave.test.ts`
- Modify: `src/components/shared/SharedMembersPage.tsx`, `src/services/driveBackups.ts`/`driveBackupRun.ts` only if a backup of the shared file is possible under `drive.file` (otherwise a manual button)

**Interfaces:**
- Produces: `leaveSharedAccount(spreadsheetId: string): Promise<'removed' | 'fallback'>` — tries `unshareFile(spreadsheetId, ownEmail)`; if Drive refuses (403/404) it removes the member's own rows, hides the account on this device and returns `'fallback'` (the UI then tells the user to remove access in Drive); `sharedBalanceWarning(net, me): string | null` (shown before leave/revoke/off, never blocks).
- Safety card: text from the spec; «نسخهٔ پشتیبان ماهانه در درایو شریک» switch if the existing backup service can run for a file opened through the Picker, otherwise a manual «ذخیرهٔ نسخه در درایو من» button — state which case applies in the PR.

- [ ] **Step 1: Write failing tests**: `leaveSharedAccount` returns `'removed'` when `unshareFile` resolves and `'fallback'` (rows removed + hidden) when it throws a 403 `SheetsApiError`; the owner cannot leave (`'forbidden'` thrown); `sharedBalanceWarning` returns the «X ... بدهکار است» sentence for a non-zero net and `null` for zero.
- [ ] **Step 2: Run** `npx vitest run src/services/sharedLeave.test.ts` → FAIL.
- [ ] **Step 3: Implement** and wire the leave/off/revoke flows to show the balance warning first.
- [ ] **Step 4: Run** `npm run types && npm test` → PASS.
- [ ] **Step 5: Commit** `feature/ACCT-0/ACCT-0/Add shared account leave, data safety and balance warnings`.

### Task 12: About, changelog, version, evidence

**Files:**
- Modify: `src/components/about/aboutFeatureGroupsExtended.ts` or a new `aboutFeatureGroupsShared.ts` assembled in `aboutFeatures.ts` (group «حساب مشترک», user-facing Persian; the existing `ABOUT_SHARED_GROUP` id `shared` is a different feature, use id `shared-account`), `src/components/about/aboutChangelog.ts`, `aboutChangelog.test.ts:22-26`, `package.json`, `package-lock.json`, `wireframes/shared-account/SPEC.md` (note the inline member card decision)
- Create: `docs/superpowers/qa/2026-10-25-shared-account-evidence.md`

- [ ] **Step 1: Write failing test**: update the hard-coded Jalali date string in `aboutChangelog.test.ts` for the new top entry (version = `package.json` minor + 1 → `2.11.0`, date = today's ISO date).
- [ ] **Step 2: Run** `npx vitest run src/components/about/aboutChangelog.test.ts` → FAIL.
- [ ] **Step 3: Implement** About group, changelog entry (≤ 3 items, «عنوان — توضیح»), version bump in `package.json` and both `package-lock.json` version fields.
- [ ] **Step 4: Run the full gate:** `npm run types && npm run lint && npm test && npm run build && npx size-limit && npm run lines` → all pass.
- [ ] **Step 5: QA evidence** (rule `qa`): `qa-visual-verifier` runs `qa-shoot.mjs` on the built app with mocks for the flows setup, home, records, add, settle, members per role, tick on/off, delete choice, notice sheet, with a `motion` step for every sheet/modal; `qa-ux-reviewer` reviews screenshots and diff. Real two-account behavior (a real invitation, a real Drive share, a partner on another device) is reported **NOT RUN** for the owner to test. Write the report to the evidence file.
- [ ] **Step 6: Commit** `feature/ACCT-0/ACCT-0/Document the shared account and bump the version to 2.11.0`, then push the branch and give the compare link `https://github.com/omids0/accounting-with-google-sheet/compare/develop...feature/ACCT-0/ACCT-0/shared-account?expand=1`.
