# Dang Split Calculator (محاسبه دنگ) — Design

Date: 2026-09-27
Branch: `feature/ACCT-0/ACCT-0/dang-split-calculator`

## Goal

Add a shared-expense splitter under Sidebar → محاسبات → محاسبه دنگ. The user creates a
دنگ group (a trip, a dinner, a shared household month), registers the people in it,
registers the expense items, assigns people to each item, and reads a per-person
summary showing each person's share, how much of it they have paid, the remaining
balance, and whether they are fully settled.

## Naming — avoid the existing module

`src/services/dang.ts` and `src/components/dang/` already exist and are the **debts**
module (`DANG_SHEET = 'دنگ'`, user-facing label «بدهی», tab key `dang`). That module is
not touched. The new feature uses:

| Concern | Value |
|---------|-------|
| Tab key | `dang-split` |
| Title | `محاسبه دنگ` |
| Routes | `/dang-split`, `/dang-split/:groupId` |
| Components | `src/components/dangSplit/` |
| Services | `src/services/dangSplit*.ts` |
| Sheets | `گروه_دنگ`, `دسته_افراد_دنگ`, `افراد_دنگ`, `اقلام_دنگ`, `تخصیص_دنگ` |

Sheet names follow the existing suffix convention (`سرویس_خودرو`, `موعد_خودرو`).

## Data model — five normalized sheets

One row per record, so the existing row-level helpers (`appendSheetRow`,
`updateSheetRow`, `deleteSheetRow`, `fetchSheetRows`), the sync outbox, and per-sheet
CSV import/export all keep working unchanged.

### `گروه_دنگ`

`شناسه`, `زمان ثبت`, `عنوان`, `توضیحات`

### `دسته_افراد_دنگ` (people categories: family, team, …)

`شناسه`, `شناسه گروه`, `عنوان`, `زمان ثبت`

### `افراد_دنگ`

`شناسه`, `شناسه گروه`, `نام`, `شناسه دسته`, `ضریب پیش‌فرض`, `مبلغ پرداخت‌شده`,
`زمان تسویه`, `یادداشت`

- `شناسه دسته` is empty when the person belongs to no category. One category per
  person (decided with the user).
- `ضریب پیش‌فرض` (default weight) is asked when the person is created, default `1`.
  A person who represents two people gets `2`.
- `مبلغ پرداخت‌شده` is how much of their share they have already handed over.
  Partial payments are supported; the status (`نپرداخته` / `پرداخت جزئی` /
  `تسویه کامل`) is **derived**, never stored.
- `زمان تسویه` is stamped when the remaining balance first reaches zero, and cleared
  when it stops being zero.

### `اقلام_دنگ` (expense items)

`شناسه`, `شناسه گروه`, `عنوان`, `تاریخ`, `مبلغ`, `توضیحات`, `زمان ثبت`

### `تخصیص_دنگ` (allocations — which person is on the hook for which item)

`شناسه`, `شناسه گروه`, `شناسه قلم`, `شناسه فرد`, `وزن`

One row per (item, person). `وزن` is the resolved numeric weight for that person on
that item.

## Split math

Single formula, in a pure module `src/services/dangSplitMath.ts` with vitest coverage:

```
share(person, item) = item.amount × allocation.weight ÷ Σ(weights of that item)
```

The two UI modes both resolve to a stored `وزن`, so nothing downstream branches:

- **مساوی** — every allocated person's weight is their own `ضریب پیش‌فرض`. Three
  people with default weight 1 split in thirds; a person with weight 2 pays double.
- **سهم دستی** — the user types a percentage for one or more people; the remaining
  percentage is distributed over the other allocated people in proportion to their
  default weights. The resulting percentages are stored as weights, so they always
  sum to 100.

**Rounding:** shares are floored to whole currency units, then the leftover remainder
is added to the person with the largest share (ties broken by allocation order), so
`Σ shares === item.amount` exactly. This is unit-tested with amounts that do not
divide evenly (for example `10_000 ÷ 3`).

## Derived per-person summary

