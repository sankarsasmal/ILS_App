Set-Location $PSScriptRoot
python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
python .\run_app.py
