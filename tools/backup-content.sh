#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/backups"
TS="$(date +%F-%H%M%S)"
mkdir -p "$OUT"
TMP="$OUT/content-$TS"
mkdir -p "$TMP"
cp -a "$ROOT/src/articles" "$TMP/" 2>/dev/null || true
cp -a "$ROOT/src/_data" "$TMP/" 2>/dev/null || true
mkdir -p "$TMP/data"
cp -a "$ROOT/data/likes.json" "$TMP/data/" 2>/dev/null || true
cp -a "$ROOT/data/likes-votes.json" "$TMP/data/" 2>/dev/null || true
tar -czf "$OUT/content-$TS.tar.gz" -C "$OUT" "content-$TS"
rm -rf "$TMP"
echo "Backup created: $OUT/content-$TS.tar.gz"
