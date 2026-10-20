---
name: branch-from-develop
description: Every new branch is cut from develop and merged into develop; only develop goes to main
alwaysApply: true
---

# Branch From develop

`develop` is the test stage; `main` is production. Every merge into `main` ships to users, so changes reach `main` only through `develop`.

## Required behavior

- Cut every new branch (and worktree) from an up-to-date `develop`, never from `main`.
- Open feature PRs against `develop`. Only the release PR `develop` → `main` goes to production, and only when the user asks for it.
- A hotfix is cut from `develop` too. If `main` ever gets a commit that `develop` lacks (for example a version bump), merge `main` back into `develop` so they do not conflict.
- `main` and `develop` are protected: no direct pushes, PR only.

## What `develop` builds

A push to `develop` publishes the dev site under `/accounting-with-google-sheet/dev/` and builds a dev APK (`com.omids0.accounting.dev`, artifact only, no release). Dev builds say «dev» next to the version and in the app name, through `VITE_APP_ENV=dev` (`src/utils/appEnv.ts`). Never write «dev» into `package.json`: that version merges to `main`.

## Do not

- Run `git checkout -b <name> main` or branch from `origin/main`
- Target a feature PR at `main`
- Put the «dev» label in `package.json`
