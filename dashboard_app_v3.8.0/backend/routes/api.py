from pathlib import Path

from flask import Blueprint, current_app, jsonify, request
from backend.services.dashboard_service import process_directory
from backend.services.reactor_map_service import process_reactor_map_directory
from backend.services.online_analysis_service import process_online_file

api = Blueprint("api", __name__, url_prefix="/api")


@api.get("/health")
def health():
    return jsonify({"status": "ok", "version": current_app.config["APP_VERSION"]})


@api.get("/settings")
def settings():
    return jsonify(
        {
            "default_source_directory": current_app.config.get("DEFAULT_SOURCE_DIRECTORY", ""),
            "default_reactor_source_directory": current_app.config.get("DEFAULT_REACTOR_SOURCE_DIRECTORY", ""),
            "default_run_plan_file": current_app.config.get("DEFAULT_RUN_PLAN_FILE", ""),
        }
    )



from backend.services.dialog_service import browse_directory_dialog, browse_file_dialog


@api.post("/browse-folder")
def browse_folder():
    initial = (request.get_json(silent=True) or {}).get(
        "initial_directory"
    ) or current_app.config.get("DEFAULT_SOURCE_DIRECTORY", "")
    try:
        selected, cancelled = browse_directory_dialog(
            initial_dir=initial, title="Select DHA XLS folder"
        )
        return jsonify({"path": selected, "cancelled": cancelled})
    except Exception as e:
        return jsonify(
            {
                "error": "Native folder browser is unavailable. Enter the folder path manually.",
                "details": str(e),
            }
        ), 503


@api.post("/process")
def process():
    folder = (request.get_json(silent=True) or {}).get("path")
    if not folder:
        return jsonify({"error": "Folder path is required."}), 400
    try:
        return jsonify(process_directory(folder))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@api.post("/browse-reactor-folder")
def browse_reactor_folder():
    initial = (request.get_json(silent=True) or {}).get(
        "initial_directory"
    ) or current_app.config.get("DEFAULT_REACTOR_SOURCE_DIRECTORY", "")
    try:
        selected, cancelled = browse_directory_dialog(
            initial_dir=initial, title="Select Reactor Map CSV folder"
        )
        return jsonify({"path": selected, "cancelled": cancelled})
    except Exception as e:
        return jsonify(
            {
                "error": "Native folder browser is unavailable. Enter the folder path manually.",
                "details": str(e),
            }
        ), 503


@api.post("/process-reactor-map")
def process_reactor_map():
    folder = (request.get_json(silent=True) or {}).get("path")
    if not folder:
        return jsonify({"error": "Reactor Map source folder path is required."}), 400
    try:
        return jsonify(process_reactor_map_directory(folder))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@api.post("/browse-online-file")
def browse_online_file():
    initial = (request.get_json(silent=True) or {}).get("initial_file") or ""
    try:
        selected, cancelled = browse_file_dialog(
            initial_file=initial,
            title="Select Online Analysis text file",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        return jsonify({"path": selected, "cancelled": cancelled})
    except Exception as e:
        return jsonify(
            {
                "error": "Native file browser is unavailable. Enter the file path manually.",
                "details": str(e),
            }
        ), 503


@api.post("/process-online")
def process_online():
    file_path = (request.get_json(silent=True) or {}).get("path")
    if not file_path:
        return jsonify({"error": "Online Analysis file path is required."}), 400
    try:
        return jsonify(process_online_file(file_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@api.post("/apply-online-reactor-map")
def apply_online_reactor_map():
    body = request.get_json(silent=True) or {}
    rows = body.get("rows")
    reactor_rows = body.get("reactor_rows")
    if not rows or not isinstance(rows, list):
        return jsonify({"error": "Online rows list is required."}), 400
    if not reactor_rows or not isinstance(reactor_rows, list):
        return jsonify({"error": "Reactor Map rows list is required."}), 400
    try:
        from backend.services.online_analysis_service import apply_reactor_map_to_online_rows
        mapped = apply_reactor_map_to_online_rows(rows, reactor_rows)
        return jsonify({"rows": mapped, "record_count": len(mapped)})
    except Exception as e:
        return jsonify({"error": str(e)}), 400


@api.post("/browse-run-plan-file")
def browse_run_plan_file():
    initial = (request.get_json(silent=True) or {}).get("initial_file") or current_app.config.get("DEFAULT_RUN_PLAN_FILE", "")
    try:
        selected, cancelled = browse_file_dialog(
            initial_file=initial,
            title="Select Run Plan Excel file",
            filetypes=[("Excel files", "*.xlsx;*.xls"), ("All files", "*.*")],
        )
        return jsonify({"path": selected, "cancelled": cancelled})
    except Exception as e:
        return jsonify(
            {
                "error": "Native file browser is unavailable. Enter the file path manually.",
                "details": str(e),
            }
        ), 503


@api.post("/process-run-plan")
def process_run_plan():
    file_path = (request.get_json(silent=True) or {}).get("path")
    if not file_path:
        return jsonify({"error": "Run Plan file path is required."}), 400
    try:
        from backend.services.run_plan_service import process_run_plan_file
        return jsonify(process_run_plan_file(file_path))
    except Exception as e:
        return jsonify({"error": str(e)}), 400


