# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Personal accounting PWA (`personal-accounting-pwa`). React 18 + TypeScript + Vite + Tailwind 4 + Zustand, with Google Sheets as the data backend. UI copy is Persian (RTL).

Layout:

| Path | Contents |
|------|----------|
| `src/components/` | Shared UI plus one folder per feature (`wallet/`, `checks/`, `receivables/`, `about/`, …) |
| `src/hooks/` | Reusable hooks |
| `src/utils/` | Reusable utils |
| `src/types/` | Shared types |
| `src/services/` | Domain and Google Sheets logic — keep it out of components |
| `e2e/` | Playwright accessibility tests |
| `scripts/`, `tools/` | Quality tooling (line check, Lighthouse, ESLint rules) |
| `workers/` | Cloudflare/API worker code |

## Commands

```bash
npm run dev        # Vite dev server
npm run types      # tsc --noEmit
npm run lint       # eslint --fix over src and e2e
npm run format     # prettier over src and e2e
npm test           # vitest run
npm run build      # tsc -b && vite build
npm run e2e:a11y   # Playwright a11y suite
npm run lighthouse # Lighthouse run
npm run lines      # global 300-line check
npm run quality    # lint + types + build + size-limit + e2e:a11y + lighthouse
```

## Always-on rules

These are ported from `.cursor/rules/` and apply to every task in this repo.

@.claude/rules/sync-agent-rules-and-skills.md
@.claude/rules/reuse-before-create.md
@.claude/rules/pre-commit-quality-gates.md
@.claude/rules/no-config-changes-without-permission.md
@.claude/rules/no-local-git-cli.md
@.claude/rules/keep-about-page-updated.md

## Skills

`.claude/skills/` holds the skills ported from `.cursor/skills/`: `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling`, `ui-ux-pro-max`. Invoke them with the Skill tool when a task matches their description.

`.cursor/rules/` and `.cursor/skills/` remain in place for Cursor. Every rule and skill must exist in both trees — see `sync-agent-rules-and-skills`.
