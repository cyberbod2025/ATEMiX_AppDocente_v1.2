# Configurar estrategia si no está definida
$estrategia = git config pull.rebase
if (-not $estrategia) {
    git config pull.rebase false
    Write-Host "Estrategia de pull configurada como 'merge' (pull.rebase=false)" -ForegroundColor Cyan
}

# Ejecutar pull
git pull --tags origin master
if ($LASTEXITCODE -eq 0) {
    Write-Host "Pull exitoso." -ForegroundColor Green
} else {
    Write-Host "Error al hacer pull. Revisa conflictos o configuracion." -ForegroundColor Red
}