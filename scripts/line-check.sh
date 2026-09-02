#!/bin/bash
set -e

echo "🔍 Checking new file line counts..."

staged_files=$(git diff --cached --name-only --diff-filter=A | grep -E '\.(js|jsx|ts|tsx|css|scss|html)$' || true)

if [ -z "$staged_files" ]; then
  echo "✅ No files to check for line count."
  exit 0
fi

MAX_LINES=300
has_errors=false

for file in $staged_files; do
  if [ ! -f "$file" ]; then
    continue
  fi

  line_count=$(wc -l < "$file" | tr -d ' ')

  if [ "$line_count" -gt "$MAX_LINES" ]; then
    echo "❌ Error: $file has $line_count lines (exceeds maximum of $MAX_LINES)"
    has_errors=true
  fi
done

if [ "$has_errors" = true ]; then
  echo "💡 Please split large files into smaller components or modules."
  exit 1
fi

echo "✅ All files are within the line limit ($MAX_LINES lines)."
