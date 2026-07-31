@echo off
setlocal
title Prompt Spriter Viewer

set "PROJECT_DIR=C:\Users\headc\Documents\prompt_spriter"

if not exist "%PROJECT_DIR%\package.json" (
  echo.
  echo Prompt Spriter could not be found at:
  echo %PROJECT_DIR%
  echo.
  echo If the project was moved, update PROJECT_DIR in this launcher.
  goto :failed
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo.
  echo npm.cmd was not found. Install Node.js before opening Prompt Spriter.
  goto :failed
)

cd /d "%PROJECT_DIR%"

if not exist "node_modules\" (
  echo Installing Prompt Spriter dependencies for the first launch...
  call npm.cmd ci
  if errorlevel 1 goto :failed
)

if /i "%~1"=="--check" (
  echo Prompt Spriter launcher check passed.
  exit /b 0
)

echo.
echo Starting Prompt Spriter...
echo The viewer will open in your default browser when it is ready.
echo Keep this window open while using the viewer.
echo Close this window or press Ctrl+C to stop it.
echo.

call npm.cmd run dev -- --host 127.0.0.1 --port 4174 --open
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo Prompt Spriter did not start.
pause
exit /b 1
