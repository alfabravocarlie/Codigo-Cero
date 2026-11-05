@echo off
chcp 65001 >nul
title Código Cero
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo.
  echo  No se encontro Python. Instala Python 3.10 o superior desde python.org
  echo  y vuelve a ejecutar este archivo.
  echo.
  pause
  exit /b 1
)

python run.py %*
if errorlevel 1 (
  echo.
  echo  La aplicacion se cerro con un error. Revisa el mensaje de arriba.
  pause
)
