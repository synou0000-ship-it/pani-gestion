@echo off
echo ========================================
echo   PANI GESTION - Build Android (APK)
echo ========================================
echo.

cd /d "%~dp0frontend"

:: Configurer le chemin du SDK Android si local.properties n'existe pas
if not exist "android\local.properties" (
    if exist "%LOCALAPPDATA%\Android\Sdk" (
        echo Configuration automatique du SDK Android...
        (echo sdk.dir=%LOCALAPPDATA:\=\\%\\Android\\Sdk) > "android\local.properties"
    )
)

echo [1/4] Construction du frontend React...
call npm run build
if errorlevel 1 (
    echo [ERREUR] Echec du build React
    pause
    exit /b 1
)

echo.
echo [2/4] Synchronisation des fichiers avec Android...
call node_modules\.bin\cap sync android
if errorlevel 1 (
    echo [ERREUR] Echec de la synchronisation Capacitor
    pause
    exit /b 1
)

echo.
echo [3/4] Compilation de l'APK Android (Gradle)...
cd android
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo [ERREUR] Echec de la compilation APK
    pause
    exit /b 1
)

echo.
echo [4/4] Copie de l'APK final...
if not exist "..\..\android-apk" mkdir "..\..\android-apk"
copy /y "app\build\outputs\apk\debug\app-debug.apk" "..\..\android-apk\pani-gestion.apk" >nul

echo.
echo ===================================================
echo   SUCCES ! L'APK Android a ete genere avec succes :
echo   c:\projet-goita\pani-gestion\android-apk\pani-gestion.apk
echo ===================================================
echo.
pause
