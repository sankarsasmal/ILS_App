import json
from pathlib import Path
from flask import Flask,send_from_directory
from backend.routes.api import api
BASE=Path(__file__).resolve().parent
def create_app(test_config=None):
    s=json.loads((BASE/'config/settings.json').read_text())
    app=Flask(__name__,static_folder=None);app.config.update(APP_VERSION=(BASE/'VERSION').read_text().strip(),DEFAULT_SOURCE_DIRECTORY=s['default_source_directory'])
    if test_config:app.config.update(test_config)
    app.register_blueprint(api)
    @app.get('/')
    def index():return send_from_directory(BASE/'frontend','index.html')
    @app.get('/frontend/<path:path>')
    def frontend(path):return send_from_directory(BASE/'frontend',path)
    return app
app=create_app()
