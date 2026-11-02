# ==========================================
# PANI GESTION - Script de demarrage PowerShell
# ==========================================

$ErrorActionPreference = "Continue"
$BackendDir = Join-Path $PSScriptRoot "backend"
$FrontendDir = Join-Path $PSScriptRoot "frontend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   PANI GESTION - Demarrage" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verifier PostgreSQL
Write-Host "[1/3] Verification PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service "postgresql-x64-16" -ErrorAction SilentlyContinue
if ($null -eq $pgService) {
    Write-Host "     Service PostgreSQL non trouve." -ForegroundColor Red
} elseif ($pgService.Status -ne "Running") {
    Write-Host "     Demarrage de PostgreSQL..." -ForegroundColor Yellow
    Start-Service "postgresql-x64-16" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
    Write-Host "     PostgreSQL demarre." -ForegroundColor Green
} else {
    Write-Host "     PostgreSQL est actif. OK" -ForegroundColor Green
}

# 2. Verifier / Demarrer le backend
$backendRunning = Get-NetTCPConnection -LocalPort 5000 -State Listen -ErrorAction SilentlyContinue
if (-not $backendRunning) {
    Write-Host "[2/3] Demarrage du backend (port 5000)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$BackendDir'; Write-Host 'PANI BACKEND' -ForegroundColor Cyan; node dist/index.js"
    )
    Start-Sleep -Seconds 3
} else {
    Write-Host "[2/3] Backend deja actif sur le port 5000. OK" -ForegroundColor Green
}

# 3. Verifier / Demarrer le frontend
$frontendRunning = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue
if (-not $frontendRunning) {
    Write-Host "[3/3] Demarrage du frontend (port 5173)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$FrontendDir'; Write-Host 'PANI FRONTEND' -ForegroundColor Magenta; npx vite --host --port 5173"
    )
    Start-Sleep -Seconds 3
} else {
    Write-Host "[3/3] Frontend deja actif sur le port 5173. OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   PANI GESTION est pret !" -ForegroundColor Green
Write-Host ""
Write-Host "   Navigateur PC:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Sur smartphone: http://192.168.1.100:5173" -ForegroundColor Cyan
Write-Host "   API Backend:    http://192.168.1.100:5000/api" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Identifiants:" -ForegroundColor White
Write-Host "   Email:        admin@pani.com" -ForegroundColor White
Write-Host "   Mot de passe: Admin123!" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

Start-Process "http://localhost:5173"
