@echo off
chcp 65001 >nul 2>nul
title BluePrint Setup
color 0B

echo ==================================================
echo   BluePrint - Engineering Consultancy ERP
echo ==================================================
echo.

REM ============================================
REM Prerequisites
REM ============================================
echo [Checking prerequisites...]

set "RUNNER=node"
set "PKG_MGR=npm"
set "EXEC=npx"

where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 goto :found_bun
goto :check_node

:found_bun
set "RUNNER=bun"
set "PKG_MGR=bun"
set "EXEC=bunx"
echo [OK] Bun found
goto :found_runner

:check_node
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto :no_runner
echo [OK] Node.js found
goto :found_runner

:no_runner
echo [ERROR] Neither Bun nor Node.js found! Please install Node.js.
pause
exit /b 1

:found_runner
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto :no_git
echo [OK] Git found
goto :prereq_done

:no_git
echo [ERROR] Git not found
pause
exit /b 1

:prereq_done
echo.

REM ============================================
REM Step 1: Choose Mode
REM ============================================
echo ================================================
echo   Step 1: Choose Mode
echo ================================================
echo.
echo   [1] Demo Mode
echo   [2] Production Mode
echo.
set "MODE_CHOICE="
set /p MODE_CHOICE="Enter choice (1 or 2, default=1): "
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
set /p DB_CHOICE="Enter choice (1 or 2, default=2): "
if "%DB_CHOICE%"=="" set "DB_CHOICE=2"

REM ============================================
REM Step 3: Generate Secrets
REM ============================================
echo.
echo Step 3: Generating Secrets...
"%RUNNER%" -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" > "%TEMP%\bp_jwt.txt" 2>nul
set /p JWT_SECRET=<"%TEMP%\bp_jwt.txt"
del "%TEMP%\bp_jwt.txt" >nul 2>nul

"%RUNNER%" -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" > "%TEMP%\bp_enc.txt" 2>nul
set /p ENCRYPTION_KEY=<"%TEMP%\bp_enc.txt"
del "%TEMP%\bp_enc.txt" >nul 2>nul

"%RUNNER%" -e "process.stdout.write(require('crypto').randomBytes(48).toString('hex'))" > "%TEMP%\bp_csrf.txt" 2>nul
set /p CSRF_SECRET=<"%TEMP%\bp_csrf.txt"
del "%TEMP%\bp_csrf.txt" >nul 2>nul
echo [OK] Secrets generated

REM ============================================
REM Step 4: Create .env
REM ============================================
echo.
echo Step 4: Creating .env file...
if exist .env copy .env .env.backup >nul

if "%MODE_CHOICE%"=="1" goto :env_demo
goto :env_prod

:env_demo
set "DEMO_MODE=true"
set "NODE_ENV=development"
goto :env_db

:env_prod
set "DEMO_MODE=false"
set "NODE_ENV=production"
goto :env_db

:env_db
if "%DB_CHOICE%"=="1" goto :env_pg
goto :env_sqlite

:env_pg
set "DATABASE_URL=postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"
goto :env_write

:env_sqlite
set "DATABASE_URL=file:./db/custom.db"
goto :env_write

:env_write
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
if %ERRORLEVEL% NEQ 0 goto :error_schema
echo [OK] Prisma schema prepared
goto :step6

:error_schema
echo [ERROR] Failed to prepare Prisma schema!
pause
exit /b 1

:step6
REM ============================================
REM Step 6: Clean old files
REM ============================================
echo.
echo Step 6: Cleaning old files...
if exist .next rmdir /s /q .next
if "%DB_CHOICE%"=="2" if exist db\custom.db del db\custom.db
echo [OK] Cleaned

REM ============================================
REM Step 7: Install dependencies
REM ============================================
echo.
echo Step 7: Installing dependencies (%PKG_MGR% install)...
call %PKG_MGR% install
if %ERRORLEVEL% NEQ 0 goto :error_deps
echo [OK] Dependencies installed
goto :step8

:error_deps
echo [ERROR] Failed to install dependencies!
pause
exit /b 1

