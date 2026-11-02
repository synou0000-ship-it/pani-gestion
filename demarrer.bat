@echo off
setlocal enabledelayedexpansion
title PANI GESTION - Demarrage Local
echo ========================================
echo   PANI GESTION - Demarrage Local
echo ========================================
echo.

:: Resoudre le chemin racine de pani-gestion
set "ROOT=C:\projet-goita\pani-gestion"
if not exist "%ROOT%\backend" (
    if exist "%~dp0backend" set "ROOT=%~dp0"
    if exist "%~dp0pani-gestion\backend" set "ROOT=%~dp0pani-gestion"
)

:: 1. Verifier que PostgreSQL est actif (service Windows)
echo [1/3] Verification de PostgreSQL...
sc query postgresql-x64-16 | findstr "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo    PostgreSQL n'est pas actif. Tentative de demarrage...
    net start postgresql-x64-16 >nul 2>&1
    if errorlevel 1 (
        echo [AVERTISSEMENT] Impossible de demarrer PostgreSQL automatiquement.
        echo    Veuillez verifier que le service postgresql-x64-16 est installe.
    ) else (
        echo    PostgreSQL demarre avec succes.
    )
    timeout /t 2 /nobreak >nul
) else (
    echo    PostgreSQL est actif. OK
)

:: 2. Liberer le port 5000 si occupe
netstat -ano | findstr "LISTENING" | findstr ":5000 " >nul 2>&1
if not errorlevel 1 (
    echo    Port 5000 occupe - liberation en cours...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5000 "') do (
        taskkill /PID %%p /F >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

:: 3. Liberer le port 5173 si occupe
netstat -ano | findstr "LISTENING" | findstr ":5173 " >nul 2>&1
if not errorlevel 1 (
    echo    Port 5173 occupe - liberation en cours...
    for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5173 "') do (
        taskkill /PID %%p /F >nul 2>&1
    )
    timeout /t 2 /nobreak >nul
)

:: 4. Demarrer le serveur backend (Port 5000)
echo [2/3] Demarrage du serveur backend (Port 5000)...
start "PANI Backend" cmd /k "cd /d %ROOT%\backend && node dist/index.js"
timeout /t 3 /nobreak >nul

:: 5. Demarrer le frontend (Port 5173)
echo [3/3] Demarrage du frontend (Port 5173)...
start "PANI Frontend" cmd /k "cd /d %ROOT%\frontend && npx vite --host --port 5173"
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Application PANI GESTION prete !
echo.
echo   Navigateur PC:  http://localhost:5173
echo   Sur smartphone: http://192.168.1.100:5173
echo   API Backend:    http://192.168.1.100:5000/api
echo.
echo   Connexion: admin@pani.com
echo   Mot de passe: Admin123!
echo.
echo   [ASTUCE] Pour connecter le smartphone facilement :
echo   Double-cliquez sur "demarrer-en-ligne.bat"
echo ========================================
echo.

start http://localhost:5173
