"""Paths and config loading. Every number the model uses comes from config/*.yaml."""
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]          # the shroomy/ project folder
CONFIG_DIR = ROOT / "config"
DATA = ROOT / "data"
RAW = DATA / "raw"                                  # cached downloads (not in git)
PROCESSED = DATA / "processed"                      # built layers (not in git)
PREVIEW = ROOT / "previews"                         # images to look at


def load(name: str) -> dict:
    """Load config/<name>.yaml."""
    with open(CONFIG_DIR / f"{name}.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)
