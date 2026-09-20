# Category Tree Report + Subcategory UX Pass — Design

Date: 2026-09-20
Branch: `feature/ACCT-0/ACCT-0/category-tree-report`

## Goal

Add an income/expense category tree report under the sidebar Reports section, and
finish the subcategory work started in the previous branch so subcategories are
present, required, and consistently ordered everywhere.

## 1. Category tree report

New tab `report-category-tree`, Persian label «درختواره درآمد/هزینه», listed in the
«خلاصه» group of `LayoutReportsSubmenu` right after «درآمد و هزینه».

### Data layer

`src/services/categoryTreeReport.ts`

```ts
export interface CategoryTreeChild {
  name: string
  total: number
  count: number
}

export interface CategoryTreeNode {
  type: 'income' | 'expense'
  category: string
  total: number
  count: number
  children: CategoryTreeChild[]
}
```

- Reads records of the income and expense forms through the existing
  `fetchRecords` path, filtered by the report date range.
- Groups by `values.category`, then by `values.subCategory`.
- A record with an empty category or subcategory falls under «سایر».
- Nodes and children are sorted by descending total, with «سایر» pinned last so the
  tree matches the ordering rule used by the pickers.

### UI

`src/components/reports/categoryTree/`

| File | Responsibility |
|------|----------------|
| `CategoryTreeReportPage.tsx` | Page shell: date filter bar, type tabs, expand control, tree |
| `CategoryTreeList.tsx` | Renders parent rows and their children |
| `CategoryTreeNodeRow.tsx` | One parent row plus its expanded children |
| `useCategoryTreeReport.ts` | Loading, filtering, expanded-set state, export handlers |

Layout top to bottom:

1. `ReportDateFilterBar` (existing).
2. `TransactionTypeSegment` with «همه» / «درآمد» / «هزینه»; switching the tab
   switches the tree.
3. A single expand/collapse-all control directly under the tabs.
4. The tree itself. **Every node starts collapsed.**

A parent row shows the category name and its total; the total of each subcategory
is shown on its own row once the parent is expanded. Each row also shows its record
count.

Every file stays under the repository's 300-line limit.

### Export

`src/services/categoryTreeExport.ts` exposes `exportCategoryTreeCsv` and
`exportCategoryTreePdf`, built on the existing `rowsToCsv` / `downloadTextFile` and
`downloadTablePdf` helpers. Columns: نوع، دسته، زیردسته، تعداد، مبلغ. A parent row
leaves the زیردسته cell empty. Both exports follow the active tab and date range.
They are reachable from the page's speed dial, matching the other report pages.

## 2. UI/UX fixes

### 2.1 «خودرو» ordering and drag

`withLockedExpenseCategories` currently pushes the locked category to the end of the
list on every write, and `CategorySelectPanel` refuses to drag a locked category.
Change both: append a locked category only when it is missing, keeping the user's
order otherwise, and allow dragging locked categories. Renaming and deleting stay
locked. The same change applies to `withLockedVehicleExpenseTypes` and «بنزین».

### 2.2 Subcategory on payments

Installments, checks, dangs, and receivables gain a `subCategory` field on the item
itself, chosen with the existing `SubCategorySelect` in their create/edit forms and
stored in a new sheet column (following the `migrateSubCategoryColumn` pattern).
`createLinkedExpenseRecord` and `createLinkedIncomeRecord` accept a `subCategory`
parameter and write it onto the generated income/expense record, so a payment lands
in the tree under the right branch without asking the user anything at payment time.

### 2.3 Speed dial on the records page

`RecordsPage` registers a speed dial with: income entry, expense entry, filter,
refresh, CSV export, PDF export. The exports cover the currently filtered list, not
the whole sheet.

### 2.4 Search inputs must not steal focus

`CategorySelect` focuses its search input through a `setTimeout` when the sheet
opens. On mobile a programmatic focus does not raise the keyboard, so the field
looks active but cannot be typed into. Remove the automatic focus; tapping the field
focuses it natively and the keyboard appears.

### 2.5 Balance-adjustment category

`handleReconcileBalance` passes no category, so `resolveCategory` falls back to the
first option in the list and the adjustment lands in an unrelated category. Add a
locked `RECONCILIATION_CATEGORY = 'اصلاح موجودی'`, seeded into both the income and
expense category groups, and pass it explicitly.

### 2.6 Required subcategory and the «سایر» option

`createSubCategoryField()` becomes `required: true` for the income and expense entry
forms. A shared ordering helper guarantees that «سایر» exists in every category and
subcategory list and always sits last: a newly added entry goes directly above it,
and drag-reordering cannot move it off the end. Existing records with an empty
subcategory are left untouched and appear under «سایر» in the tree.

## Out of scope

Making subcategories required outside the income and expense entry forms.

## Verification

`npm run types`, `npm run lint`, `npm test`, `npm run build`, plus a manual pass over
the tree report, the four payment flows, the records speed dial, and the category
pickers. The About page gets the new report and the changed behavior, and
`APP_VERSION` is bumped.
