#!/usr/bin/env bash
set -euo pipefail

echo "CertPrep.ai verification convenience wrapper"
echo "==========================================="
echo "Authoritative verification lives in package scripts and CI:"
echo "  - npm run verify"
echo "  - npm run security-check"
echo "  - .github/workflows/ci.yml (includes build)"
echo ""

INCLUDE_BUILD=0
if [[ "${1:-}" == "--include-build" ]]; then
  INCLUDE_BUILD=1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required."
  exit 1
fi

NODE_VERSION="$(node -v)"
NODE_MAJOR="${NODE_VERSION#v}"
NODE_MAJOR="${NODE_MAJOR%%.*}"
if [[ "$NODE_MAJOR" -lt 24 ]]; then
  echo "Error: Node.js $NODE_VERSION detected; CertPrep.ai requires >=24.0.0."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required."
  exit 1
fi

if [[ ! -d "node_modules" ]]; then
  echo "Error: node_modules is missing. Run 'npm install' first."
  exit 1
fi

echo "Running npm run verify..."
npm run verify

echo "Running npm run security-check..."
npm run security-check

if [[ "$INCLUDE_BUILD" -eq 1 ]]; then
  echo "Running npm run build (requested via --include-build)..."
  npm run build
else
  echo "Skipping npm run build by default."
  echo "Use --include-build to run a local build in permissive environments."
fi

echo ""
echo "Wrapper completed."
