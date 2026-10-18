#!/usr/bin/env bash
# Quality gate: typecheck -> secret scan -> security regression -> build
set -uo pipefail
FAIL=0
step() { echo; echo "=== $1 ==="; }
step "1/4 TypeScript"; npx tsc --noEmit || FAIL=1
step "2/4 Secret scan"; node scripts/secret-scan.mjs || FAIL=1
step "3/4 Security regression"; npx tsx --test tests/security/security-regression.test.ts || FAIL=1
step "4/4 Production build"; npm run build || FAIL=1
echo; [ $FAIL -eq 0 ] && echo "QUALITY GATE: PASS" || echo "QUALITY GATE: FAIL"
exit $FAIL
