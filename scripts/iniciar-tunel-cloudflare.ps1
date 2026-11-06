# ==============================================================================
# Script Automatico de Cloudflare Tunnel para Devolution Ink Tattoo Studio
# ==============================================================================
$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  DEVOLUTION INK TATTOO STUDIO - CLOUDFLARE TUNNEL" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

# 1. Buscar o descargar cloudflared.exe localmente
$CloudflaredPath = Join-Path $ProjectRoot "cloudflared.exe"
$SystemCloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue

if ($SystemCloudflared) {
    $CloudflaredBin = $SystemCloudflared.Source
    Write-Host "[OK] cloudflared detectado en el sistema: $CloudflaredBin" -ForegroundColor Green
} elseif ((Test-Path $CloudflaredPath) -and ((Get-Item $CloudflaredPath).Length -gt 15000000)) {
    $CloudflaredBin = $CloudflaredPath
    Write-Host "[OK] cloudflared detectado en el proyecto: $CloudflaredBin" -ForegroundColor Green
} else {
    Write-Host "[INFO] Descargando cliente oficial de Cloudflare Tunnel (cloudflared-windows-amd64.exe)..." -ForegroundColor Yellow
    $ProgressPreference = 'SilentlyContinue'
    $DownloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    & curl.exe -sL $DownloadUrl -o $CloudflaredPath
    $CloudflaredBin = $CloudflaredPath
    Write-Host "[OK] cloudflared descargado exitosamente." -ForegroundColor Green
}

# 2. Verificar si el puerto 3000 ya esta activo; si no, iniciar el servidor en segundo plano
$PortActive = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
$ServerProcess = $null

if (-not $PortActive) {
    if (-not (Test-Path (Join-Path $ProjectRoot "dist\index.html"))) {
        Write-Host "[INFO] Compilando aplicacion (npm run build)..." -ForegroundColor Yellow
        npm run build
    }
    Write-Host "[INFO] Iniciando servidor local en http://localhost:3000 ..." -ForegroundColor Cyan
    $ServerProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run server" -WorkingDirectory $ProjectRoot -PassThru -WindowStyle Minimized
    Start-Sleep -Seconds 3
} else {
    Write-Host "[OK] Servidor ya activo en http://localhost:3000" -ForegroundColor Green
}

Write-Host ""
Write-Host "[TUNNEL] Abriendo tunel seguro con Cloudflare (https://*.trycloudflare.com)..." -ForegroundColor Magenta
Write-Host "         Copia el enlace https://....trycloudflare.com que aparecera abajo." -ForegroundColor Gray
Write-Host "         Presiona Ctrl+C cuando desees cerrar el tunel." -ForegroundColor Gray
Write-Host ""

try {
    & $CloudflaredBin tunnel --url http://localhost:3000
} finally {
    if ($ServerProcess -and -not $ServerProcess.HasExited) {
        Write-Host "`n[INFO] Cerrando servidor local iniciado por el tunel..." -ForegroundColor Yellow
        Stop-Process -Id $ServerProcess.Id -Force -ErrorAction SilentlyContinue
    }
}
