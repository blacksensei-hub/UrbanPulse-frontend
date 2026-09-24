"""
Self-hosted Inter and JetBrains Mono for UrbanPulse (both SIL OFL 1.1).

Fetches the exact files Google Fonts serves Chrome today, then writes to
public/fonts/:
  <family>-latin.woff2      Google's latin file, unchanged
  <family>-cedi.woff2       just the cedi sign (U+20B5), cut from latin-ext
  <family>-latin-ext.woff2  Google's latin-ext file, unchanged
and src/styles/fonts.css with @font-face rules.

Why: with Google's CSS, every "GH₵" price made the browser fetch the whole
latin-ext file (84KB for Inter) for one glyph. Here the cedi comes from a
~2KB file, and latin-ext is only fetched if a page actually uses one of its
other characters (e.g. Ɛ ɔ in Ghanaian names).

Clash Display is NOT handled here: its licence (ITF FFL) forbids subsetting
or converting it, and forbids publishing it in a public repository. See
scripts/fetch-clash.mjs, which fetches it untouched at build time.

Run from frontend/:  python scripts/build-fonts.py   (needs fonttools[woff])
"""
import re
import shutil
import tempfile
import urllib.request
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
CSS_OUT = ROOT / "src" / "styles" / "fonts.css"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36")
GOOGLE = ("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700"
          "&family=JetBrains+Mono:wght@400;500&display=swap")
CEDI = 0x20B5
FAMILIES = {"Inter": ("inter", "400 700"), "JetBrains Mono": ("jetbrains-mono", "400 500")}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def parse_ranges(text):
    """'U+0000-00FF, U+0131' -> [(0x0, 0xFF), (0x131, 0x131)]"""
    out = []
    for part in text.split(","):
        part = part.strip().upper().replace("U+", "")
        lo, _, hi = part.partition("-")
        out.append((int(lo, 16), int(hi or lo, 16)))
    return out


def fmt_ranges(ranges):
    return ", ".join(f"U+{lo:04X}" if lo == hi else f"U+{lo:04X}-{hi:04X}" for lo, hi in ranges)


def without(ranges, cp):
    out = []
    for lo, hi in ranges:
        if lo <= cp <= hi:
            if lo < cp:
                out.append((lo, cp - 1))
            if cp < hi:
                out.append((cp + 1, hi))
        else:
            out.append((lo, hi))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    css = get(GOOGLE).decode()
    faces = {}  # (family, subset) -> (url, ranges)
    for subset, body in re.findall(r"/\* ([\w-]+) \*/\s*@font-face \{([^}]+)\}", css):
        if subset not in ("latin", "latin-ext"):
            continue
        family = re.search(r"font-family: '([^']+)'", body).group(1)
        url = re.search(r"url\(([^)]+)\)", body).group(1)
        ranges = parse_ranges(re.search(r"unicode-range: ([^;]+);", body).group(1))
        faces[(family, subset)] = (url, ranges)

    rules = []
    tmp = Path(tempfile.mkdtemp())
    for family, (slug, weights) in FAMILIES.items():
        latin_url, latin_ranges = faces[(family, "latin")]
        ext_url, ext_ranges = faces[(family, "latin-ext")]
        (OUT / f"{slug}-latin.woff2").write_bytes(get(latin_url))
        ext_src = tmp / f"{slug}-latin-ext.woff2"
        ext_src.write_bytes(get(ext_url))
        shutil.copy(ext_src, OUT / f"{slug}-latin-ext.woff2")

        def face(file, ranges):
            return (f"@font-face {{\n  font-family: '{family}';\n  font-style: normal;\n"
                    f"  font-weight: {weights};\n  font-display: swap;\n"
                    f"  src: url('/fonts/{file}') format('woff2');\n"
                    f"  unicode-range: {fmt_ranges(ranges)};\n}}")
        rules += [f"/* {family}: latin */", face(f"{slug}-latin.woff2", latin_ranges)]

        font = TTFont(ext_src)
        if CEDI in font.getBestCmap():
            opts = Options()
            opts.flavor = "woff2"
            opts.layout_features = ["*"]
            opts.notdef_outline = True
            opts.name_IDs = ["*"]           # keep copyright/licence names intact (OFL)
            sub = Subsetter(opts)
            sub.populate(unicodes=[CEDI])
            sub.subset(font)
            font.flavor = "woff2"
            font.save(OUT / f"{slug}-cedi.woff2")
            rules += [f"/* {family}: the cedi sign alone, so prices don't pull in all of latin-ext */",
                      face(f"{slug}-cedi.woff2", [(CEDI, CEDI)])]
        else:
            # Google's range claims U+20B5, but this font has no cedi glyph:
            # browsers fetched the whole file for nothing, then fell back to
            # the next font in the stack anyway. Same fallback, no download.
            print(f"note: {family} has no cedi glyph; it falls back as before, without the fetch")
        rules += [f"/* {family}: rest of latin-ext, only fetched if a page uses it */",
                  face(f"{slug}-latin-ext.woff2", without(ext_ranges, CEDI))]

    header = ("/* Generated by scripts/build-fonts.py. Do not edit by hand.\n"
              "   Inter and JetBrains Mono, SIL Open Font License 1.1\n"
              "   (public/fonts/OFL-Inter.txt, public/fonts/OFL-JetBrainsMono.txt).\n"
              "   Clash Display is declared in src/styles/clash.css. */\n\n")
    CSS_OUT.write_text(header + "\n\n".join(rules) + "\n", encoding="utf-8")
    shutil.rmtree(tmp)
    for f in sorted(OUT.glob("*.woff2")):
        print(f"{f.stat().st_size / 1024:7.1f} KB  {f.name}")


if __name__ == "__main__":
    main()
