"""Trace third-party logos into clean SVGs for the integrations strip: a monochrome version and a colour one (hover).

Each source image is upscaled, its colours are clustered, and every non-white colour is mapped to a tone:
the darkest colour becomes solid, lighter colours become semi-transparent, so inner details survive in one
colour. Each tone is traced with potrace into smooth vector paths. Output: public/media/logos/<id>.svg
The colour version (<id>-color.svg) traces every brand colour separately; near-black colours are drawn light,
as brands do on dark backgrounds.

Usage: python scripts/vectorize-logos.py <source-dir>   (needs: pip install pillow numpy potracer)
Sources are kept outside the repo (git-ignored); only the generated SVGs are committed.
"""
import sys
from pathlib import Path

import numpy as np
import potrace
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "media" / "logos"
OUT.mkdir(parents=True, exist_ok=True)

# source file → logo id (see src/content/integrations.yaml)
SOURCES = {
    "1.webp": "kaspi",
    "2.png": "halyk",
    "3.webp": "bcc",
    "4.png": "forte",
    "5.png": "freedom",
    "6.png": "bitrix24",
    "7.png": "paloma365",
    "8.png": "1c",
    "9.png": "iiko",
}
FILL = "#ECF0F1"
TARGET_W = 2400  # working width before tracing


def luminance(rgb):
    c = rgb / 255.0
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]


def kmeans(pixels, k, iters=25, seed=1):
    rng = np.random.default_rng(seed)
    centers = pixels[rng.choice(len(pixels), k, replace=False)].astype(float)
    for _ in range(iters):
        d = ((pixels[:, None, :] - centers[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for j in range(k):
            if (lab == j).any():
                centers[j] = pixels[lab == j].mean(0)
    return centers


def tones(img):
    """Return (full_mask, mid_mask, centers, labels)."""
    rgb = np.asarray(img, dtype=float)
    lum = luminance(rgb)
    ink = lum < 0.9  # anything that is not near-white
    px = rgb[ink]
    sample = px[np.random.default_rng(0).choice(len(px), min(len(px), 20000), replace=False)]
    # pick the number of colours: merge clusters closer than ~40 RGB units
    centers = kmeans(sample, 4)
    # drop clusters that are only anti-aliased edges (small share of ink pixels)
    lab_s = ((sample[:, None, :] - centers[None]) ** 2).sum(-1).argmin(1)
    share = np.bincount(lab_s, minlength=len(centers)) / len(sample)
    centers = centers[share >= 0.06]
    merged = []
    for c in sorted(centers, key=lambda c: luminance(c)):
        if all(np.linalg.norm(c - m) > 60 for m in merged):
            merged.append(c)
    # drop "tints": a light colour that is just a darker logo colour blended with white is an edge halo
    # (JPEG / anti-aliasing), not a brand colour; its pixels then fall to the nearest real colour or white
    white = np.array([255.0, 255.0, 255.0])
    merged = np.array(merged)
    lab_m = ((sample[:, None, :] - merged[None]) ** 2).sum(-1).argmin(1)
    msh = np.bincount(lab_m, minlength=len(merged))
    kept = []
    for i, c in enumerate(merged):
        tint = False
        for k, m in enumerate(merged):
            if luminance(m) >= luminance(c):
                continue
            t = np.dot(c - white, m - white) / np.dot(m - white, m - white)
            # a halo sits on the white→colour line and is much smaller than the colour it surrounds
            if 0 < t < 1 and np.linalg.norm(white + t * (m - white) - c) < 28 and msh[i] < 0.5 * msh[k]:
                tint = True
        if not tint:
            kept.append(c)
    centers = np.array(kept)
    lums = luminance(centers)
    darkest = lums.min()
    # nearest colour for every ink pixel (white is a candidate too, so anti-aliased fringes drop out)
    cand = np.vstack([centers, [[255, 255, 255]]]).astype(np.float32)
    rgb32 = rgb.astype(np.float32)
    d = np.stack([((rgb32 - c) ** 2).sum(-1) for c in cand], -1)
    lab = d.argmin(-1)
    full = np.zeros(lab.shape, bool)
    mid = np.zeros(lab.shape, bool)
    for j, L in enumerate(lums):
        # colours clearly lighter than the darkest one become the secondary (semi-transparent) tone
        (mid if L - darkest > 0.18 else full)[lab == j] = True
    return full, mid, centers, lab


def trace(mask, scale):
    bm = potrace.Bitmap(~mask)  # potracer fills the "dark" (False) pixels
    paths = bm.trace(turdsize=12, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=1.0, opticurve=True, opttolerance=0.2)
    f = lambda p: f"{p.x / scale:.1f} {p.y / scale:.1f}"
    parts = []
    for curve in paths:
        parts.append(f"M{f(curve.start_point)}")
        for seg in curve.segments:
            if seg.is_corner:
                parts.append(f"L{f(seg.c)}L{f(seg.end_point)}")
            else:
                parts.append(f"C{f(seg.c1)} {f(seg.c2)} {f(seg.end_point)}")
        parts.append("Z")
    return "".join(parts)


def process(src: Path, logo_id: str):
    im = Image.open(src).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    im = Image.alpha_composite(bg, im).convert("RGB")
    # crop to content with a small margin
    arr = np.asarray(im)
    ys, xs = np.nonzero(luminance(arr.astype(float)) < 0.9)
    pad = 4
    im = im.crop((max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, im.width), min(ys.max() + pad, im.height)))
    # upscale + light denoise so edges trace smoothly
    k = TARGET_W / im.width
    big = im.resize((TARGET_W, round(im.height * k)), Image.LANCZOS).filter(ImageFilter.MedianFilter(3))
    full, mid, centers, lab = tones(big)
    scale = k  # output in source-pixel units
    w, h = im.width, im.height
    d_full = trace(full, scale)
    d_mid = trace(mid, scale) if mid.any() else ""
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">']
    if d_mid:
        svg.append(f'<path d="{d_mid}" fill="{FILL}" fill-opacity="0.5" fill-rule="evenodd"/>')
    svg.append(f'<path d="{d_full}" fill="{FILL}" fill-rule="evenodd"/>')
    svg.append("</svg>")
    out = OUT / f"{logo_id}.svg"
    out.write_text("".join(svg), encoding="utf-8")
    # colour version: each brand colour traced separately, in its real (median) colour
    rgb = np.asarray(big)
    color = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">']
    for j in sorted(range(len(centers)), key=lambda j: -luminance(centers[j])):
        mask = lab == j
        if not mask.any():
            continue
        c = np.median(rgb[mask], axis=0)
        hexc = FILL if luminance(c) < 0.15 else "#%02X%02X%02X" % tuple(int(v) for v in c)
        color.append(f'<path d="{trace(mask, scale)}" fill="{hexc}" fill-rule="evenodd"/>')
    color.append("</svg>")
    out_c = OUT / f"{logo_id}-color.svg"
    out_c.write_text("".join(color), encoding="utf-8")
    print(f"{logo_id}: {len(centers)} colours, mid={'yes' if d_mid else 'no'}, {out.stat().st_size // 1024} KB, colour {out_c.stat().st_size // 1024} KB")


if __name__ == "__main__":
    src_dir = Path(sys.argv[1])
    for name, logo_id in SOURCES.items():
        process(src_dir / name, logo_id)
