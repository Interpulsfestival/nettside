#!/usr/bin/env bash
# Bygger interpuls.no på nytt fra kildefila (prototypen i Claude-artefaktet).
#   tools/build.sh <kilde.html> --date=2026-11-20   # slik siden skal være på en slippdag
#   tools/build.sh <kilde.html> --released          # alt 2027-innhold er sluppet
# Uten --date eller --released holdes alt 2027-innhold utenfor.
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
# fjern forrige bygg, så sider som ikke lenger skal finnes (f.eks. /program før slipp) ikke blir liggende
( cd "$REPO" && rm -rf index.html 404.html sitemap.xml css js fonts en program medvirkende bilder presse om partnere kontakt )
cp -r "$OUT"/. "$REPO"/
echo "Ferdig. Se over med: node tools/serve.mjs . img 8080   (git status viser endringene)"
