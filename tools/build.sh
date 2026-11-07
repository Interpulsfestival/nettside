#!/usr/bin/env bash
# Bygger interpuls.no på nytt fra kildefila (prototypen i Claude-artefaktet).
#   tools/build.sh <kilde.html>              # før programslipp (2027 skjult)
#   tools/build.sh <kilde.html> --released   # etter programslipp
# Kildefila inneholder upubliserte data og skal ALDRI legges i repoet.
set -euo pipefail
SRC="$(realpath "$1")"; shift
REPO="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)"; PUB="$(mktemp)"
# Offentlig referanse for lekkasjesjekken: siste enkeltside-versjon før flersidebygget
git -C "$REPO" show 7f64c42:index.html > "$PUB"
node "$REPO/tools/build.mjs" "$SRC" "$OUT" --public="$PUB" --img="$REPO/img" "$@"
python3 "$REPO/tools/images.py" "$REPO/img" "$OUT"
rm -rf "$OUT"; OUT="$(mktemp -d)"
node "$REPO/tools/build.mjs" "$SRC" "$OUT" --public="$PUB" --img="$REPO/img" "$@"
cp -r "$OUT"/. "$REPO"/
echo "Ferdig. Se over med: node tools/serve.mjs . img 8080   (git status viser endringene)"
