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
3. **Give the merge link immediately** — do not try `gh`, do not push to `main`, do not retry blocked actions.

`main` is **protected** on GitHub. Direct `git push origin main` will always fail. Merge only via PR in the browser.

## Merge link template

Build this URL after push (replace `<branch-name>`):

```
https://github.com/omids0/accounting-with-google-sheet/compare/main...<branch-name>?expand=1
```

Example:

```
https://github.com/omids0/accounting-with-google-sheet/compare/main...feature/ACCT-0/ACCT-0/my-branch?expand=1
```

## Do not

- Run `gh`, `which gh`, or suggest installing GitHub CLI
- Push to `origin/main` or request smart-mode approval for protected-branch push
- Spend multiple turns diagnosing merge — if branch is pushed, send the link
- Re-explain the same protected-branch limitation every session

## After user merges on GitHub

Remind them once (if relevant): `git checkout main && git pull origin main`
