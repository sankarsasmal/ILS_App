from pathlib import Path
from backend.loaders.xls_loader import extract, extract_component_list, extract_octane


def process_directory(folder):
    p = Path(folder)
    if not p.exists() or not p.is_dir():
        raise ValueError('Selected folder does not exist or is not a directory.')
    files = sorted(x for x in p.glob('*.xls') if not x.name.startswith('~$'))
    rows, table2, table3, log = [], [], [], []
    ok1 = ok2 = ok3 = 0
    for f in files:
        errors = []
        try:
            rows.extend(extract(f)); ok1 += 1
        except Exception as e:
            errors.append(f'Table-1: {e}')
        try:
            table2.append(extract_component_list(f)); ok2 += 1
        except Exception as e:
            errors.append(f'Table-2: {e}')
        try:
            table3.append(extract_octane(f)); ok3 += 1
        except Exception as e:
            errors.append(f'Table-3: {e}')
        success_count = 3 - len(errors)
        status = 'Success' if success_count == 3 else ('Partial' if success_count else 'Failed')
        log.append({'File Name': f.name, 'Status': status, 'Message': ' | '.join(errors)})
    cols = ['File Name', 'UID', 'DateTime']
    for row in table2:
        for key in row:
            if key not in cols:
                cols.append(key)
    return {
        'rows': rows, 'table2_rows': table2, 'table2_columns': cols,
        'table3_rows': table3,
        'table3_columns': ['File Name','UID','DateTime','Lin-RON','Lin-MON','Cal-RON','Cal-MON'],
        'processing_log': log,
        'summary': {
            'files_found': len(files), 'processed': sum(x['Status'] != 'Failed' for x in log),
            'table1_processed': ok1, 'table2_processed': ok2, 'table3_processed': ok3,
            'failed': sum(x['Status'] == 'Failed' for x in log),
            'rows': len(rows), 'table2_rows': len(table2), 'table3_rows': len(table3)
        },
        'source_directory': str(p)
    }
