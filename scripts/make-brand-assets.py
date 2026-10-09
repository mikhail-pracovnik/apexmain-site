"""Generate SVG mark, favicons and Open Graph images from src/data/brand-mark.json.

Usage: python scripts/make-brand-assets.py   (needs: pip install pillow; fonts-src/ for OG text)
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
brand = json.loads((ROOT / "src/data/brand-mark.json").read_text(encoding="utf-8"))
C = brand["colors"]
VW, VH = brand["viewBox"][2], brand["viewBox"][3]
PUBLIC = ROOT / "public"


def svg(bg=None, pad=0, rx=0):
    w, h = VW + pad * 2, VH + pad * 2
    side = max(w, h) if bg else None
    vb = f"{-pad - (side - w) / 2 if side else -pad} {-pad - (side - h) / 2 if side else -pad} {side or w} {side or h}"
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}">']
    if bg:
        parts.append(f'<rect x="{-pad - (side - w) / 2}" y="{-pad - (side - h) / 2}" width="{side}" height="{side}" rx="{rx}" fill="{bg}"/>')
    for s in brand["shapes"]:
        pts = " ".join(f"{x},{y}" for x, y in s["points"])
        parts.append(f'<polygon points="{pts}" fill="{C[s["tone"]]}"/>')
    parts.append("</svg>")
    return "".join(parts)


def draw_mark(img, x, y, width):
    k = width / VW
    d = ImageDraw.Draw(img)
    for s in brand["shapes"]:
        d.polygon([(x + px * k, y + py * k) for px, py in s["points"]], fill=C[s["tone"]])


def icon(size, pad_ratio=0.18, radius_ratio=0.22):
    ss = 4  # supersample for smooth edges
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle([0, 0, S - 1, S - 1], radius=int(S * radius_ratio), fill=C["ink"])
    w = S * (1 - pad_ratio * 2)
    draw_mark(img, S * pad_ratio, (S - w * VH / VW) / 2 + S * 0.02, w)
    return img.resize((size, size), Image.LANCZOS)


(ROOT / "assets/logo/apexmain-mark.svg").write_text(svg(), encoding="utf-8")
(PUBLIC / "favicon.svg").write_text(svg(bg=C["ink"], pad=230, rx=330), encoding="utf-8")
icon(180, pad_ratio=0.16, radius_ratio=0).convert("RGB").save(PUBLIC / "apple-touch-icon.png")
icon(512, radius_ratio=0).convert("RGB").save(PUBLIC / "icon-512.png")
icon(192, radius_ratio=0).convert("RGB").save(PUBLIC / "icon-192.png")
icon(48).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])

# Open Graph 1200x630, one per locale: the hero headline in two lines (as on the site), *accent* in turquoise
OG = {
    "ru": ("Развиваем бизнес.", "Создаём *возможности*."),
    "kk": ("Бизнесті дамытамыз.", "*Мүмкіндіктер* жасаймыз."),
    "en": ("Growing businesses.", "Creating *opportunities*."),
}
display = ROOT / "fonts-src/Geologica.ttf"
mono = ROOT / "fonts-src/PlexMono-Medium.ttf"
for loc, lines in OG.items():
    ss = 2
    W, H = 1200 * ss, 630 * ss
    img = Image.new("RGB", (W, H), C["ink"])
    d = ImageDraw.Draw(img)
    # faint grid
    for gx in range(0, W, 60 * ss):
        d.line([(gx, 0), (gx, H)], fill="#11151c", width=ss)
    draw_mark(img, W - 520 * ss, 120 * ss, 420 * ss)
    # 48 px, below the mark (it ends at y ≈ 415)
    f = ImageFont.truetype(str(display), 48 * ss)
    try:
        axes = f.get_variation_axes()
        f.set_variation_by_axes([700 if a["name"] in (b"Weight", "Weight") else (100 if a["name"] in (b"Sharpness", "Sharpness") else a["default"]) for a in axes])
    except OSError:
        pass
    m = ImageFont.truetype(str(mono), 24 * ss)
    d.text((72 * ss, 72 * ss), "APEXMAIN", font=m, fill=C["apex"])
    y = 452 * ss
    for line in lines:
        x = 72 * ss
        for i, part in enumerate(line.split("*")):
            d.text((x, y), part, font=f, fill=C["apex"] if i % 2 else C["paper"])
            x += d.textlength(part, font=f)
        y += 62 * ss
    img.resize((1200, 630), Image.LANCZOS).save(PUBLIC / f"og-{loc}.png", optimize=True)
print("ok")
