@echo off
setlocal
set "VAC_PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%VAC_PY%" goto run
set "VAC_PY=python"
:run
"%VAC_PY%" "%~dp0vac_parser.py" --output "%~dp0..\..\data\sia\vac" --legacy "%~dp0..\..\data\sia\vfr"
pause
