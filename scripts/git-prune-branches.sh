#!/usr/bin/env sh
# Prune merged remote branches and remove stale local branches after pulling main.
#
# Runs automatically from .husky/post-merge (git pull) and post-rewrite (git pull --rebase).
#
# Manual run:
#   sh scripts/git-prune-branches.sh
#   GIT_PRUNE_DRY_RUN=1 sh scripts/git-prune-branches.sh
#
# Optional env:
#   GIT_PRUNE_DRY_RUN=1          — print actions without deleting
#   GIT_PRUNE_PROTECTED="..."    — space-separated branch names to keep

set -u

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$ROOT_DIR" ]; then
  exit 0
fi

cd "$ROOT_DIR" || exit 0

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  exit 0
fi

DRY_RUN="${GIT_PRUNE_DRY_RUN:-0}"
PROTECTED="${GIT_PRUNE_PROTECTED:-main master develop}"

default_branch="$(
  git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null \
    | sed 's@^refs/remotes/origin/@@' \
    || true
)"
if [ -z "$default_branch" ]; then
  default_branch="main"
fi

current_branch="$(git branch --show-current 2>/dev/null || true)"
if [ "$current_branch" != "$default_branch" ]; then
  exit 0
fi

integration_ref="origin/$default_branch"
if ! git rev-parse --verify "$integration_ref" >/dev/null 2>&1; then
  integration_ref="$default_branch"
fi

is_protected() {
  branch="$1"
  for protected in $PROTECTED; do
    if [ "$branch" = "$protected" ]; then
      return 0
    fi
  done
  return 1
}

delete_local_branch() {
  branch="$1"
  reason="$2"
  if is_protected "$branch"; then
    return 0
  fi
  if [ "$branch" = "$current_branch" ]; then
    return 0
  fi
  echo "      - $branch ($reason)"
  if [ "$DRY_RUN" = "1" ]; then
    printf '[dry-run] git branch -D %s\n' "$branch"
    return 0
  fi
  git branch -D "$branch" 2>/dev/null || git branch -d "$branch" 2>/dev/null || true
}

run_cmd() {
  if [ "$DRY_RUN" = "1" ]; then
    printf '[dry-run] %s\n' "$*"
    return 0
  fi
  "$@"
}

echo "🌿 Branch cleanup (integration branch: $default_branch)..."

echo '   ↳ fetching origin with prune...'
run_cmd git fetch origin --prune

echo '   ↳ deleting merged remote branches...'
git branch -r --merged "$integration_ref" 2>/dev/null \
  | sed 's/^[[:space:]]*//' \
  | grep -E '^origin/' \
  | grep -vE '^origin/HEAD ->' \
  | sed 's@^origin/@@' \
  | while IFS= read -r branch; do
      [ -z "$branch" ] && continue
      if is_protected "$branch"; then
        continue
      fi
      echo "      - origin/$branch (merged on remote)"
      run_cmd git push origin --delete "$branch" || true
    done

echo '   ↳ refreshing remote-tracking refs...'
run_cmd git fetch origin --prune

echo '   ↳ removing local branches whose upstream is gone...'
git branch -vv 2>/dev/null \
  | grep ': gone]' \
  | awk '{print $1}' \
  | sed 's/^\*//' \
  | while IFS= read -r branch; do
      [ -z "$branch" ] && continue
      delete_local_branch "$branch" "upstream gone"
    done

echo "   ↳ removing local branches already merged into ${integration_ref}..."
git branch --merged "$integration_ref" 2>/dev/null \
  | sed 's/^[[:space:]]*//' \
  | sed 's/^\* //' \
  | while IFS= read -r branch; do
      [ -z "$branch" ] && continue
      delete_local_branch "$branch" "merged locally"
    done

echo '✅ Branch cleanup finished.'
