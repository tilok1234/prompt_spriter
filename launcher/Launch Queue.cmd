@echo off
setlocal
set "LAUNCHER_ROOT=%~dp0"
start "" "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -STA -WindowStyle Hidden -ExecutionPolicy Bypass -File "%LAUNCHER_ROOT%app\queue-launcher.ps1"
endlocal
