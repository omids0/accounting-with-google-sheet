#!/bin/sh
# Shared helpers for Husky hooks: detect changed files per hook context.

EMPTY_TREE_SHA="4b825dc642cb6eb9a060e54bf8d69288fbee4904"
EMPTY_SHA="0000000000000000000000000000000000000000"

SOURCE_CODE_PATTERN='^(src/|public/|tools/|e2e/|workers/|package\.json|package-lock\.json|yarn\.lock|tsconfig|vite\.config|playwright\.config|\.eslintrc)'

get_staged_files() {
  git diff --cached --name-only --diff-filter=ACM 2>/dev/null || true
}

get_push_changed_files() {
  collected=""

  if [ ! -t 0 ]; then
    while read -r local_ref local_sha remote_ref remote_sha; do
      [ -z "$local_sha" ] && continue
      [ "$local_sha" = "$EMPTY_SHA" ] && continue

      if [ "$remote_sha" = "$EMPTY_SHA" ]; then
        range_files=$(git diff --name-only "$EMPTY_TREE_SHA" "$local_sha" 2>/dev/null || true)
      else
        range_files=$(git diff --name-only "$remote_sha" "$local_sha" 2>/dev/null || true)
      fi

      if [ -n "$range_files" ]; then
        if [ -n "$collected" ]; then
          collected="$collected
$range_files"
        else
          collected="$range_files"
        fi
      fi
    done
  fi

  if [ -z "$collected" ]; then
    upstream=$(git rev-parse --abbrev-ref '@{upstream}' 2>/dev/null || true)
    if [ -n "$upstream" ]; then
      collected=$(git diff --name-only "$upstream"...HEAD 2>/dev/null || git diff --name-only "$upstream"..HEAD 2>/dev/null || true)
    else
      collected=$(git diff --name-only HEAD~1..HEAD 2>/dev/null || true)
    fi
  fi

  echo "$collected" | sed '/^$/d' | sort -u
}

files_match() {
  files="$1"
  pattern="$2"
  [ -n "$files" ] && echo "$files" | grep -E "$pattern" >/dev/null 2>&1
}

filter_files() {
  files="$1"
  pattern="$2"
  echo "$files" | grep -E "$pattern" 2>/dev/null || true
}

requires_quality_checks() {
  files_match "$1" "$SOURCE_CODE_PATTERN"
}

get_a11y_spec() {
  files="$1"

  if requires_quality_checks "$files"; then
    echo "e2e/a11y.spec.ts"
  fi
}
