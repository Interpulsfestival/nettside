# Lager AVIF/WebP-varianter i flere bredder av JPG-ene som brukes i et bygg, og manifest.json.
# Bruk: python3 images.py <img-mappe> <byggemappe>
# Bare bilder som faktisk brukes i byggemappa får varianter, og varianter av ubrukte bilder slettes,
# slik at filnavn fra upubliserte program ikke havner i repoet.
import sys, os, json, glob, re
from PIL import Image
src, built = sys.argv[1], sys.argv[2]; out = os.path.join(src, "r"); os.makedirs(out, exist_ok=True)
used = set()
for f in glob.glob(os.path.join(built, "**", "*.html"), recursive=True):
    used |= set(re.findall(r'/img/([\w.-]+)\.jpg', open(f, encoding="utf8").read()))
for f in glob.glob(os.path.join(out, "*-*.*")):
    if re.sub(r'-\d+\.(avif|webp)$', '', os.path.basename(f)) not in used: os.remove(f)
WIDTHS = [480, 800, 1200, 1600]
man = {}
for f in sorted(glob.glob(os.path.join(src, "*.jpg"))):
    name = os.path.basename(f)[:-4]
    if name == "og" or name not in used: continue
    im = Image.open(f); im.load(); im = im.convert("RGB")
    w, h = im.size
    ws = [x for x in WIDTHS if x < w] + [min(w, 1600)]
    ws = sorted(set(ws))
    for x in ws:
        r = im if x == w else im.resize((x, round(h * x / w)), Image.LANCZOS)
        for fmt, q in (("webp", 78), ("avif", 55)):
            p = os.path.join(out, f"{name}-{x}.{fmt}")
            if not os.path.exists(p): r.save(p, fmt.upper(), quality=q)
    man[name] = {"w": w, "h": h, "ws": ws}
json.dump(man, open(os.path.join(out, "manifest.json"), "w"), indent=0)
print(len(man), "bilder")
