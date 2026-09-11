from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
from backend.loaders.xls_loader import canonical_header
def test_unknown_aliases():
 assert canonical_header('Unknowns')=='Unknown'; assert canonical_header('Unidentified')=='Unknown'; assert canonical_header('Unknown')=='Unknown'


def test_reactor_map_tab_and_page():
    index = (ROOT / "frontend" / "index.html").read_text(encoding="utf-8")
    reactor = (ROOT / "frontend" / "reactor_map.html").read_text(encoding="utf-8")
    assert "data-table=\"reactorMap\"" in index
    assert "/frontend/reactor_map.html" in index
    assert "Reactor Map" in reactor and all(f"R{i}" in reactor for i in range(1, 9))
