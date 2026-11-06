<#
  Quita la tarea de inicio automatico de Tatoo-Quicentro.
      powershell -ExecutionPolicy Bypass -File scripts\windows\desinstalar-inicio-automatico.ps1
#>
$nombreTarea = 'Tatoo-Quicentro Servidor'
if (Get-ScheduledTask -TaskName $nombreTarea -ErrorAction SilentlyContinue) {
  Stop-ScheduledTask -TaskName $nombreTarea -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $nombreTarea -Confirm:$false
  Write-Host "Tarea '$nombreTarea' eliminada." -ForegroundColor Green
} else {
  Write-Host "No existe la tarea '$nombreTarea'."
}
