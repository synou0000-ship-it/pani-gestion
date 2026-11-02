@echo off
echo ========================================
echo   PANI GESTION - Installation initiale
echo ========================================
echo.

:: Verifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installe. Telechargez-le sur https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installation des dependances backend...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 (
    echo [ERREUR] Installation backend echouee
    pause
    exit /b 1
)

echo [2/4] Installation des dependances frontend...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
    echo [ERREUR] Installation frontend echouee
    pause
    exit /b 1
)

echo [3/4] Initialisation du schema Prisma...
cd /d "%~dp0backend"
call npx prisma generate
call npx prisma db push
if errorlevel 1 (
    echo [AVERTISSEMENT] Impossible de se connecter a PostgreSQL.
    echo Verifiez que le service PostgreSQL est bien demarre.
)

echo [4/4] Insertion des donnees par defaut (Admin, Tarifs, Produit)...
call npx ts-node src/prisma/seed.ts

echo.
echo ========================================
echo   Installation terminee avec succes !
echo.
echo   Pour demarrer l'application:
echo   Double-cliquez sur demarrer.bat (ou demarrer.ps1)
echo.
echo   Compte administrateur:
echo   Email:    admin@pani.com
echo   Mot de passe: Admin123!
echo ========================================
pause
