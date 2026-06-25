@echo off
REM BluePrint Setup - Windows Batch Script
REM Safe version: no goto inside if() blocks, no EnableDelayedExpansion needed
REM for the main flow. Uses subroutines (call :label) for branching.

chcp 65001 >nul 2>nul
title BluePrint Setup
color 0B

echo ==================================================
echo   BluePrint - Engineering Consultancy ERP
echo ==================================================
echo.

REM ============================================
REM Prerequisites Check
REM ============================================
echo [Checking prerequisites...]

set "RUNNER="
set "PKG_MGR="
set "EXEC="
set "FOUND_RUNNER=0"

where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 set "FOUND_RUNNER=1"
if "%FOUND_RUNNER%"=="1" (
    set "RUNNER=bun"
    set "PKG_MGR=bun"
    set "EXEC=bunx"
    echo [OK] Bun found
)
if "%FOUND_RUNNER%"=="1" goto :check_git

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 set "FOUND_RUNNER=1"
if "%FOUND_RUNNER%"=="1" (
    set "RUNNER=node"
    set "PKG_MGR=npm"
    set "EXEC=npx"
    echo [OK] Node.js found
)
if "%FOUND_RUNNER%"=="1" goto :check_git

echo [ERROR] Neither Bun nor Node.js found! Please install Node.js.
pause
exit /b 1

:check_git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git not found
    pause
    exit /b 1
)
echo [OK] Git found
echo [OK] OpenSSL / Crypto ready
echo.

REM ============================================
REM Step 1: Choose Mode
REM ============================================
echo ================================================
echo   Step 1: Choose Mode
echo ================================================
echo.
echo   [1] Demo Mode
echo       - Auto-filled login credentials
echo       - Sample projects, invoices, tasks
echo.
echo   [2] Production Mode
echo       - Requires SMTP for email
echo       - No demo data
echo.
set "MODE_CHOICE="
set /p "MODE_CHOICE=Enter choice (1 or 2, default=1): "
if "%MODE_CHOICE%"=="" set "MODE_CHOICE=1"

REM ============================================
REM Step 2: Choose Database
REM ============================================
echo.
echo ================================================
echo   Step 2: Choose Database
echo ================================================
echo.
echo   [1] PostgreSQL - For production
echo   [2] SQLite - For quick demo
echo.
set "DB_CHOICE="
set /p "DB_CHOICE=Enter choice (1 or 2, default=2): "
if "%DB_CHOICE%"=="" set "DB_CHOICE=2"

REM ============================================
REM Step 3: Generate Secrets (using Node.js, not PowerShell)
REM ============================================
echo.
echo Step 3: Generating Secrets...
REM Use Node.js to generate random hex strings - more reliable than PowerShell
"%RUNNER%" -e "const c=require('crypto');process.stdout.write(c.randomBytes(48).toString('hex'))" > "%TEMP%\bp_jwt.txt" 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate JWT secret!
    pause
    exit /b 1
)
set /p "JWT_SECRET=" < "%TEMP%\bp_jwt.txt"
del "%TEMP%\bp_jwt.txt" >nul 2>nul

"%RUNNER%" -e "const c=require('crypto');process.stdout.write(c.randomBytes(48).toString('hex'))" > "%TEMP%\bp_enc.txt" 2>nul
set /p "ENCRYPTION_KEY=" < "%TEMP%\bp_enc.txt"
del "%TEMP%\bp_enc.txt" >nul 2>nul

"%RUNNER%" -e "const c=require('crypto');process.stdout.write(c.randomBytes(48).toString('hex'))" > "%TEMP%\bp_csrf.txt" 2>nul
set /p "CSRF_SECRET=" < "%TEMP%\bp_csrf.txt"
del "%TEMP%\bp_csrf.txt" >nul 2>nul

echo [OK] Secrets generated

REM ============================================
REM Step 4: Create .env file
REM ============================================
echo.
echo Step 4: Creating .env file...
if exist .env (
    copy .env .env.backup >nul
    echo [OK] Old .env backed up to .env.backup
)

REM Set mode variables (no if() blocks - use direct assignment with goto)
if "%MODE_CHOICE%"=="1" goto :set_demo
if "%MODE_CHOICE%"=="2" goto :set_prod
REM Default to demo
goto :set_demo

:set_demo
set "DEMO_MODE=true"
set "NODE_ENV=development"
goto :set_db

:set_prod
set "DEMO_MODE=false"
set "NODE_ENV=production"
goto :set_db

:set_db
if "%DB_CHOICE%"=="1" goto :set_pg
if "%DB_CHOICE%"=="2" goto :set_sqlite
REM Default to sqlite
goto :set_sqlite

:set_pg
set "DATABASE_URL=postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"
goto :write_env

:set_sqlite
set "DATABASE_URL=file:./db/custom.db"
goto :write_env

:write_env
REM Write .env file line by line (no parenthesis block - avoids parser issues)
echo DATABASE_URL=%DATABASE_URL%> .env
echo JWT_SECRET="%JWT_SECRET%">> .env
echo NEXTAUTH_SECRET="%JWT_SECRET%">> .env
echo CSRF_SECRET="%CSRF_SECRET%">> .env
echo ENCRYPTION_KEY="%ENCRYPTION_KEY%">> .env
echo DEMO_MODE=%DEMO_MODE%>> .env
echo NODE_ENV=%NODE_ENV%>> .env
echo NEXTAUTH_URL="http://localhost:3000">> .env
echo SMTP_HOST="">> .env
echo SMTP_PORT="587">> .env
echo SMTP_USER="">> .env
echo SMTP_PASS="">> .env
echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="">> .env
echo STRIPE_SECRET_KEY="">> .env
echo STRIPE_WEBHOOK_SECRET="">> .env
echo [OK] .env configured

