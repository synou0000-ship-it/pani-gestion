@echo off
setlocal enabledelayedexpansion
title PANI GESTION - Demarrage avec Acces En Ligne / Smartphone
echo ========================================================
echo   PANI GESTION - Demarrage avec Connexion Smartphone
echo ========================================================
echo.

:: Resoudre le chemin racine de pani-gestion
set "ROOT=C:\projet-goita\pani-gestion"
if not exist "%ROOT%\backend" (
    if exist "%~dp0backend" set "ROOT=%~dp0"
    if exist "%~dp0pani-gestion\backend" set "ROOT=%~dp0pani-gestion"
)

:: 1. Verifier PostgreSQL
echo [1/3] Verification de PostgreSQL...
sc query postgresql-x64-16 | findstr "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo    Tentative de demarrage de PostgreSQL...
    net start postgresql-x64-16 >nul 2>&1
) else (
    echo    PostgreSQL est actif. OK
)

:: 2. Demarrer le backend
echo [2/3] Demarrage du Backend API (Port 5000)...
start "PANI Backend" cmd /k "cd /d %ROOT%\backend && node dist/index.js"
timeout /t 2 /nobreak >nul

:: 3. Demarrer le frontend
echo [3/3] Demarrage du Frontend React (Port 5173)...
start "PANI Frontend" cmd /k "cd /d %ROOT%\frontend && npx vite --host --port 5173"
timeout /t 2 /nobreak >nul

:: 4. Demarrer le Tunnel Cloudflare
echo.
echo [TUNNEL] Creation de l'adresse securisee pour smartphone (Wi-Fi et 4G)...
set "CF_EXE=%ROOT%\cloudflared.exe"
if not exist "%CF_EXE%" (
    if exist "C:\projet-goita\cloudflared.exe" set "CF_EXE=C:\projet-goita\cloudflared.exe"
)

if exist "%CF_EXE%" (
    start "PANI Tunnel Smartphone" cmd /k ""%CF_EXE%" tunnel --url http://localhost:5000"
) else (
    echo [ERREUR] cloudflared.exe introuvable.
)

echo.
echo ========================================================
echo   Application PANI GESTION Prete !
echo   - Web PC : http://localhost:5173
echo   - Le tunnel Cloudflare affiche l'adresse HTTPS pour APK
echo ========================================================
pause
