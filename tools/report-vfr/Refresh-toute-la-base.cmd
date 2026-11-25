@echo off
setlocal
set "VAC_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%VAC_PY%" goto run
set "VAC_PY=python"
:run
"%VAC_PY%" -m unittest discover -s "%~dp0" -p "test_vac*.py" -q
if errorlevel 1 goto failed
"%VAC_PY%" "%~dp0vac_parser.py" --all --output "%~dp0..\..\data\sia\vac" --legacy "%~dp0..\..\data\sia\vfr"
if errorlevel 1 goto failed
echo Analyse terminee. Les candidats automatiques sont a relire dans l'atelier.
pause
exit /b 0
:failed
echo Traitement incomplet. Consulter les erreurs ci-dessus et batch-report.json.
pause
exit /b 1
