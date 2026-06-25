@echo off
REM BluePrint Setup - Simple launcher
REM All setup logic is in scripts/setup.js (Node.js) to avoid cmd.exe parser issues.
REM This batch file just finds Node/Bun and runs the script.

title BluePrint Setup

REM Find Node.js or Bun
where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 goto :run_bun

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto :error

:run_node
node scripts\setup.js
goto :done

:run_bun
bun scripts\setup.js
goto :done

:error
echo [ERROR] Neither Bun nor Node.js found!
echo Please install Node.js from https://nodejs.org/
pause
exit /b 1

:done
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Setup failed. See messages above.
    pause
)
exit /b %ERRORLEVEL%
