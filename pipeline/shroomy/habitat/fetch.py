"""Download the fixed (build-once) habitat data. Everything is cached in data/raw/.

Run:  uv run python -m shroomy.habitat.fetch
"""
import json
import subprocess
import time
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
import requests

from .. import config
from ..grid import habitat_grid

UA = {"User-Agent": "shroomy-habitat-builder/0.1 (non-commercial research)"}


def _get(url, params=None, timeout=180, tries=4):
    for i in range(tries):
        try:
            r = requests.get(url, params=params, headers=UA, timeout=timeout)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            if i == tries - 1:
                raise
            print(f"   retry {i + 1} after error: {e}")
            time.sleep(5 * (i + 1))


# ------------------------------------------------------------------ DEM
def fetch_dem() -> Path:
    """Copernicus GLO-30 tiles -> one 25 m DEM on our UTM grid."""
    src = config.load("sources")["dem"]
    out_dir = config.RAW / "dem"
    out_dir.mkdir(parents=True, exist_ok=True)
    tiles = []
    for t in src["tiles"]:
        name = f"Copernicus_DSM_COG_10_{t}_DEM"
        p = out_dir / f"{name}.tif"
        if not p.exists():
            print(f" - DEM tile {t}")
            p.write_bytes(_get(f"{src['url']}{name}/{name}.tif").content)
        tiles.append(str(p))

    g = habitat_grid().at(config.load("region")["grids"]["terrain_m"])
    out = config.PROCESSED / "dem_25m.tif"
    if not out.exists():
        config.PROCESSED.mkdir(parents=True, exist_ok=True)
        vrt = out_dir / "dem.vrt"
        subprocess.run(["gdalbuildvrt", "-q", str(vrt), *tiles], check=True)
        w, s, e, n = g.bounds
        subprocess.run([
            "gdalwarp", "-q", "-overwrite", "-t_srs", g.crs, "-te", str(w), str(s), str(e), str(n),
            "-tr", str(g.res), str(g.res), "-r", "bilinear", "-ot", "Float32",
            "-dstnodata", "-9999", "-co", "COMPRESS=DEFLATE", "-co", "TILED=YES",
            "-co", "PREDICTOR=3", str(vrt), str(out)], check=True)
    return out


# ------------------------------------------------------------------ forest type
def fetch_forest() -> Path:
    """Copernicus HRL Forest Type 2018 at 10 m, in chunks, via the EEA image service."""
    src = config.load("sources")["forest_type"]
    g = habitat_grid().at(10)
    out_dir = config.RAW / "forest_type"
    out_dir.mkdir(parents=True, exist_ok=True)
    chunk = 4000                                   # pixels (service max is 15000 x 4100)
    parts = []
    for r0 in range(0, g.height, chunk):
        for c0 in range(0, g.width, chunk):
            h = min(chunk, g.height - r0)
            w = min(chunk, g.width - c0)
            p = out_dir / f"fty_r{r0}_c{c0}.tif"
            parts.append(p)
            if p.exists():
                continue
            x0 = g.west + c0 * g.res
            y1 = g.north - r0 * g.res
            bbox = f"{x0},{y1 - h * g.res},{x0 + w * g.res},{y1}"
            print(f" - forest chunk r{r0} c{c0}")
            r = _get(f"{src['url']}/exportImage", params={
                "bbox": bbox, "bboxSR": 32636, "imageSR": 32636, "size": f"{w},{h}",
                "format": "tiff", "pixelType": "U8", "interpolation": "RSP_NearestNeighbor",
                "compression": "LZ77", "f": "image"})
            if not r.content[:2] in (b"II", b"MM"):
                raise RuntimeError(f"forest service did not return a TIFF: {r.content[:200]!r}")
            p.write_bytes(r.content)
    vrt = out_dir / "forest_type.vrt"
    subprocess.run(["gdalbuildvrt", "-q", "-overwrite", str(vrt), *map(str, parts)], check=True)
    return vrt


# ------------------------------------------------------------------ vectors
def _arcgis_geojson(layer_url: str, where: str, out_fields="*") -> gpd.GeoDataFrame:
    """Read a whole ArcGIS layer as GeoJSON (paged), reprojected to our grid CRS."""
    feats, off = [], 0
    while True:
        r = _get(f"{layer_url}/query", params={
            "where": where, "outFields": out_fields, "outSR": 4326, "f": "geojson",
            "resultOffset": off, "resultRecordCount": 1000})
        page = r.json().get("features", [])
        feats += page
        off += len(page)
        if len(page) < 1000:
            break
    gdf = gpd.GeoDataFrame.from_features(feats, crs="EPSG:4326")
    # Some services return joined names like "inspire.ESRI.geUnit.featureID".
    gdf = gdf.rename(columns={c: c.split(".")[-1] for c in gdf.columns if c != "geometry"})
    return gdf.to_crs(config.load("region")["crs"])


def fetch_vectors() -> Path:
    """Nature reserves, Natura 2000 and geology into one GeoPackage."""
    src = config.load("sources")
    out = config.RAW / "vectors.gpkg"
    if out.exists():
        return out

    print(" - nature reserves (EEA NatDA, CY04)")
    nr = _arcgis_geojson(src["nature_reserves"]["url"], src["nature_reserves"]["filter"],
                         "siteName,designationTypeCode,iucnCategory,siteArea,nationalId")
    nr.to_file(out, layer="nature_reserves")

    print(" - Natura 2000")
    n2k = []
    for lyr in (0, 1):                      # Habitats Directive sites, Birds Directive sites
        g = _arcgis_geojson(f"{src['natura2000']['url']}/{lyr}", src["natura2000"]["filter"],
                            "SITECODE,SITENAME,SITETYPE")
        n2k.append(g)
    n2k = gpd.GeoDataFrame(gpd.pd.concat(n2k, ignore_index=True), crs=n2k[0].crs)
    n2k.drop_duplicates("SITECODE").to_file(out, layer="natura2000")

    print(" - geology units")
    base = src["geology"]["url"]
    geo = _arcgis_geojson(f"{base}/3", "1=1", "featureID")
    units, off = [], 0
    while True:
        page = _get(f"{base}/6/query", params={
            "where": "1=1", "outFields": "featureID,geologicUnitType_label", "f": "json",
            "resultOffset": off, "resultRecordCount": 1000}).json()["features"]
        units += [f["attributes"] for f in page]
        off += len(page)
        if len(page) < 1000:
            break
    lab = {u["featureID"]: u["geologicUnitType_label"] for u in units}
    geo["unit"] = geo["featureID"].map(lab)
    geo.to_file(out, layer="geology")
    return out


def main():
    print("DEM:", fetch_dem())
    print("Forest:", fetch_forest())
    print("Vectors:", fetch_vectors())


if __name__ == "__main__":
    main()
