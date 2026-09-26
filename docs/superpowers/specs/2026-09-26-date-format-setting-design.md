# User-Selectable Date Format (Shamsi / Miladi / Hijri) — Design

Date: 2026-09-26
Branch: `feature/ACCT-0/ACCT-0/date-format-setting`

## Goal

Add a setting under Settings → General letting the user pick which calendar the
whole app displays and accepts dates in: شمسی (Jalali, current default and
behavior), میلادی (Gregorian), or قمری (Hijri). The choice must also be honored by
the Google Apps Script push-notification cron, which runs outside the browser.

## Out of scope

Fiscal-period / reporting-month logic (`دوره`, `ماه شروع محاسبه`, dashboard month
filter, `YearFilter`, `dashboardAggregation.ts`) stays Jalali-only. A period is a
grouping key derived from a Jalali month, not a per-record date; Jalali and
Gregorian months don't align 1:1, so switching the period calendar would redefine
report bucket boundaries and change historical totals. That is a separate,
higher-risk feature considered after this one ships.

`DateCalculatorPage.tsx` (the standalone date-conversion tool) is unaffected — it
already lets the user pick a calendar per use and must keep doing so independently
of this global setting.

## Why this is low-risk

Every date is stored in the Google Sheet as a Gregorian ISO string (`YYYY-MM-DD`,
confirmed via `toIsoDate` / `jalaliToIso` in `src/utils/jalaliDate.ts`). Calendar
conversion already happens only at the display/input boundary
(`isoToJalali`, `formatIsoDatePersian`). This setting changes which calendar that
boundary converts to and from — it does not touch storage.

The picker/wheel widgets are already multi-calendar: `CalendarWheelFields.tsx` and
`JalaliDateTimeWheelFields.tsx` take a required `calendar: CalendarSystem` prop and
already render Gregorian/Hijri correctly (proven today by `DateCalculatorPage.tsx`,
which passes a user-chosen `calendar` into `JalaliDatePicker`). `JalaliDatePicker`
and `JalaliDateTimePicker` already accept an optional `calendar` prop that only
defaults to `'shamsi'` — every other call site (17 + 2 files) relies on that
default. So the picker side of this feature is: **change two default values**, not
rewire 19 files.

Display formatting funnels through one function, `formatIsoDatePersian`
(`src/utils/jalaliDate.ts`), imported directly by ~31 files across components,
services, PDF/CSV exports, and `formatDateTimePersian` (`src/utils/datetime.ts`).
Making that one function calendar-aware propagates to all of them with no call-site
changes.

## 1. Shared calendar-setting utility

New file `src/utils/calendarSystem.ts` — no dependency on `jalaliDate.ts` or
`dateConverter.ts`, to avoid a circular import (both of those will depend on it):

```ts
export type CalendarSystem = 'shamsi' | 'miladi' | 'hijri'

export const CALENDAR_SYSTEM_OPTIONS: { value: CalendarSystem; label: string }[] = [
  { value: 'shamsi', label: 'شمسی (جلالی)' },
  { value: 'miladi', label: 'میلادی' },
  { value: 'hijri', label: 'قمری (هجری)' }
]

export const CALENDAR_INTL_IDS: Record<CalendarSystem, string> = {
  shamsi: 'persian',
  miladi: 'gregory',
  hijri: 'islamic'
}

export function getCalendarSystem(): CalendarSystem  // version-cached read, mirrors getCurrency() in formatMoney.ts
```

`getCalendarSystem()` mirrors `getCurrency()` exactly: cache `{ version, value }`
keyed off `getStorageVersion()` from `src/services/storage.ts`, so it stays O(1) on
hot paths and self-invalidates the moment settings are written, with no direct
React binding. This matches the app's existing behavior for `currency`/`theme`:
components already on screen when the setting changes don't live-rerender: the new
value applies on next render/navigation. We keep that same accepted behavior here
rather than introducing a new reactivity mechanism.

`dateConverter.ts` drops its local `CalendarSystem`/`CALENDAR_SYSTEM_OPTIONS`/
`CALENDAR_IDS` and imports them from here instead (generalizing shared code per
the reuse-before-create rule — two modules need it now), then re-exports
`CalendarSystem` (`export type { CalendarSystem } from '../calendarSystem'`) so the
five files that currently do `import type { CalendarSystem } from '../utils/dateConverter'`
(`JalaliDatePicker.tsx`, `JalaliDateTimePicker.tsx`, `JalaliDateTimeWheelFields.tsx`,
`CalendarWheelFields.tsx`, `DateCalculatorPage.tsx`) keep working unchanged.

## 2. Settings type + persistence (localStorage, per device — same as currency/theme)

