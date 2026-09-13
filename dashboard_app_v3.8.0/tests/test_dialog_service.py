from pathlib import Path
from unittest.mock import patch, MagicMock
from app import create_app
from backend.services.dialog_service import (
    resolve_initial_dir,
    browse_directory_dialog,
    browse_file_dialog,
)


def test_resolve_initial_dir_existing():
    cur = str(Path(__file__).resolve().parent)
    assert resolve_initial_dir(cur) == cur


def test_resolve_initial_dir_from_file():
    cur_file = str(Path(__file__).resolve())
    expected_parent = str(Path(__file__).resolve().parent)
    assert resolve_initial_dir(cur_file) == expected_parent


def test_resolve_initial_dir_non_existent():
    assert resolve_initial_dir("Z:\\NonExistent\\Path\\12345") == ""


def test_browse_directory_dialog_mocked():
    with patch("backend.services.dialog_service._run_picker") as mock_run:
        mock_run.return_value = ("C:\\Test\\Folder", False)
        path, cancelled = browse_directory_dialog("C:\\Test", "Select folder")
        assert path == "C:\\Test\\Folder"
        assert cancelled is False


def test_browse_file_dialog_mocked():
    with patch("backend.services.dialog_service._run_picker") as mock_run:
        mock_run.return_value = ("C:\\Test\\File.txt", False)
        path, cancelled = browse_file_dialog("C:\\Test\\File.txt", "Select file")
        assert path == "C:\\Test\\File.txt"
        assert cancelled is False


def test_api_browse_folder_endpoint():
    app = create_app({"TESTING": True})
    client = app.test_client()

    with patch("backend.routes.api.browse_directory_dialog") as mock_browse:
        mock_browse.return_value = ("C:\\Selected\\DHA", False)
        res = client.post("/api/browse-folder", json={"initial_directory": "C:\\Initial"})
        assert res.status_code == 200
        data = res.get_json()
        assert data["path"] == "C:\\Selected\\DHA"
        assert data["cancelled"] is False


def test_api_browse_folder_endpoint_cancelled():
    app = create_app({"TESTING": True})
    client = app.test_client()

    with patch("backend.routes.api.browse_directory_dialog") as mock_browse:
        mock_browse.return_value = ("", True)
        res = client.post("/api/browse-folder", json={"initial_directory": "C:\\Initial"})
        assert res.status_code == 200
        data = res.get_json()
        assert data["path"] == ""
        assert data["cancelled"] is True


def test_api_browse_reactor_folder_endpoint():
    app = create_app({"TESTING": True})
    client = app.test_client()

    with patch("backend.routes.api.browse_directory_dialog") as mock_browse:
        mock_browse.return_value = ("C:\\Selected\\ValveOpening", False)
        res = client.post("/api/browse-reactor-folder", json={"initial_directory": "C:\\Initial"})
        assert res.status_code == 200
        data = res.get_json()
        assert data["path"] == "C:\\Selected\\ValveOpening"
        assert data["cancelled"] is False


def test_api_browse_online_file_endpoint():
    app = create_app({"TESTING": True})
    client = app.test_client()

    with patch("backend.routes.api.browse_file_dialog") as mock_browse:
        mock_browse.return_value = ("C:\\Selected\\Result.txt", False)
        res = client.post("/api/browse-online-file", json={"initial_file": "C:\\Initial.txt"})
        assert res.status_code == 200
        data = res.get_json()
        assert data["path"] == "C:\\Selected\\Result.txt"
        assert data["cancelled"] is False
