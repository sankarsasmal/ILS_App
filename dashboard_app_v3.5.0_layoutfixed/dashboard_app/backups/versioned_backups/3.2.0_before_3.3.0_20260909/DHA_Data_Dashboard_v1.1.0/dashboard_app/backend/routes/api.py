from flask import Blueprint,current_app,jsonify,request
from backend.services.dashboard_service import process_directory
api=Blueprint('api',__name__,url_prefix='/api')
@api.get('/health')
def health():return jsonify({'status':'ok','version':current_app.config['APP_VERSION']})
@api.get('/settings')
def settings():return jsonify({'default_source_directory':current_app.config['DEFAULT_SOURCE_DIRECTORY']})
@api.post('/browse-folder')
def browse_folder():
    initial=(request.get_json(silent=True) or {}).get('initial_directory') or current_app.config['DEFAULT_SOURCE_DIRECTORY']
    try:
        import tkinter as tk
        from tkinter import filedialog
        root=tk.Tk();root.withdraw();root.attributes('-topmost',True)
        selected=filedialog.askdirectory(initialdir=initial,title='Select DHA XLS folder');root.destroy()
        return jsonify({'path':selected or initial,'cancelled':not bool(selected)})
    except Exception as e:return jsonify({'error':'Native folder browser is unavailable. Enter the folder path manually.','details':str(e)}),503
@api.post('/process')
def process():
    folder=(request.get_json(silent=True) or {}).get('path')
    if not folder:return jsonify({'error':'Folder path is required.'}),400
    try:return jsonify(process_directory(folder))
    except Exception as e:return jsonify({'error':str(e)}),400
