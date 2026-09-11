from backend.loaders.xls_loader import canonical_header
def test_unknown_aliases():
 assert canonical_header('Unknowns')=='Unknown'; assert canonical_header('Unidentified')=='Unknown'; assert canonical_header('Unknown')=='Unknown'
