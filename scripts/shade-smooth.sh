#!/usr/bin/env bash
# Shroomy Lite: the 50 m shade map as one smooth picture (fixed file, made once).
# Reads web/public/tiles/shade50.pmtiles (the 50 m shade squares) and writes
# web/public/tiles/shade50_smooth.pmtiles: the same shade values and colours, as image
# tiles up to zoom 13. The map enlarges them smoothly when you zoom in, so the colours
# blend from square to square instead of showing hard steps and thin gaps.
# The squares themselves stay on the map (invisible) so a tap still finds its 50 m square.
# Needs GDAL and the pmtiles tool (Homebrew). Takes about a minute.
set -euo pipefail
cd "$(dirname "$0")/.."
IN=web/public/tiles/shade50.pmtiles
OUT=web/public/tiles/shade50_smooth.pmtiles
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# 1. Shade value (0-100) of every 50 m square, on the project's own 50 m grid
#    (EPSG:32636, the same grid the squares were made on; see pipeline/shroomy/grid.py).
ogr2ogr -q -f GPKG -t_srs EPSG:32636 -nln sq "$TMP/sq.gpkg" "$IN" hotspots
gdal_rasterize -q -l sq -a sh -te 426500 3817750 651500 3957500 -tr 50 50 \
  -ot Byte -a_nodata 255 -init 255 "$TMP/sq.gpkg" "$TMP/shade.tif"

# 2. Colours: the same colour steps as SHADE_STOPS in web/src/map/layers.ts. No data = see-through.
cat > "$TMP/colours.txt" <<'EOF'
nv 0 0 0 0
0 241 227 181 255
35 185 201 143 255
55 95 158 134 255
75 47 111 120 255
100 24 58 90 255
EOF
gdaldem color-relief -q -alpha "$TMP/shade.tif" "$TMP/colours.txt" "$TMP/rgba.tif"

# 3. Web map tiles for zoom 11-13 (zoom 13 = about 16 m per pixel), blended (bilinear) from the 50 m squares.
gdalwarp -q -t_srs EPSG:3857 -r bilinear -dstalpha -tr 19.109257071294063 19.109257071294063 -tap \
  "$TMP/rgba.tif" "$TMP/merc.tif"
gdal_translate -q -of MBTILES -co TILE_FORMAT=PNG8 -co ZOOM_LEVEL_STRATEGY=LOWER -co RESAMPLING=BILINEAR \
  "$TMP/merc.tif" "$TMP/shade.mbtiles"
gdaladdo -q -r average "$TMP/shade.mbtiles" 2 4
pmtiles convert "$TMP/shade.mbtiles" "$OUT" 2>&1 | tail -3
ls -la "$OUT"
