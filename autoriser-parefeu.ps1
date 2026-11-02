# PANI GESTION - Autorisation du Pare-Feu Windows (Ports 5000 et 5173)
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Demande d'elevation administrateur..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "Ouverture des ports 5000 et 5173 dans le Pare-Feu Windows..." -ForegroundColor Cyan

# Supprimer anciennes regles si existantes
Remove-NetFirewallRule -DisplayName "PANI-*" -ErrorAction SilentlyContinue

# Creer les regles
New-NetFirewallRule -DisplayName "PANI-API-5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow -Profile Any | Out-Null
New-NetFirewallRule -DisplayName "PANI-UI-5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Any | Out-Null

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  SUCCES : Les ports 5000 et 5173 sont maintenant ouverts !" -ForegroundColor Green
Write-Host "  Votre smartphone peut desormais se connecter au PC via Wi-Fi." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Start-Sleep -Seconds 5

