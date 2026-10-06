"""Subset source fonts (fonts-src/) to Latin + Cyrillic incl. Kazakh, write WOFF2 to public/fonts/.

Usage: python scripts/subset-fonts.py   (needs: pip install fonttools brotli)
"""
from pathlib import Path
import io
import shutil
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / "fonts-src", ROOT / "public" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

# Basic Latin, Latin-1, Cyrillic (incl. Kazakh ә ғ қ ң ө ұ ү һ і), punctuation, ₸, №, arrows
UNICODES = "U+0020-007E,U+00A0-00FF,U+0131,U+0152-0153,U+02C6,U+02DC,U+0400-04FF,U+2010-2027,U+2030-203A,U+20AC,U+20B8,U+2116,U+2122,U+2190-2193,U+2197,U+2212"

FONTS = [
    # (source, output, axis limits)
    ("Geologica.ttf", "display.woff2", {"wght": (500, 800), "SHRP": 100, "CRSV": 0, "slnt": 0}),
    ("Onest.ttf", "body.woff2", {"wght": (400, 700)}),
    ("PlexMono-Regular.ttf", "mono.woff2", None),
    ("PlexMono-Medium.ttf", "mono-medium.woff2", None),
]

KAZAKH = "әғқңөұүһіӘҒҚҢӨҰҮҺІ"

for src, out, limits in FONTS:
    font = TTFont(SRC / src)
    if limits:
        font = instancer.instantiateVariableFont(font, limits)
        buf = io.BytesIO()
        font.save(buf)
        buf.seek(0)
        font = TTFont(buf)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]  # keep copyright/licence metadata (OFL requirement)
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(font)
    cmap = font.getBestCmap()
    missing = [c for c in KAZAKH if ord(c) not in cmap]
    assert not missing, f"{src}: missing {missing}"
    font.flavor = "woff2"
    font.save(OUT / out)
    print(f"{out}: {(OUT / out).stat().st_size // 1024} KB")

for lic in SRC.glob("OFL-*.txt"):
    shutil.copy(lic, OUT / lic.name)
