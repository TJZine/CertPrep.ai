#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# 1. Check for .env files being committed
STAGED_ENV_FILES=$(git diff --cached --name-only | grep "\.env" | grep -v "\.env\.example" || true)

if [ -n "$STAGED_ENV_FILES" ]; then
  echo "❌ SECURITY ERROR: Attempting to commit .env files:"
  echo "$STAGED_ENV_FILES"
  echo "Please remove them from git (git rm --cached <file>) and add to .gitignore."
  exit 1
fi

# 2. Check for potential hardcoded secrets in staged files
# We exclude package-lock.json and this script itself
STAGED_FILES=$(git diff --cached --name-only | grep -v "package-lock.json" | grep -v "scripts/check-secrets.sh" || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Define patterns to catch
# - Private Keys
# - AWS Keys
# - Generic API Keys (simple heuristics)
# - Database Connection Strings
PATTERNS="-----BEGIN.*PRIVATE KEY-----|aws_access_key_id|ghp_[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|PRIVATE_KEY=|password=|Bearer [a-zA-Z0-9\-\._\~\+\/]+=*|postgres://"

FOUND_SECRETS=0

for FILE in $STAGED_FILES; do
  # Skip deleted files
  if [ ! -f "$FILE" ]; then continue; fi

  # Search for patterns in the staged content using git show
  if git show :"$FILE" | grep -Eq -e "$PATTERNS"; then
    echo "❌ SECURITY WARNING: Potential secret found in $FILE"
    # Show the matching line (masked slightly for safety in logs if needed, but here we just show it)
    git show :"$FILE" | grep -E -e "$PATTERNS" | head -n 1
    FOUND_SECRETS=1
  fi
done

if [ $FOUND_SECRETS -eq 1 ]; then
  echo ""
  echo "If this is a false positive, use 'git commit --no-verify' to bypass."
  exit 1
fi

echo "✅ Security check passed."
exit 0
