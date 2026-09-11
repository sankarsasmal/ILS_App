import re,olefile,xlrd
from datetime import datetime
from backend.calculations.constants import *
from backend.validators.values import clean_numeric_value,normalize_header
DT=re.compile(r'S1_\d+_(\d{4}-\d{2}-\d{2})\s+(\d{2})-(\d{2})-(\d{2})')
UID=re.compile(r'([A-Za-z0-9]+_C\d+_S\d+_\d+)_\d{4}-\d{2}-\d{2}')
def open_xls(path):
    with olefile.OleFileIO(str(path)) as ole:
        stream='Workbook' if ole.exists('Workbook') else ('Book' if ole.exists('Book') else None)
        if not stream:raise ValueError("Workbook/Book OLE stream not found")
        raw=ole.openstream(stream).read()
    return xlrd.open_workbook(file_contents=raw,ignore_workbook_corruption=True)
def extract(path):
    wb=open_xls(path)
    if HEADER_SHEET not in wb.sheet_names():raise ValueError('HEADER worksheet not found')
    hs=wb.sheet_by_name(HEADER_SHEET)
    if hs.nrows<6 or hs.ncols<2:raise ValueError('HEADER!B6 is unavailable')
    text=str(hs.cell_value(5,1)).strip(); dm=DT.search(text); um=UID.search(text)
    if not dm or not um:raise ValueError('UID or DateTime pattern not found in HEADER!B6')
    ds,h,m,s=dm.groups(); dt=datetime.strptime(f'{ds} {h}:{m}:{s}','%Y-%m-%d %H:%M:%S')
    if CARBON_SHEET not in wb.sheet_names():raise ValueError(f'{CARBON_SHEET} worksheet not found')
    sh=wb.sheet_by_name(CARBON_SHEET)
    if sh.nrows<18 or sh.ncols<8:raise ValueError('Required range C3:H18 is incomplete')
    headers=[normalize_header(sh.cell_value(2,c)) for c in range(2,8)]; expected=['CARBON#']+COMPONENTS
    miss=[x for x in expected if x not in headers]
    if miss:raise ValueError(f'Missing headers: {miss}')
    idx={x:c for x,c in zip(headers,range(2,8))}; result=[]
    for comp in COMPONENTS:
        row={'File Name':path.name,'UID':um.group(1),'DateTime':dt.strftime('%d/%m/%Y %H:%M'),'Component':comp}
        row.update({f'C{n}':None for n in CARBON_NUMBERS})
        for r in range(3,18):
            cn=clean_numeric_value(sh.cell_value(r,idx['CARBON#']))
            if cn is not None and int(cn) in CARBON_NUMBERS:row[f'C{int(cn)}']=clean_numeric_value(sh.cell_value(r,idx[comp]))
        result.append(row)
    return result
