@echo off
echo ========================================
echo   PANI GESTION - Build Application Windows (EXE)
echo ========================================
echo.

echo [1/3] Construction du Frontend React...
cd /d "%~dp0frontend"
call npm run build
if errorlevel 1 (
    echo [ERREUR] Echec du build Frontend
    pause
    exit /b 1
)

echo.
echo [2/3] Compilation du Backend Node.js...
cd /d "%~dp0backend"
call npm run build
if errorlevel 1 (
    echo [ERREUR] Echec de la compilation Backend
    pause
    exit /b 1
)

echo.
echo [3/3] Creation de l'installateur Windows Electron...
cd /d "%~dp0electron"
call npm install
call npm run build

echo.
echo ========================================
echo   Executable Windows genere dans:
echo   c:\projet-goita\pani-gestion\electron\dist-electron\
echo ========================================
pause
