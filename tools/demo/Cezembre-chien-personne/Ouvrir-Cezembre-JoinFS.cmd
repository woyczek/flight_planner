@echo off
if not exist "%~dp0cezembre-chien-personne.jfs" (
 echo Preparerez le terrain dans X-Plane avec le menu FlyWithLua : DEFA Cezembre.
 pause
 exit /b 1
)
"D:\Program Files\JoinFS\XPlane\JoinFS-XPLANE.exe" --play "%~dp0cezembre-chien-personne.jfs" --multiobjects