REM ============================================
REM Step 5: Prepare Prisma schema
REM ============================================
echo.
echo Step 5: Preparing Prisma schema...
"%RUNNER%" scripts\prepare-schema.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to prepare Prisma schema!
    pause
    exit /b 1
)
echo [OK] Prisma schema prepared

REM ============================================
REM Step 6: Clean old files
REM ============================================
echo.
echo Step 6: Cleaning old files...
if exist .next rmdir /s /q .next
if "%DB_CHOICE%"=="2" (
    if exist db\custom.db del db\custom.db
)
echo [OK] Cleaned

REM ============================================
REM Step 7: Install dependencies
REM ============================================
echo.
echo Step 7: Installing dependencies (%PKG_MGR% install)...
call %PKG_MGR% install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies installed

REM ============================================
REM Step 8: Create database tables
REM ============================================
echo.
echo Step 8: Creating Database Tables...
call %EXEC% prisma db push
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to push database schema!
    pause
    exit /b 1
)
echo [OK] Database schema pushed

REM ============================================
REM Step 9: Seed data (only in demo mode)
REM ============================================
echo.
echo Step 9: Seeding data...
if "%MODE_CHOICE%"=="1" goto :run_seeding
echo [OK] Skipped demo data for Production Mode
goto :after_seeding

:run_seeding
call %EXEC% tsx prisma\seed.ts
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to seed demo data!
    pause
    exit /b 1
)
echo [OK] Demo data seeded
goto :after_seeding

:after_seeding

REM ============================================
REM Step 10: Generate Prisma Client
REM ============================================
echo.
echo Step 10: Generating Prisma Client...
call %EXEC% prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate Prisma Client!
    pause
    exit /b 1
)
echo [OK] Prisma Client ready

REM ============================================
REM Step 11: Generate setup token (demo mode only)
REM ============================================
set "SETUP_TOKEN="
if "%MODE_CHOICE%"=="1" goto :generate_token
goto :after_token

:generate_token
echo.
echo Step 11: Generating one-time setup token...
REM Write the JS file line by line using >> (no parenthesis block)
echo const crypto = require('crypto');> temp_token.js
echo const token = crypto.randomBytes(24).toString('hex');>> temp_token.js
echo const hash = crypto.createHash('sha256').update(token).digest('hex');>> temp_token.js
echo const fs = require('fs');>> temp_token.js
echo const now = Date.now();>> temp_token.js
echo const data = { version: 1, tokens: [{ hash: hash, createdAt: now, consumed: false }], updatedAt: new Date().toISOString() };>> temp_token.js
echo fs.writeFileSync('.setup-tokens.json', JSON.stringify(data, null, 2));>> temp_token.js
echo process.stdout.write(token);>> temp_token.js

"%RUNNER%" temp_token.js > temp_token_output.txt 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to generate setup token!
    if exist temp_token.js del temp_token.js
    if exist temp_token_output.txt del temp_token_output.txt
    pause
    exit /b 1
)
set /p "SETUP_TOKEN=" < temp_token_output.txt
del temp_token.js >nul 2>nul
del temp_token_output.txt >nul 2>nul
echo [OK] Setup token generated
goto :after_token

:after_token

REM ============================================
REM Display completion
REM ============================================
echo.
echo ==================================================
echo           [OK] Setup Complete!
echo ==================================================
echo.
echo ----------------------------------------------
if "%MODE_CHOICE%"=="1" (
    echo   Mode:     DEMO
) else (
    echo   Mode:     PRODUCTION
)
echo   URL:      http://localhost:3000
if "%DB_CHOICE%"=="1" (
    echo   Database: PostgreSQL
) else (
    echo   Database: SQLite
)
echo ----------------------------------------------
echo.

REM Branch to demo or prod display (goto is NOT inside any if() block)
if "%MODE_CHOICE%"=="1" goto :show_demo
if "%MODE_CHOICE%"=="2" goto :show_prod
goto :show_prod

:show_demo
echo [SECURE] To view demo login credentials:
echo.
echo   1. Open this URL in your browser:
echo      http://localhost:3000/setup-complete
echo.
echo   2. Enter the following setup token (one-time use only):
echo.
echo      %SETUP_TOKEN%
echo.
echo   [!] Save this token now - it will not be shown again.
echo       The token is valid for 24 hours from now.
echo.
goto :ask_start

:show_prod
echo [WARN] NOTE FOR PRODUCTION:
echo Please edit .env to configure your SMTP and Stripe keys before going live.
echo.
REM Fall through to :ask_start (no goto needed)

:ask_start
set "START_DEV="
set /p "START_DEV=Start server now? (y/n, default=y): "
if "%START_DEV%"=="" set "START_DEV=y"
if /i "%START_DEV%"=="y" (
    call %PKG_MGR% run dev
) else (
    echo.
    echo Setup complete. Press any key to exit...
    pause >nul
)

exit /b 0
