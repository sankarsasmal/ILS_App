@echo off
cd /d "%~dp0"
set PY_CMD=python
py --version >nul 2>&1
if %errorlevel%==0 set PY_CMD=py

%PY_CMD% -m pip install -r requirements.txt
if errorlevel 1 pause & exit /b 1
%PY_CMD% run_app.py
pause
