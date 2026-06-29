@echo off
chcp 65001 >nul 2>nul
title BluePrint Setup
color 0B

echo ==================================================
echo   BluePrint - Engineering Consultancy ERP
echo ==================================================
echo.
echo [INFO] Starting setup...
echo.

REM Find Node.js or Bun
where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 goto :run_bun

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto :error

:run_node
echo [INFO] Using Node.js
node scripts\setup.js
echo.
echo ================================================
echo Setup script finished (exit code: %ERRORLEVEL%)
echo ================================================
pause
exit /b %ERRORLEVEL%

:run_bun
echo [INFO] Using Bun
bun scripts\setup.js
echo.
echo ================================================
echo Setup script finished (exit code: %ERRORLEVEL%)
echo ================================================
pause
exit /b %ERRORLEVEL%

:error
echo [ERROR] Neither Bun nor Node.js found!
echo Please install Node.js from https://nodejs.org/
pause
exit /b 1
