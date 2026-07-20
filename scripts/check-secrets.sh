#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---repo}"

case "$MODE" in
  --staged)
    FILES_TO_CHECK="$(git diff --cached --name-only --diff-filter=AM || true)"
    MODE_LABEL="staged files"
    ;;
  --repo)
    FILES_TO_CHECK="$(
      git ls-files --cached --others --exclude-standard
    )"
    MODE_LABEL="repository files"
    ;;
  *)
    echo "Usage: $0 [--repo|--staged]"
    exit 2
    ;;
esac

echo "Scanning $MODE_LABEL for secrets..."

ENV_FILES="$(
  printf '%s\n' "$FILES_TO_CHECK" |
    grep -E '(^|/)\.env($|\.)' |
    grep -v '\.env\.example$' || true
)"

if [[ -n "$ENV_FILES" ]]; then
  echo "❌ SECURITY ERROR: Environment files must not be committed:"
  echo "$ENV_FILES"
  echo "Remove them from Git and add them to .gitignore."
  exit 1
fi

E2E_AUTH_FILES="$(
  printf '%s\n' "$FILES_TO_CHECK" |
    grep -E '^tests/e2e/\.auth/(user\.json|user-id\.json)$' || true
)"

if [[ -n "$E2E_AUTH_FILES" ]]; then
  echo "❌ SECURITY ERROR: E2E authentication files must not be committed:"
  echo "$E2E_AUTH_FILES"
  echo "These generated files contain session tokens."
  exit 1
fi

PROD_CONFIGS="$(
  printf '%s\n' "$FILES_TO_CHECK" |
    grep -E '(\.env\.production|vercel\.json|netlify\.toml)$' || true
)"

if [[ -n "$PROD_CONFIGS" ]]; then
  while IFS= read -r config; do
    [[ -f "$config" ]] || continue

    if [[ "$MODE" == "--staged" ]]; then
      has_e2e_flag="$(
        git show ":$config" 2>/dev/null |
          grep -E 'NEXT_PUBLIC_IS_E2E.*true' || true
      )"
    else
      has_e2e_flag="$(
        grep -E 'NEXT_PUBLIC_IS_E2E.*true' "$config" || true
      )"
    fi

    if [[ -n "$has_e2e_flag" ]]; then
      echo "❌ SECURITY ERROR: NEXT_PUBLIC_IS_E2E=true found in $config"
      echo "This flag is only valid in development and test environments."
      exit 1
    fi
  done <<< "$PROD_CONFIGS"
fi

SCANNED_FILES="$(
  printf '%s\n' "$FILES_TO_CHECK" |
    grep -v '^package-lock\.json$' |
    grep -v '^scripts/check-secrets\.sh$' |
    grep -v '^tests/' || true
)"

if [[ -z "$SCANNED_FILES" ]]; then
  echo "✅ Security check passed for $MODE_LABEL."
  exit 0
fi

PATTERNS="-----BEGIN.*PRIVATE KEY-----|aws_access_key_id[ \t]*=|ghp_[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{20,}|sk_test_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|PRIVATE_KEY[ \t]*=[ \t]*['\"][^'\"]+|password[ \t]*=[ \t]*['\"][^'\"]+|Authorization:[ \t]*Bearer [a-zA-Z0-9\-\._\~\+\/]+=*|postgres://[^:]+:[^@]+@|SG\.[a-zA-Z0-9_-]{20,}"
FOUND_SECRETS=0

while IFS= read -r file; do
  [[ -f "$file" ]] || continue
  grep -Iq . "$file" || continue

  if [[ "$MODE" == "--staged" ]]; then
    matches="$(git show ":$file" 2>/dev/null | grep -n -E -e "$PATTERNS" || true)"
  else
    matches="$(grep -n -E -e "$PATTERNS" "$file" || true)"
  fi

  if [[ -n "$matches" ]]; then
    line_numbers="$(
      printf '%s\n' "$matches" |
        cut -d: -f1 |
        tr '\n' ',' |
        sed 's/,$//'
    )"
    echo "❌ SECURITY WARNING: Potential secret found in $file"
    echo "   → Line(s): $line_numbers"
    echo "Review and remove the value before committing."
    FOUND_SECRETS=1
  fi
done <<< "$SCANNED_FILES"

if [[ "$FOUND_SECRETS" -eq 1 ]]; then
  exit 1
fi

echo "✅ Security check passed for $MODE_LABEL."
