from pathlib import Path
from backend.loaders.xls_loader import extract
def process_directory(folder):
    p=Path(folder)
    if not p.exists() or not p.is_dir():raise ValueError('Selected folder does not exist or is not a directory.')
    files=sorted(x for x in p.glob('*.xls') if not x.name.startswith('~$')); rows=[]; log=[]
    for f in files:
        try:rows.extend(extract(f));log.append({'File Name':f.name,'Status':'Success','Message':''})
        except Exception as e:log.append({'File Name':f.name,'Status':'Failed','Message':str(e)})
    return {'rows':rows,'processing_log':log,'summary':{'files_found':len(files),'processed':sum(x['Status']=='Success' for x in log),'failed':sum(x['Status']=='Failed' for x in log),'rows':len(rows)},'source_directory':str(p)}
