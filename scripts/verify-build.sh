#!/bin/bash

echo "CertPrep.ai Build Verification Script"
echo "===================================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        FAILED=1
    fi
}

echo "1. Checking Node.js version..."
NODE_VERSION=$(node -v)
if [[ $NODE_VERSION == v18* ]] || [[ $NODE_VERSION == v20* ]] || [[ $NODE_VERSION == v21* ]]; then
    print_status 0 "Node.js version: $NODE_VERSION"
else
    print_status 1 "Node.js version $NODE_VERSION may not be compatible (recommend 18+)"
fi
echo ""

echo "2. Checking dependencies..."
if [ -d "node_modules" ]; then
    print_status 0 "node_modules exists"
else
    print_status 1 "node_modules missing - run 'npm install'"
fi
echo ""

echo "3. Running TypeScript check..."
npx tsc --noEmit > /dev/null 2>&1
print_status $? "TypeScript compilation"
echo ""

echo "4. Running ESLint..."
npx eslint src/ --ext .ts,.tsx --quiet > /dev/null 2>&1
print_status $? "ESLint check"
echo ""

echo "5. Building for production..."
npm run build > /dev/null 2>&1
print_status $? "Production build"
echo ""

echo "6. Checking critical files..."
FILES=(
    "src/app/page.tsx"
    "src/app/layout.tsx"
    "src/app/quiz/[id]/zen/page.tsx"
    "src/app/quiz/[id]/proctor/page.tsx"
    "src/app/results/[id]/page.tsx"
    "src/app/analytics/page.tsx"
    "src/db/index.ts"
    "src/stores/quizSessionStore.ts"
    "public/manifest.json"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        print_status 0 "$file"
    else
        print_status 1 "$file (MISSING)"
    fi
done
echo ""

echo "7. Checking build output..."
if [ -d ".next" ] || [ -d "out" ]; then
    print_status 0 "Build output exists"
else
    print_status 1 "Build output missing"
fi
echo ""

echo "8. Checking bundle sizes..."
if [ -d ".next" ]; then
    TOTAL_SIZE=$(du -sh .next | cut -f1)
    echo "   Total .next size: $TOTAL_SIZE"
    LARGE_CHUNKS=$(find .next -name \"*.js\" -size +500k 2>/dev/null | wc -l)
    if [ $LARGE_CHUNKS -gt 0 ]; then
        echo -e "   ${YELLOW}Warning: $LARGE_CHUNKS JS files > 500KB${NC}"
    else
        print_status 0 "No oversized chunks"
    fi
fi
echo ""

echo "===================================="
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}Some checks failed. Please fix issues above.${NC}"
    exit 1
fi