- `src/types/forms.ts`: add `calendar?: CalendarSystem` to `AppSettings`.
- `src/services/settings.ts`: `getDefaultSettings()` sets `calendar: 'shamsi'`;
  add `updateCalendarSystem(value: CalendarSystem)` mirroring `updateCurrency`.
- `src/components/settings/useSettingsPage.ts`: add `calendar` state +
  `handleCalendarChange`, same shape as `handleCurrencyChange`, plus the sheet
  sync in §4.
- `src/components/settings/SettingsGeneralCard.tsx`: add a `FormSelect` for
  `CALENDAR_SYSTEM_OPTIONS` next to the currency select.

## 3. Central display formatter becomes calendar-aware

`src/utils/jalaliDate.ts`, `formatIsoDatePersian`:

- Keep the exact current `'persian'` formatter for `shamsi` (unchanged output).
- Add one cached `Intl.DateTimeFormat('fa-IR', { calendar: CALENDAR_INTL_IDS[cal], year:'numeric', month:'short', day:'numeric' })` per non-shamsi calendar.
- Change the memo key from `iso => iso` to `iso => \`${iso}|${getCalendarSystem()}\`` so a setting change doesn't serve a stale cached string.

Verified with a throwaway script that `Intl.DateTimeFormat('fa-IR', { calendar, year:'numeric', month:'short', day:'numeric' })` renders correctly for all three calendars (`persian`/`gregory`/`islamic`), Persian digits included, e.g. `۲۶ سپتامبر ۲۰۲۶` and `۱۵ ربیع‌الثانی ۱۴۴۸ ه‍.ق.` — confirmed with the user this Persian-script styling (not English/Arabic-script) is correct and matches the app's existing all-Persian-digits convention.

`formatDateTimePersian` (`src/utils/datetime.ts`) calls `formatIsoDatePersian` internally and needs no change.

## 4. Pickers: two default values

- `JalaliDatePicker.tsx`: `calendar = 'shamsi'` → `calendar = getCalendarSystem()`.
- `JalaliDateTimePicker.tsx`: same change.
- `DateCalculatorPage.tsx` is unaffected — it always passes `calendar` explicitly.

## 5. Syncing the setting to Google Sheets, for the push-notification cron

`RemindersCron.gs` runs headless in Apps Script and cannot read `localStorage`.
Reuse the existing generic key/value sheet from `src/services/periodSettings.ts`
(`تنظیمات دوره`, already used for `تاریخ عضویت` / `ماه شروع محاسبه`) instead of
inventing a new sheet:

- New exported key `CALENDAR_FORMAT_KEY = 'فرمت تاریخ'` in `periodSettings.ts`,
  values `'shamsi' | 'miladi' | 'hijri'`.
- `handleCalendarChange` in `useSettingsPage.ts` writes to `localStorage`
  immediately (so the UI reflects the choice right away, same as currency), then
  best-effort `await setPeriodSetting(spreadsheetId, CALENDAR_FORMAT_KEY, value)`
  in the background — a network failure there degrades to "cron keeps using the
  last-known-good format," not a blocked UI.

`RemindersCron.gs` changes:

- Read `CALENDAR_FORMAT_KEY` from `تنظیمات دوره` once per cron run, defaulting to
  `'shamsi'` for sheets that predate this feature (no row present).
- `formatPersianDate_` becomes calendar-aware:
  - `shamsi`: unchanged (already-verified arithmetic Jalali conversion).
  - `miladi`: format the ISO date as `yyyy/MM/dd` in Persian digits (no
    conversion needed, mirrors `formatMoney_`'s digit conversion).
  - `hijri`: new self-contained arithmetic tabular-Islamic-calendar conversion in
    the script (no `moment`/library access in Apps Script), built the same way the
    Jalali port was: ported as plain arithmetic, then verified against
    `Intl.DateTimeFormat('en-US-u-ca-islamic', ...)` output for a range of dates
    before merging, so cron-rendered Hijri dates match what the app shows.

## 6. About page

Per `keep-about-page-updated`, `src/components/about/aboutFeatureGroupsTools.ts`
currently states (line ~176-177) that "تمام تاریخ‌ها با تقویم جلالی" — this claim
becomes wrong and must be replaced with a description of the new setting
(General settings → date format, default Jalali). Bump `APP_VERSION` in
`AboutPage.tsx`.

## Verification

`npm run types`, `npm run lint`, `npm test`, `npm run build`. Add a unit test for
the new Hijri arithmetic in `.gs` (validated via a throwaway Node script against
`Intl`, same method used for the earlier Jalali push-notification fix) since Apps
Script code isn't covered by `vitest`. Manual pass: switch the setting between all
three calendars and confirm records list, a report, a PDF export, and the date
picker (both plain and date-time) all follow it; switch spreadsheets and confirm
the sheet-synced key follows the active spreadsheet.