```
personShare   = Σ over items of share(person, item)
personPaid    = افراد_دنگ.مبلغ پرداخت‌شده
personBalance = personShare − personPaid
status        = personShare === 0 ? 'بدون سهم'
              : personPaid <= 0 ? 'نپرداخته'
              : personBalance > 0 ? 'پرداخت جزئی'
              : 'تسویه کامل'
```

Group totals: `Σ item.amount`, `Σ personPaid`, `Σ personBalance`, and a settled-count
for the group card's progress bar.

## UI

### List page — `/dang-split`

`DangSplitPage` mirrors `VehicleListPage`/`CounterpartiesPage`: card list, each card
showing title, description, people count, item count, total, paid, remaining, plus a
settlement `ProgressBar`. Card actions: `CardEditButton`, `CardDeleteButton` (through
`ConfirmDeleteModal`); tapping the card body navigates to the detail route.

Speed dial (via `createPageSpeedDialActions`): افزودن، فیلتر، بروزرسانی، اکسپورت،
خروجی PDF، ایمپورت.

### Detail page — `/dang-split/:groupId`

`DangSplitDetailPage`, resolved by a `DangSplitDetailRoute` that loads the group by id
exactly like `VehicleDetailRoute`. Three tabs via `TransactionTypeSegment`:

1. **جمع‌بندی** — one card per person: share, paid, remaining, status. Tapping a card
   expands the per-item breakdown (item title, item total, this person's weight/share).
   Paid amount is edited inline with `CardInlineAmountEdit`, the same control the debts
   module uses.
2. **افراد** — person cards grouped under their category heading, category CRUD, person
   CRUD (name, category, default weight, note).
3. **اقلام** — expense-item cards (title, date, amount, allocated-people chips) with a
   `تخصیص افراد` button opening the allocation modal.

**Tab-dependent speed dial** (pattern from `useVehicleDetailSpeedDial`): on the
جمع‌بندی tab the order is افزودن اقلام، افزودن افراد، then بروزرسانی / خروجی‌ها, where
the export is the summary itself. On the افراد tab the primary add is a person; on the
اقلام tab it is an expense item.

### Allocation modal

Opened from an expense card. Contents:

- `همه` — allocate every person in the group.
- Category chips — tapping one asks for confirmation naming its members
  («علی و رضا اضافه شوند؟») through `ConfirmActionModal`, then adds them.
- Per-person checkboxes for individual selection.
- Mode switch: `مساوی` or `سهم دستی`; in سهم دستی each selected person gets a
  percentage input, and the live preview shows the resolved shares (and warns when the
  manual percentages exceed 100).

## Out of scope (deliberately, phase 2)

- Settlement suggestions ("رضا ۵۰ به علی بدهد" with the fewest transfers).
- Recording who *paid* an expense item up front, and the netting that follows from it.
  The user's summary requirement is share/paid/remaining per person, like the
  receivables module, which the `مبلغ پرداخت‌شده` column already covers.
- Linking a person's balance into the طلب‌ها / بدهی modules or into records. Phase 1
  is self-contained: the feature writes only to its own five sheets.
- Copying a group as a template for the next trip.
- Multiple categories per person (many-to-many).

## Registration checklist

- `MODULE_SHEET_SPECS` in `src/services/moduleSheetSpecs.ts` — all five sheets.
- `STATIC_SHEETS` in `src/services/sheetSyncSheetNames.ts` — all five sheets.
- `Tab` union, `CALCULATION_TABS`, `SPEED_DIAL_TABS`, `TAB_TITLES` in
  `src/components/layout/types.ts`.
- `EXACT_TAB_PATHS` + detail-path handling in `src/routes/paths.ts`.
- `pageChunks.ts`, `lazyPages.ts`, `AppRoutes.tsx`.
- `LayoutMenu.tsx` — the محاسبات submenu gets a محاسبه دنگ entry.
- `useLayoutNavigation.ts` — header back and submenu expansion for both tabs.
- About page: `aboutFeatureGroupsExtended.ts` + `APP_VERSION` bump.

## Testing

- `dangSplitMath.test.ts` — equal split, weighted split, manual percentages,
  remainder placement, empty allocation, zero-weight guard.
- `npm run types`, `npm run lint`, `npm test` before each commit; `npm run build`
  before each push. Every file stays under the 300-line limit.
