# Cyprus Mushroom Finder

A map of Cyprus showing where **growing conditions** are right for wild mushrooms.

> **Conditions only. Never eat a wild mushroom based on this map, an app or an AI.**
> Emergency: **112** · Cyprus Poison Centre: **1401**

## Run the pipeline

Needs: Homebrew `gdal`, `uv`.

```bash
cd pipeline
uv run python -m shroomy.habitat.fetch     # download + cache the fixed data
uv run python -m shroomy.habitat.build     # build the 250 m habitat layer
uv run python -m shroomy.preview.render    # draw preview PNGs into previews/
uv run pytest                              # tests
```

## Where things are
- `config/` — every weight, threshold, source and credit
- `pipeline/` — Python data pipeline
- `docs/TODO-facts.md` — facts still to confirm
- `PLAN.md` — the phase plan
