import pytest


@pytest.fixture(autouse=True)
def _no_real_shelf(tmp_path, monkeypatch):
    """Tests never read or write the real shared shelf (../shroomy-shared)."""
    monkeypatch.setenv("SHROOMY_SHELF", str(tmp_path / "test-shelf"))
