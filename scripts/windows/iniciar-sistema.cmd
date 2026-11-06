@echo off
REM ============================================================================
REM  Tatoo-Quicentro: inicia el servidor del sistema (POS + SRI + sincronizacion)
REM  - Si no existe la version compilada (dist), la compila una vez.
REM  - Guarda el registro en logs\servidor.log
REM  Uso manual: doble clic. Uso automatico: lo llama la tarea de Windows.
REM ============================================================================
setlocal
cd /d "%~dp0..\.."

if not exist logs mkdir logs

REM Espera a que el servicio MongoDB este iniciado (maximo ~60 s tras encender el equipo)
set /a intentos=0
:esperar_mongo
sc query MongoDB | find "RUNNING" >nul
if %errorlevel%==0 goto mongo_listo
set /a intentos+=1
if %intentos% GEQ 12 goto mongo_listo
timeout /t 5 /nobreak >nul
goto esperar_mongo
:mongo_listo

if not exist dist\index.html (
  echo [%date% %time%] Compilando el sistema por primera vez... >> logs\servidor.log
  call npm run build >> logs\servidor.log 2>&1
)

echo [%date% %time%] Iniciando servidor en el puerto 3000 >> logs\servidor.log
set PORT=3000
call npm run server >> logs\servidor.log 2>&1
endlocal
