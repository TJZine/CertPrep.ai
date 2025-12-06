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
# We exclude package-lock.json, this script itself, and the tests directory
STAGED_FILES=$(git diff --cached --name-only | grep -v "package-lock.json" | grep -v "scripts/check-secrets.sh" | grep -v "^tests/" || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Define patterns to catch
# - Private Keys
# - AWS Keys
# - Generic API Keys (simple heuristics)
# - Database Connection Strings
# More specific patterns with context to reduce false positives
PATTERNS="-----BEGIN.*PRIVATE KEY-----|aws_access_key_id\s*=|ghp_[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{20,}|sk_test_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|PRIVATE_KEY\s*=\s*['\"][^'\"]+|password\s*=\s*['\"][^'\"]+|Authorization:\s*Bearer [a-zA-Z0-9\-\._\~\+\/]+=*|postgres://[^:]+:[^@]+@|SG\.[a-zA-Z0-9_-]{20,}"

FOUND_SECRETS=0

for FILE in $STAGED_FILES; do
  # Skip deleted files
  if [ ! -f "$FILE" ]; then continue; fi

  # Search for patterns in the staged content using git show
  if git show :"$FILE" | grep -Eq -e "$PATTERNS"; then
    echo "❌ SECURITY WARNING: Potential secret found in $FILE"
    
    # Extract the matching line
    MATCH_LINE=$(git show :"$FILE" | grep -E -e "$PATTERNS" | head -n 1)
    
    # Masking logic: keep first 4 and last 4 chars of the match, obscure the rest
    # We'll just mask the whole line's sensitive part broadly for safety
    # A simple heuristic: replace the inner part of long strings
    
    MASKED_OUTPUT=$(echo "$MATCH_LINE" | sed -E 's/([a-zA-Z0-9._-]{4})[a-zA-Z0-9._-]{5,}([a-zA-Z0-9._-]{4})/\1******\2/g')
    
    echo "Context: $MASKED_OUTPUT"
    echo "Please remove this secret before committing."
    
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
