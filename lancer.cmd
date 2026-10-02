@echo off
rem Lanceur de la suite DEFA (Windows) : double-cliquer.
rem Trouve Python (l'installe au besoin), recupere les donnees (data/), demarre le serveur local et ouvre la page
rem des parametres. Tout le reste est dans tools\launch.py.
setlocal
cd /d "%~dp0"
chcp 65001 >nul

set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
if not defined PY python3 --version >nul 2>&1 && set "PY=python3"
if not defined PY call :installpython
if not defined PY goto :nopython

%PY% tools\launch.py %*
if errorlevel 1 pause
exit /b

:installpython
echo Python est introuvable : installation...
where winget >nul 2>&1 || exit /b
winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
rem le PATH de cette fenetre n'est pas encore a jour : chemins d'installation habituels
for %%P in ("%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" "%ProgramFiles%\Python312\python.exe") do (
  if not defined PY if exist %%P set PY="%%~P"
)
exit /b

:nopython
echo.
echo Python n'a pas pu etre installe automatiquement.
echo La page de telechargement s'ouvre : installez Python 3 (cocher "Add python.exe to PATH"), puis relancez lancer.cmd.
start "" https://www.python.org/downloads/
pause
exit /b 1
