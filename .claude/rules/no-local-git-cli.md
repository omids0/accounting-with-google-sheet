---
name: no-local-git-cli
description: GitHub merge workflow — no gh CLI; give compare link immediately
alwaysApply: true
---

# GitHub Merge Workflow (No gh CLI)

`gh` (GitHub CLI) is **not installed** on this machine and **must not** be installed or searched for.

## When the user asks for commit / push / merge

Do this fast — no detours:

1. **Commit** on the feature branch (if there are changes).
2. **Push** the feature branch to `origin`.
3. **Give the merge link immediately** — do not try `gh`, do not push to `main` or `develop`, do not retry blocked actions.

`main` and `develop` are **protected** on GitHub. Direct pushes to either always fail. Merge only via PR in the browser. Feature branches are cut from `develop` and merged into `develop` (see `branch-from-develop`).

## Merge link template

Build this URL after push (replace `<branch-name>`):

```
https://github.com/omids0/accounting-with-google-sheet/compare/develop...<branch-name>?expand=1
```

Example:

```
https://github.com/omids0/accounting-with-google-sheet/compare/develop...feature/ACCT-0/ACCT-0/my-branch?expand=1
```

Release to production (only when the user asks for it) is a PR from `develop` into `main`:

```
https://github.com/omids0/accounting-with-google-sheet/compare/main...develop?expand=1
```

## Do not

- Run `gh`, `which gh`, or suggest installing GitHub CLI
- Push to `origin/main` or `origin/develop`, or request smart-mode approval for a protected-branch push
- Spend multiple turns diagnosing merge — if branch is pushed, send the link
- Re-explain the same protected-branch limitation every session

## After user merges on GitHub

Remind them once (if relevant): `git checkout develop && git pull origin develop`
