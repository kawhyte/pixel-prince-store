"""Rebuild app/fonts/inter-subset.woff2: Inter, weights 400-700, Latin-1 plus the punctuation the
site uses. About half of Google's Latin file (48 KB -> 25 KB).

  npm pack @fontsource-variable/inter && tar xzf fontsource-variable-inter-*.tgz
  pip install fonttools brotli
  python3 scripts/subset-inter.py package/files/inter-latin-wght-normal.woff2

A character outside the list still shows, in the fallback font. Add it to UNICODES and rerun.
"""
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

UNICODES = (
    "U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201A,U+201C-201E,U+2022,U+2026,"
    "U+2032-2033,U+20AC,U+2122,U+2212"
)
FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk"]

font = instancer.instantiateVariableFont(TTFont(sys.argv[1]), {"wght": (400, 700)})
options = subset.Options()
options.flavor = "woff2"
options.layout_features = FEATURES
options.name_IDs = [1, 2]
options.hinting = False
options.desubroutinize = True
subsetter = subset.Subsetter(options)
subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
subsetter.subset(font)
font.flavor = "woff2"
font.save("app/fonts/inter-subset.woff2")