:step8
REM ============================================
REM Step 8: Create database tables
REM ============================================
echo.
echo Step 8: Creating Database Tables...
call %EXEC% prisma db push
if %ERRORLEVEL% NEQ 0 goto :error_db
echo [OK] Database schema pushed
goto :step9

:error_db
echo [ERROR] Failed to push database schema!
pause
exit /b 1

:step9
REM ============================================
REM Step 9: Seed data
REM ============================================
echo.
echo Step 9: Seeding data...
if "%MODE_CHOICE%"=="1" goto :run_seed
echo [OK] Skipped demo data for Production Mode
goto :step10

:run_seed
call %EXEC% tsx prisma\seed.ts
if %ERRORLEVEL% NEQ 0 goto :error_seed
echo [OK] Demo data seeded
goto :step10

:error_seed
echo [ERROR] Failed to seed demo data!
pause
exit /b 1

:step10
REM ============================================
REM Step 10: Generate Prisma Client
REM ============================================
echo.
echo Step 10: Generating Prisma Client...
call %EXEC% prisma generate
if %ERRORLEVEL% NEQ 0 goto :error_gen
echo [OK] Prisma Client ready
goto :step11

:error_gen
echo [ERROR] Failed to generate Prisma Client!
pause
exit /b 1

:step11
REM ============================================
REM Step 11: Generate setup token (demo only)
REM ============================================
set "SETUP_TOKEN="
if "%MODE_CHOICE%"=="1" goto :gen_token
goto :show_summary

:gen_token
echo.
echo Step 11: Generating one-time setup token...
echo const crypto = require('crypto');> temp_token.js
echo const token = crypto.randomBytes(24).toString('hex');>> temp_token.js
echo const hash = crypto.createHash('sha256').update(token).digest('hex');>> temp_token.js
echo const fs = require('fs');>> temp_token.js
echo const now = Date.now();>> temp_token.js
echo const data = { version: 1, tokens: [{ hash: hash, createdAt: now, consumed: false }], updatedAt: new Date().toISOString() };>> temp_token.js
echo fs.writeFileSync('.setup-tokens.json', JSON.stringify(data, null, 2));>> temp_token.js
echo process.stdout.write(token);>> temp_token.js

"%RUNNER%" temp_token.js > temp_token_out.txt 2>nul
if %ERRORLEVEL% NEQ 0 goto :error_token
set /p SETUP_TOKEN=<temp_token_out.txt
del temp_token.js >nul 2>nul
del temp_token_out.txt >nul 2>nul
echo [OK] Setup token generated
goto :show_summary

:error_token
echo [ERROR] Failed to generate setup token!
if exist temp_token.js del temp_token.js
if exist temp_token_out.txt del temp_token_out.txt
pause
exit /b 1

:show_summary
REM ============================================
REM Summary
REM ============================================
echo.
echo ==================================================
echo           [OK] Setup Complete!
echo ==================================================
echo.
if "%MODE_CHOICE%"=="1" goto :sum_demo
goto :sum_prod

:sum_demo
echo   Mode:     DEMO
goto :sum_db

:sum_prod
echo   Mode:     PRODUCTION
goto :sum_db

:sum_db
if "%DB_CHOICE%"=="1" goto :sum_pg
goto :sum_sqlite

:sum_pg
echo   Database: PostgreSQL
goto :sum_url

:sum_sqlite
echo   Database: SQLite
goto :sum_url

:sum_url
echo   URL:      http://localhost:3000
echo.
if "%MODE_CHOICE%"=="1" goto :show_demo_info
goto :show_prod_info

:show_demo_info
echo [SECURE] To view demo login credentials:
echo   1. Open http://localhost:3000/setup-complete
echo   2. Enter this token (one-time use):
echo      %SETUP_TOKEN%
echo.
goto :ask_start

:show_prod_info
echo [WARN] Edit .env to configure SMTP and Stripe keys before going live.
echo.
goto :ask_start

:ask_start
set "START_DEV="
set /p START_DEV="Start server now? (y/n, default=y): "
if "%START_DEV%"=="" set "START_DEV=y"
if /i "%START_DEV%"=="y" call %PKG_MGR% run dev
if /i not "%START_DEV%"=="y" pause

exit /b 0
