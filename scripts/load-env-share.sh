#!/bin/sh
# Load shared env values from .env.share at repository root.

ROOT_DIR="$(git rev-parse --show-toplevel 2>/dev/null)"
if [ -z "$ROOT_DIR" ]; then
  ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
fi

ENV_FILE="$ROOT_DIR/.env.share"
DEFAULT_JIRA_PROJECTS="ACCT"

if [ -f "$ENV_FILE" ]; then
  line=$(grep -E '^VITE_JIRA_PROJECT_VALUE=' "$ENV_FILE" | head -1)
  if [ -n "$line" ]; then
    value=$(echo "$line" | sed -E 's/^VITE_JIRA_PROJECT_VALUE=//; s/^"//; s/"$//')
  else
    value="$DEFAULT_JIRA_PROJECTS"
  fi
else
  value="$DEFAULT_JIRA_PROJECTS"
fi

JIRA_PROJECTS_REGEX=$(echo "$value" | tr '|' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | awk 'NF { if (n++) printf("|"); printf("%s", $0) }')
JIRA_PROJECT_EXAMPLE=$(echo "$value" | tr '|' '\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | awk 'NF { print; exit }')

export VITE_JIRA_PROJECT_VALUE="$value"
export JIRA_PROJECTS_REGEX="$JIRA_PROJECTS_REGEX"
export JIRA_PROJECT_EXAMPLE="$JIRA_PROJECT_EXAMPLE"
