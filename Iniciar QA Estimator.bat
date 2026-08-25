@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js/npm nao encontrado neste computador.
  echo Instale o Node.js em https://nodejs.org antes de continuar.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo Primeira execucao: instalando dependencias, isso pode levar alguns minutos...
  call npm install
  if errorlevel 1 (
    echo.
    echo [ERRO] Falha ao instalar dependencias. Verifique sua conexao com a internet.
    echo.
    pause
    exit /b 1
  )
)

echo Iniciando QA Estimator...
call npm start

if errorlevel 1 (
  echo.
  echo [ERRO] O aplicativo fechou com erro. Veja as mensagens acima.
  pause
)
