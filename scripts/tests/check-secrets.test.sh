#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCANNER="$(cd "$SCRIPT_DIR/.." && pwd)/check-secrets.sh"
TEST_ROOT="$(mktemp -d)"
trap 'rm -rf -- "$TEST_ROOT"' EXIT

SECRET_KEY="password"
SECRET_LINE="${SECRET_KEY}=\"scanner-fixture-value\""
TEST_COUNT=0

new_repo() {
  local name="$1"
  REPO="$TEST_ROOT/$name"
  mkdir -p "$REPO"
  git -C "$REPO" init -q
  git -C "$REPO" config user.name "Scanner Test"
  git -C "$REPO" config user.email "scanner@example.invalid"
}

commit_all() {
  local message="$1"
  git -C "$REPO" add -A
  git -C "$REPO" commit -qm "$message"
}

run_scanner() {
  set +e
  SCANNER_OUTPUT="$(cd "$REPO" && bash "$SCANNER" --staged 2>&1)"
  SCANNER_STATUS=$?
  set -e
}

expect_status() {
  local expected="$1"
  local label="$2"
  TEST_COUNT=$((TEST_COUNT + 1))
  if [[ "$SCANNER_OUTPUT" == *"scanner-fixture-value"* ]]; then
    printf 'not ok %s - %s (diagnostic exposed fixture content)\n' \
      "$TEST_COUNT" "$label"
    exit 1
  fi
  if [[ "$SCANNER_STATUS" -ne "$expected" ]]; then
    printf 'not ok %s - %s (expected %s, got %s)\n' \
      "$TEST_COUNT" "$label" "$expected" "$SCANNER_STATUS"
    printf '%s\n' "$SCANNER_OUTPUT"
    exit 1
  fi
  printf 'ok %s - %s\n' "$TEST_COUNT" "$label"
}

new_repo "added"
printf '%s\n' "$SECRET_LINE" >"$REPO/added.txt"
git -C "$REPO" add added.txt
run_scanner
expect_status 1 "added staged secret is rejected"

new_repo "modified"
printf 'safe\n' >"$REPO/file.txt"
commit_all "initial"
printf '%s\n' "$SECRET_LINE" >"$REPO/file.txt"
git -C "$REPO" add file.txt
run_scanner
expect_status 1 "modified staged secret is rejected"

new_repo "staged-only"
printf '%s\n' "$SECRET_LINE" >"$REPO/staged-only.txt"
git -C "$REPO" add staged-only.txt
rm "$REPO/staged-only.txt"
run_scanner
expect_status 1 "staged blob is scanned when worktree file is absent"

new_repo "index-wins"
printf '%s\n' "$SECRET_LINE" >"$REPO/file.txt"
git -C "$REPO" add file.txt
printf 'safe worktree\n' >"$REPO/file.txt"
run_scanner
expect_status 1 "staged secret wins over safe worktree content"

new_repo "safe-index"
printf 'safe staged\n' >"$REPO/file.txt"
git -C "$REPO" add file.txt
printf '%s\n' "$SECRET_LINE" >"$REPO/file.txt"
run_scanner
expect_status 0 "safe staged blob ignores unstaged worktree secret"

new_repo "rename"
for number in $(seq 1 100); do
  printf 'safe line %s\n' "$number"
done >"$REPO/old-name.txt"
commit_all "initial"
git -C "$REPO" mv old-name.txt new-name.txt
printf '%s\n' "$SECRET_LINE" >>"$REPO/new-name.txt"
git -C "$REPO" add new-name.txt
run_scanner
expect_status 1 "renamed and modified staged content is scanned"

new_repo "copy"
printf 'safe source\n' >"$REPO/source.txt"
commit_all "initial"
cp "$REPO/source.txt" "$REPO/copied.txt"
printf '%s\n' "$SECRET_LINE" >>"$REPO/copied.txt"
git -C "$REPO" add copied.txt
run_scanner
expect_status 1 "copied staged content is scanned"

new_repo "type-change"
printf 'safe\n' >"$REPO/type-change.txt"
commit_all "initial"
rm "$REPO/type-change.txt"
ln -s "$SECRET_LINE" "$REPO/type-change.txt"
git -C "$REPO" add type-change.txt
run_scanner
expect_status 1 "type-changed staged content is scanned"

new_repo "deleted"
printf '%s\n' "$SECRET_LINE" >"$REPO/deleted.txt"
commit_all "initial"
git -C "$REPO" rm -q deleted.txt
run_scanner
expect_status 0 "deleted content is ignored"

new_repo "special-paths"
special_path=$'name with spaces and\nnewline.txt'
printf '%s\n' "$SECRET_LINE" >"$REPO/$special_path"
git -C "$REPO" add -- "$special_path"
run_scanner
expect_status 1 "spaces and newlines in paths are handled safely"

new_repo "env-policy"
mkdir -p "$REPO/config"
printf 'placeholder=true\n' >"$REPO/config/.env.production"
git -C "$REPO" add -f config/.env.production
rm "$REPO/config/.env.production"
run_scanner
expect_status 1 "nested staged .env.production remains forbidden"

new_repo "env-example"
printf 'PLACEHOLDER=value\n' >"$REPO/.env.example"
git -C "$REPO" add .env.example
run_scanner
expect_status 0 ".env.example remains allowed"

new_repo "deployment-config"
printf '{"env":{"NEXT_PUBLIC_IS_E2E":"true"}}\n' >"$REPO/vercel.json"
git -C "$REPO" add vercel.json
printf '{}\n' >"$REPO/vercel.json"
run_scanner
expect_status 1 "staged production config is checked instead of worktree"

new_repo "safe-deployment-config"
printf '{}\n' >"$REPO/vercel.json"
git -C "$REPO" add vercel.json
run_scanner
expect_status 0 "safe deployment config passes"

new_repo "test-source"
mkdir -p "$REPO/tests/unit"
printf '%s\n' "$SECRET_LINE" >"$REPO/tests/unit/example.test.ts"
git -C "$REPO" add tests/unit/example.test.ts
run_scanner
expect_status 1 "ordinary test source is scanned"

new_repo "marked-fixture"
mkdir -p "$REPO/tests/unit"
printf '%s // secret-scan: allow -- deterministic scanner fixture\n' \
  "$SECRET_LINE" >"$REPO/tests/unit/fixture.test.ts"
git -C "$REPO" add tests/unit/fixture.test.ts
run_scanner
expect_status 0 "reasoned inline fixture marker is narrowly allowed"

printf '1..%s\n' "$TEST_COUNT"
