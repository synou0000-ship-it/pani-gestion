@echo off
title PANI GESTION - Autorisation du Pare-Feu Windows
echo ========================================================
echo   PANI GESTION - Autorisation du Pare-Feu Windows
echo ========================================================
echo.

:: Verifier les droits administrateur
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Demande d'elevation administrateur en cours...
    echo Veuillez cliquer sur "OUI" dans la fenetre Windows qui apparait.
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo [1/2] Configuration du port 5000 (API Backend PostgreSQL / SQLite)...
netsh advfirewall firewall delete rule name="PANI-API-5000" >nul 2>&1
netsh advfirewall firewall add rule name="PANI-API-5000" dir=in action=allow protocol=TCP localport=5000 profile=any >nul
if %errorLevel% equ 0 (
    echo       Port 5000 autorise avec succes. OK
) else (
    echo       Erreur sur le port 5000.
)

echo [2/2] Configuration du port 5173 (Frontend Web)...
netsh advfirewall firewall delete rule name="PANI-UI-5173" >nul 2>&1
netsh advfirewall firewall add rule name="PANI-UI-5173" dir=in action=allow protocol=TCP localport=5173 profile=any >nul
if %errorLevel% equ 0 (
    echo       Port 5173 autorise avec succes. OK
) else (
    echo       Erreur sur le port 5173.
)

echo.
echo ========================================================
echo   SUCCES TOTAL ! Les ports 5000 et 5173 sont ouverts !
echo.
echo   Votre smartphone peut desormais se connecter au PC :
echo   - Via l'application APK PANI GESTION
echo   - Via le navigateur du telephone : http://192.168.1.100:5173
echo ========================================================
echo.
pause
