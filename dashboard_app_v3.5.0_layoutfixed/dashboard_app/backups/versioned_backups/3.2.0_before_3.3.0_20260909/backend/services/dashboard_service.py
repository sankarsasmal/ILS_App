from pathlib import Path
from backend.loaders.xls_loader import extract,extract_component_list
def process_directory(folder):
 p=Path(folder)
 if not p.exists() or not p.is_dir(): raise ValueError('Selected folder does not exist or is not a directory.')
 files=sorted(x for x in p.glob('*.xls') if not x.name.startswith('~$')); rows=[]; table2=[]; log=[]; ok1=ok2=0
 for f in files:
  errors=[]
  try: rows.extend(extract(f)); ok1+=1
  except Exception as e: errors.append(f'Table-1: {e}')
  try: table2.append(extract_component_list(f)); ok2+=1
  except Exception as e: errors.append(f'Table-2: {e}')
  log.append({'File Name':f.name,'Status':'Success' if not errors else ('Partial' if len(errors)==1 else 'Failed'),'Message':' | '.join(errors)})
 cols=['File Name','UID','DateTime']
 for row in table2:
  for key in row:
   if key not in cols: cols.append(key)
 return {'rows':rows,'table2_rows':table2,'table2_columns':cols,'processing_log':log,'summary':{'files_found':len(files),'processed':sum(x['Status']!='Failed' for x in log),'table1_processed':ok1,'table2_processed':ok2,'failed':sum(x['Status']=='Failed' for x in log),'rows':len(rows),'table2_rows':len(table2)},'source_directory':str(p)}
