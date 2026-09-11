from pathlib import Path
from unittest.mock import patch
import sys
import types

olefile = types.ModuleType('olefile')
olefile.OleFileIO = object
xlrd = types.ModuleType('xlrd')
xlrd.open_workbook = lambda **kwargs: None
sys.modules.setdefault('olefile', olefile)
sys.modules.setdefault('xlrd', xlrd)

from backend.loaders.xls_loader import extract


class Sheet:
    def __init__(self, rows, cols, values):
        self.nrows = rows
        self.ncols = cols
        self.values = values

    def cell_value(self, row, col):
        return self.values.get((row, col), '')


class Workbook:
    def __init__(self):
        self.header = Sheet(6, 2, {(5, 1): 'S1_1_2026-09-08 10-20-30 R17_C1_S1_001_2026-09-08'})
        carbon_values = {(2, 2): 'CARBON #', (2, 3): 'Paraffins', (2, 4): 'I-Paraffin', (2, 5): 'Aromatic', (2, 6): 'Naphthene', (2, 7): 'Olefin', (20, 10): '1.25'}
        for i in range(15):
            carbon_values[(3 + i, 2)] = i + 1
            for col in range(3, 8):
                carbon_values[(3 + i, col)] = (i + 1) * 0.1
        self.carbon = Sheet(21, 11, carbon_values)

    def sheet_names(self):
        return ['HEADER', 'CARBON_TABULAR(%WGT)']

    def sheet_by_name(self, name):
        return self.header if name == 'HEADER' else self.carbon


def test_extract_repeats_k21_unknowns_for_each_component():
    with patch('backend.loaders.xls_loader.open_xls', return_value=Workbook()):
        rows = extract(Path('sample.xls'))
    assert len(rows) == 5
    assert all(row['Unknowns'] == 1.25 for row in rows)
    assert rows[0]['C1'] == 0.1
