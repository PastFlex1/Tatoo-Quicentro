<#
  Tatoo-Quicentro: registra una tarea de Windows para que el sistema arranque solo
  al iniciar sesion. Asi la sincronizacion automatica con el SRI funciona sin abrir nada.

  Ejecutar (una vez) en PowerShell, desde la carpeta del proyecto:
      powershell -ExecutionPolicy Bypass -File scripts\windows\instalar-inicio-automatico.ps1

  - No requiere permisos de administrador (la tarea es del usuario actual).
  - Se reinicia sola si el servidor se cae (hasta 3 veces, cada 1 minuto).
  - Para quitarla: scripts\windows\desinstalar-inicio-automatico.ps1
#>
$ErrorActionPreference = 'Stop'
$nombreTarea = 'Tatoo-Quicentro Servidor'
$vbs = Join-Path $PSScriptRoot 'iniciar-oculto.vbs'
$proyecto = Resolve-Path (Join-Path $PSScriptRoot '..\..')

if (-not (Test-Path $vbs)) { throw "No se encontro $vbs" }
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'No se encontro Node.js/npm. Instale Node.js 18 o superior.' }

$mongo = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if (-not $mongo) {
  Write-Warning 'No se encontro el servicio "MongoDB". Instale MongoDB Community Server como servicio de Windows.'
} elseif ($mongo.StartType -ne 'Automatic') {
  Write-Warning 'El servicio MongoDB no inicia automaticamente. Para cambiarlo (como administrador): Set-Service MongoDB -StartupType Automatic'
}

if (-not (Test-Path (Join-Path $proyecto '.env'))) {
  Write-Warning 'No existe el archivo .env. Configure al menos EMPRESA_RUC y SRI_SECRET_KEY (ver docs\SRI-COMPROBANTES-RECIBIDOS.md).'
}

$accion = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$vbs`"" -WorkingDirectory $proyecto
$disparador = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
# Pequena espera para que red y MongoDB esten listos
$disparador.Delay = 'PT30S'
$ajustes = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $nombreTarea -Action $accion -Trigger $disparador -Settings $ajustes -Principal $principal `
  -Description 'Inicia el servidor de Tatoo-Quicentro (POS, SRI y sincronizacion de comprobantes recibidos).' -Force | Out-Null

Write-Host "Tarea '$nombreTarea' registrada." -ForegroundColor Green
Write-Host 'El sistema se iniciara automaticamente al iniciar sesion en Windows.'
Write-Host "Para iniciarlo ahora:  Start-ScheduledTask -TaskName '$nombreTarea'"
Write-Host "Registro del servidor: $proyecto\logs\servidor.log"
