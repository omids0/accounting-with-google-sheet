---
name: keep-about-page-updated
description: Keep the About page and README.md in sync when features change
alwaysApply: true
---

# Keep About Page and README Updated

Two documents describe the app and must stay accurate together:

- The in-app **About** section (`src/components/about/`) documents every feature for end users, in Persian.
- **`README.md`** introduces the whole project to developers and newcomers: what the app does, its features, stack, structure, data model, commands, environment variables, quality gates and deployment. It is in Persian.

Updating one without the other is not done.

## When to update

Update the About content **and** `README.md` whenever you:

- Add, remove, or rename a feature, page, tab, or menu item
- Change what a feature does in a user-visible way
- Add or remove settings, reports, calculators, or import/export support
- Change platform behavior users should know about (PWA, sync, auth, lock, etc.)

Update `README.md` as well (About may not need a change) whenever you:

- Add, remove, or upgrade a main dependency or tool (framework, build, test, native plugin)
- Add, remove, or rename an npm script, a `.env` variable, a worker, or a CI workflow
- Change the repo layout, the data model or sync behavior, the security model, branch flow, or deployment

## What to update

1. **Feature copy** — edit the matching group in:
   - `src/components/about/aboutFeatureGroupsCore.ts`
   - `src/components/about/aboutFeatureGroupsExtended.ts`
   - or the other `aboutFeatureGroups*.ts` file that owns the feature (`ls src/components/about/`)
2. **New section** — add a new `AboutFeatureGroup` with `id`, `title`, `icon`, `summary`, and `features[]`.
3. **Navigation** — if the feature has a new sidebar/menu entry, ensure About mentions where users find it.
4. **Version** — bump `version` in `package.json` (About and the APK release both read it) when shipping a release that changes documented behavior.
5. **README** — edit the matching section of `README.md`:
   - «قابلیت‌ها» for features: one short line per feature, grouped as the section already is. Full detail stays in About.
   - «فناوری‌ها», «ساختار پروژه», «داده و همگام‌سازی», «امنیت و حریم خصوصی» for stack, layout, data and security changes.
   - «راه‌اندازی محلی» (env table), «دستورها», «کیفیت و تست», «استقرار», «سرویس‌های Cloudflare» for tooling, scripts, CI and workers.
   - Check every concrete number or name you touch (report count, size limit, sync interval, row cap, script list) against the code, not against memory.

## Checklist before finishing feature work

- [ ] About text reflects the new or changed behavior
- [ ] `README.md` reflects it too (features, stack, commands, env, deployment as relevant)
- [ ] No stale references to removed features in either document
- [ ] Persian copy is clear and matches UI labels (e.g. tab titles in `layout/types.ts`)
- [ ] README lines, bullets, headings and table first cells start with a Persian word, not Latin or code (a Latin start flips the line LTR)

## Do not

- Skip About or README updates because the change "seems small" — users and newcomers rely on them to discover capabilities.
- Copy About's long feature text into README, or developer detail (env vars, CI, commands) into About. About is user-facing and feature-by-feature; README is the project overview.
- Leave `README.md` describing the old behavior and plan to fix it later.
