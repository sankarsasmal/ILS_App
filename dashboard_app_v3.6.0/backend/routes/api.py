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
        }
    )


@api.post("/browse-folder")
def browse_folder():
    initial = (request.get_json(silent=True) or {}).get(
        "initial_directory"
    ) or current_app.config["DEFAULT_SOURCE_DIRECTORY"]
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(
            initialdir=initial, title="Select DHA XLS folder"
        )
        root.destroy()
        return jsonify({"path": selected or initial, "cancelled": not bool(selected)})
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
    ) or current_app.config["DEFAULT_REACTOR_SOURCE_DIRECTORY"]
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askdirectory(
            initialdir=initial, title="Select Reactor Map CSV folder"
        )
        root.destroy()
        return jsonify({"path": selected or initial, "cancelled": not bool(selected)})
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
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        selected = filedialog.askopenfilename(
            initialdir=str(Path(initial).parent) if initial else None,
            title="Select Online Analysis text file",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )
        root.destroy()
        return jsonify({"path": selected or initial, "cancelled": not bool(selected)})
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
