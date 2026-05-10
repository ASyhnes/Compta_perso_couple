# Script de déploiement automatique en production
# Usage: .\deploy-prod.ps1

$ErrorActionPreference = "Stop"
$gitPath = "C:\Program Files\Git\bin\git.exe"
$projectPath = "C:\Users\Hora\Desktop\Code\Apli_compta"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "🚀 DÉPLOIEMENT EN PRODUCTION" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier qu'on est dans le bon dossier
Set-Location $projectPath
Write-Host "📁 Dossier: $projectPath" -ForegroundColor Green

# Étape 1: Git Status
Write-Host ""
Write-Host "📊 État actuel de Git..." -ForegroundColor Yellow
& $gitPath status

# Étape 2: Git Add
Write-Host ""
Write-Host "➕ Ajout des fichiers modifiés..." -ForegroundColor Yellow
& $gitPath add .

# Étape 3: Git Commit
Write-Host ""
Write-Host "💾 Création du commit..." -ForegroundColor Yellow
$commitMessage = "Fix: Correction des graphiques vides - Ajout requetes SQL manquantes"

& $gitPath commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Aucun changement à commiter ou erreur" -ForegroundColor Yellow
}

# Étape 4: Git Push
Write-Host ""
Write-Host "☁️  Push vers GitHub..." -ForegroundColor Yellow
& $gitPath push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du push. Vérifiez votre connexion GitHub." -ForegroundColor Red
    Write-Host "Vous devrez peut-être vous authentifier." -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Code poussé sur GitHub avec succès!" -ForegroundColor Green

# Étape 5: Déploiement sur le serveur
Write-Host ""
Write-Host "🌐 Déploiement sur le serveur 152.228.133.44..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  ATTENTION: Vous allez devoir entrer le mot de passe SSH" -ForegroundColor Yellow
Write-Host ""

ssh root@152.228.133.44 "cd /var/www/Compta_perso_couple && git pull origin main && pm2 restart compta-couple && pm2 status"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "✅ DÉPLOIEMENT RÉUSSI!" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Application accessible sur:" -ForegroundColor Cyan
    Write-Host "   http://152.228.133.44" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
    Write-Host "   1. Ouvrir http://152.228.133.44 dans votre navigateur" -ForegroundColor White
    Write-Host "   2. Se connecter (david/david)" -ForegroundColor White
    Write-Host "   3. Recharger avec Ctrl+Shift+R" -ForegroundColor White
    Write-Host "   4. Vérifier que les 4 graphiques s'affichent" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ ERREUR lors du déploiement sur le serveur" -ForegroundColor Red
    Write-Host "Vérifiez:" -ForegroundColor Yellow
    Write-Host "  - Votre connexion SSH" -ForegroundColor White
    Write-Host "  - Le mot de passe du serveur" -ForegroundColor White
    Write-Host "  - Que l'application est dans /var/www/Compta_perso_couple" -ForegroundColor White
    exit 1
}
