#!/usr/bin/env bash
# Mirrors the CI checks in .github/workflows/build.yml.
# Run from the repo root, or let the pre-push hook call it automatically.
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
JS_DIR="$ROOT/desktop"
LOCK="$ROOT/Cargo.lock"

pass() { echo "  ✓ $*"; }
fail() { echo "  ✗ $*" >&2; exit 1; }
header() { echo; echo "==> $*"; }

# ── TypeScript ────────────────────────────────────────────────────────────────
header "TypeScript (tsc --noEmit)"
if [ ! -d "$JS_DIR/node_modules" ]; then
  echo "  ! node_modules missing — run 'npm ci' in desktop/. Skipping TS check."
else
  (cd "$JS_DIR" && npx tsc --noEmit)
  pass "tsc --noEmit"
fi

# ── Tests ─────────────────────────────────────────────────────────────────────
header "Unit tests (vitest)"
if [ ! -d "$JS_DIR/node_modules" ]; then
  echo "  ! node_modules missing — skipping tests."
else
  (cd "$JS_DIR" && npm test)
  pass "vitest"
fi

# ── Cargo check ───────────────────────────────────────────────────────────────
header "Cargo check (workspace)"
(cd "$ROOT" && cargo check --workspace)
pass "cargo check"

# ── Tauri version parity ──────────────────────────────────────────────────────
header "Tauri npm/Rust version parity"
if [ -f "$LOCK" ] && [ -f "$JS_DIR/package.json" ] && command -v node >/dev/null 2>&1; then
  NPM_VER=$(node -pe "require('$JS_DIR/package.json').devDependencies['@tauri-apps/cli']" \
    | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "")
  CARGO_VER=$(grep -A2 '^name = "tauri"$' "$LOCK" \
    | grep '^version' | head -1 | grep -oE '[0-9]+\.[0-9]+' || echo "")
  if [ -z "$NPM_VER" ] || [ -z "$CARGO_VER" ]; then
    echo "  ! Could not determine versions — skipping parity check."
  elif [ "$NPM_VER" != "$CARGO_VER" ]; then
    fail "Tauri version mismatch: @tauri-apps/cli=$NPM_VER, tauri crate=$CARGO_VER
       Fix: cargo update tauri  OR  npm install -D @tauri-apps/cli@${CARGO_VER}.x  in desktop/"
  else
    pass "@tauri-apps/cli and tauri crate both on $NPM_VER"
  fi
else
  echo "  ! Cargo.lock, package.json, or node not found — skipping parity check."
fi

echo
echo "All checks passed."
