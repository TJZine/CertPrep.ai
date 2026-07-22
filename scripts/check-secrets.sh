#!/usr/bin/env bash
set -euo pipefail

MODE="${1:---repo}"
declare -a FILES_TO_CHECK=()

case "$MODE" in
  --staged)
    while IFS= read -r -d '' file; do
      FILES_TO_CHECK+=("$file")
    done < <(
      git diff --cached --name-only -M -C --diff-filter=ACMRT -z
    )
    MODE_LABEL="staged files"
    STAGED_TMP_DIR="$(mktemp -d)"
    STAGED_BLOB_FILE="$STAGED_TMP_DIR/blob"
    trap 'rm -rf -- "$STAGED_TMP_DIR"' EXIT
    ;;
  --repo)
    while IFS= read -r -d '' file; do
      FILES_TO_CHECK+=("$file")
    done < <(git ls-files --cached --others --exclude-standard -z)
    MODE_LABEL="repository files"
    STAGED_BLOB_FILE=""
    ;;
  *)
    echo "Usage: $0 [--repo|--staged]"
    exit 2
    ;;
esac

printf 'Scanning %s for secrets...\n' "$MODE_LABEL"

display_path() {
  printf '%q' "$1"
}

load_staged_blob() {
  local path="$1"
  git cat-file -e ":$path" 2>/dev/null || return 1
  git show ":$path" >"$STAGED_BLOB_FILE"
}

is_text_file() {
  local path="$1"
  if [[ "$MODE" == "--staged" ]]; then
    load_staged_blob "$path" || return 1
    grep -Iq . "$STAGED_BLOB_FILE"
  else
    [[ -f "$path" ]] || return 1
    grep -Iq . "$path"
  fi
}

declare -a ENV_FILES=()
declare -a E2E_AUTH_FILES=()
declare -a PROD_CONFIGS=()

if ((${#FILES_TO_CHECK[@]} > 0)); then
  for file in "${FILES_TO_CHECK[@]}"; do
    if [[ "$file" =~ (^|/)\.env($|\.) ]] &&
      [[ ! "$file" =~ \.env\.example$ ]]; then
      ENV_FILES+=("$file")
    fi

    if [[ "$file" == "tests/e2e/.auth/user.json" ]] ||
      [[ "$file" == "tests/e2e/.auth/user-id.json" ]]; then
      E2E_AUTH_FILES+=("$file")
    fi

    config_name="${file##*/}"
    if [[ "$config_name" == "vercel.json" ]] ||
      [[ "$config_name" == "netlify.toml" ]]; then
      PROD_CONFIGS+=("$file")
    fi
  done
fi

if ((${#ENV_FILES[@]} > 0)); then
  echo "❌ SECURITY ERROR: Environment files must not be committed:"
  for file in "${ENV_FILES[@]}"; do
    printf '  %s\n' "$(display_path "$file")"
  done
  echo "Remove them from Git and add them to .gitignore."
  exit 1
fi

if ((${#E2E_AUTH_FILES[@]} > 0)); then
  echo "❌ SECURITY ERROR: E2E authentication files must not be committed:"
  for file in "${E2E_AUTH_FILES[@]}"; do
    printf '  %s\n' "$(display_path "$file")"
  done
  echo "These generated files contain session tokens."
  exit 1
fi

if ((${#PROD_CONFIGS[@]} > 0)); then
  for config in "${PROD_CONFIGS[@]}"; do
    if [[ "$MODE" == "--staged" ]]; then
      load_staged_blob "$config" || continue
      config_source="$STAGED_BLOB_FILE"
    else
      [[ -f "$config" ]] || continue
      config_source="$config"
    fi

    if grep -Iq . "$config_source" &&
      grep -Eq 'NEXT_PUBLIC_IS_E2E.*true' "$config_source"; then
      printf '❌ SECURITY ERROR: NEXT_PUBLIC_IS_E2E=true found in %s\n' \
        "$(display_path "$config")"
      echo "This flag is only valid in development and test environments."
      exit 1
    fi
  done
fi

PATTERNS="-----BEGIN.*PRIVATE KEY-----|aws_access_key_id[ \t]*=|ghp_[a-zA-Z0-9]{20,}|sk_live_[a-zA-Z0-9]{20,}|sk_test_[a-zA-Z0-9]{20,}|xox[baprs]-[a-zA-Z0-9-]{10,}|PRIVATE_KEY[ \t]*=[ \t]*['\"][^'\"]+|password[ \t]*=[ \t]*['\"][^'\"]+|Authorization:[ \t]*Bearer [a-zA-Z0-9\-\._\~\+\/]+=*|postgres://[^:]+:[^@]+@|SG\.[a-zA-Z0-9_-]{20,}"
ALLOW_MARKER_PATTERN='(//|#) secret-scan: allow -- .+$'
FOUND_SECRETS=0
SCANNED_FILE_COUNT=0

if ((${#FILES_TO_CHECK[@]} > 0)); then
  for file in "${FILES_TO_CHECK[@]}"; do
    if [[ "$file" == "package-lock.json" ]] ||
      [[ "$file" == "scripts/check-secrets.sh" ]]; then
      continue
    fi

    is_text_file "$file" || continue
    SCANNED_FILE_COUNT=$((SCANNED_FILE_COUNT + 1))

    if [[ "$MODE" == "--staged" ]]; then
      scan_source="$STAGED_BLOB_FILE"
    else
      scan_source="$file"
    fi

    line_numbers="$({
      grep -n -E -e "$PATTERNS" "$scan_source" |
        grep -v -E "$ALLOW_MARKER_PATTERN" |
        cut -d: -f1 |
        tr '\n' ',' |
        sed 's/,$//'
    } || true)"

    if [[ -n "$line_numbers" ]]; then
      printf '❌ SECURITY WARNING: Potential secret found in %s\n' \
        "$(display_path "$file")"
      printf '   → Line(s): %s\n' "$line_numbers"
      echo "Review and remove the value before committing."
      FOUND_SECRETS=1
    fi
  done
fi

if [[ "$FOUND_SECRETS" -eq 1 ]]; then
  exit 1
fi

printf '✅ Security check passed for %s (%s text files scanned).\n' \
  "$MODE_LABEL" "$SCANNED_FILE_COUNT"
