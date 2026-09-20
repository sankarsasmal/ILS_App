import json
from pathlib import Path
from flask import Flask, send_from_directory
from backend.routes.api import api

BASE = Path(__file__).resolve().parent


def create_app(test_config=None):
    s = json.loads((BASE / "config/settings.json").read_text(encoding="utf-8"))
    app = Flask(__name__, static_folder=None)
    app.config.update(
        APP_VERSION=(BASE / "VERSION").read_text(encoding="utf-8").strip(),
        DEFAULT_SOURCE_DIRECTORY=s.get("default_source_directory", ""),
        DEFAULT_REACTOR_SOURCE_DIRECTORY=s.get("default_reactor_source_directory", ""),
        DEFAULT_RUN_PLAN_FILE=s.get("default_run_plan_file", ""),
        RUN_NUMBER="",
    )
    if test_config:
        app.config.update(test_config)
    app.register_blueprint(api)

    @app.get("/")
    @app.get("/run-plan")
    @app.get("/run_plan")
    def run_plan():
        return send_from_directory(BASE / "frontend", "run_plan.html")

    @app.get("/offline-analysis")
    @app.get("/offline_analysis")
    @app.get("/offline")
    def offline_analysis():
        return send_from_directory(BASE / "frontend", "index.html")

    @app.get("/online-analysis")
    @app.get("/online_analysis")
    def online_analysis():
        return send_from_directory(BASE / "frontend", "online_analysis.html")

    @app.get("/calculation-table")
    @app.get("/calculation_table")
    @app.get("/calculation")
    def calculation_table():
        return send_from_directory(BASE / "frontend", "calculation_table.html")

    @app.get("/plots")
    @app.get("/plots.html")
    def plots_view():
        return send_from_directory(BASE / "frontend", "plots.html")

    @app.get("/frontend/<path:path>")
    def frontend(path):
        return send_from_directory(BASE / "frontend", path)

    return app


app = create_app()
