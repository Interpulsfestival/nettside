#!/usr/bin/env bash
# Forbereder et programslipp lokalt: bygger siden for en dato og committer, men pusher IKKE.
#   tools/release.sh <kilde.html> <ÅÅÅÅ-MM-DD> [mappe med ekstra bilder, f.eks. tm-*.jpg]
# Push først når salget har åpnet (kl. 10.00), siden repoet er offentlig.
set -euo pipefail
SRC="$(realpath "$1")"; DATE="$2"; EXTRA="${3:-}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO"
EXTRA_FILES=()
if [ -n "$EXTRA" ]; then for f in "$EXTRA"/*.jpg; do [ -e "$f" ] || continue; [ -e "img/$(basename "$f")" ] || { cp "$f" img/; EXTRA_FILES+=("$(basename "$f" .jpg)"); }; done; fi
tools/build.sh "$SRC" --date="$DATE"
# fjern ekstra bilder som ikke brukes på de sluppede sidene (slik at ingenting røpes før tiden)
for n in "${EXTRA_FILES[@]}"; do grep -rqs "/img/$n.jpg" --include=*.html . || rm -f "img/$n.jpg" img/r/"$n"-*; done
git add -A
git commit -q -m "Programslipp $DATE" && git log --oneline -1
