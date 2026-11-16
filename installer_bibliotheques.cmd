@echo off
rem Installe les bibliotheques Python EN OPTION de la suite (SOG-0376) : lecture des PDF, et a part l'OCR.
rem A lancer par l'utilisateur (double-clic), jamais par le lanceur ni par une page. Tout le reste est dans
rem tools\install_libs.py ; la liste et les bornes sont dans tools\requirements-optional.txt (un seul fichier).
rem Python est cherche COMME dans lancer.cmd (meme ordre : py -3, python, python3) ; ce script n'installe pas Python.
setlocal
rem programmes cherches dans le PATH seulement, jamais dans ce dossier
set "NoDefaultCurrentDirectoryInExePath=1"
cd /d "%~dp0"
chcp 65001 >nul

set "PY="
py -3 --version >nul 2>&1 && set "PY=py -3"
if not defined PY python --version >nul 2>&1 && set "PY=python"
if not defined PY python3 --version >nul 2>&1 && set "PY=python3"
if not defined PY goto :nopython

%PY% tools\install_libs.py %*
set "RC=%ERRORLEVEL%"
pause
exit /b %RC%

:nopython
echo.
echo Python est introuvable : lancez d'abord lancer.cmd (il l'installe), puis relancez ce script.
echo Python was not found: run lancer.cmd first (it installs it), then run this script again.
pause
exit /b 1
