@echo off
chcp 65001 >nul
title BluePrint Setup
color 0B

echo ==================================================
echo   BluePrint - Engineering Consultancy ERP
echo ==================================================
echo.

echo [Checking prerequisites...]
where bun >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set RUNNER=bun
    set PKG_MGR=bun
    set EXEC=bunx
    echo [OK] Bun found
    goto check_git
)

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    set RUNNER=node
    set PKG_MGR=npm
    set EXEC=npx
    echo [OK] Node.js found ^(Fallback from Bun^)
    goto check_git
)

echo [ERROR] Neither Bun nor Node.js found! Please install Node.js.
pause
exit /b 1

:check_git
where git >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git not found
    pause
    exit /b 1
) else (
    echo [OK] Git found
)

echo [OK] OpenSSL / Crypto ready
echo.

echo ================================================
echo   Step 1: Choose Mode - اختار الوضع
echo ================================================
echo.
echo   [1] Demo Mode - وضع العرض التجريبي
echo       - Auto-filled login credentials
echo       - Sample projects, invoices, tasks
echo.
echo   [2] Production Mode - وضع الإنتاج
echo       - Requires SMTP for email
echo       - No demo data
echo.
set /p MODE_CHOICE="Enter choice (1 or 2, default=1): "
if "%MODE_CHOICE%"=="" set MODE_CHOICE=1

echo.
echo ================================================
echo   Step 2: Choose Database - اختار قاعدة البيانات
echo ================================================
echo.
echo   [1] PostgreSQL - للإنتاج
echo   [2] SQLite - للتجربة السريعة
echo.
set /p DB_CHOICE="Enter choice (1 or 2, default=2): "
if "%DB_CHOICE%"=="" set DB_CHOICE=2

echo.
echo Step 3: Generating Secrets...
echo const crypto = require('crypto'); console.log(crypto.randomBytes(32).toString('hex')); > temp_crypto.js
for /f "delims=" %%i in ('%RUNNER% temp_crypto.js') do set JWT_SECRET=%%i
for /f "delims=" %%i in ('%RUNNER% temp_crypto.js') do set ENCRYPTION_KEY=%%i
for /f "delims=" %%i in ('%RUNNER% temp_crypto.js') do set CSRF_SECRET=%%i
del temp_crypto.js
echo [OK] Secrets generated

echo.
echo Step 4: Creating .env file...
if exist .env (
    copy .env .env.backup >nul
    echo [OK] Old .env backed up to .env.backup
)

if "%MODE_CHOICE%"=="1" (
    set DEMO_MODE=true
    set NODE_ENV=development
) else (
    set DEMO_MODE=false
    set NODE_ENV=production
)

if "%DB_CHOICE%"=="1" (
    set DATABASE_URL=postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public
) else (
    set DATABASE_URL=file:./db/custom.db
)

(
echo DATABASE_URL=%DATABASE_URL%
echo JWT_SECRET="%JWT_SECRET%"
echo NEXTAUTH_SECRET="%JWT_SECRET%"
echo CSRF_SECRET="%CSRF_SECRET%"
echo ENCRYPTION_KEY="%ENCRYPTION_KEY%"
echo DEMO_MODE=%DEMO_MODE%
echo NODE_ENV=%NODE_ENV%
echo NEXTAUTH_URL="http://localhost:3000"
echo SMTP_HOST=""
echo SMTP_PORT="587"
echo SMTP_USER=""
echo SMTP_PASS=""
echo NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
echo STRIPE_SECRET_KEY=""
echo STRIPE_WEBHOOK_SECRET=""
) > .env
echo [OK] .env configured

echo.
echo Step 5: Preparing Prisma schema...
node scripts\prepare-schema.js
echo [OK] Prisma schema prepared

echo.
echo Step 6: Cleaning old files...
if exist .next rmdir /s /q .next
if "%DB_CHOICE%"=="2" (
    if exist db\custom.db del db\custom.db
)
echo [OK] Cleaned

echo.
echo Step 7: Installing dependencies (%PKG_MGR% install)...
call %PKG_MGR% install
echo [OK] Dependencies installed

echo.
echo Step 8: Creating Database Tables...
call %EXEC% prisma db push
echo [OK] Database schema pushed

echo.
echo Step 9: Seeding data...
if "%MODE_CHOICE%"=="1" (
    call %EXEC% tsx prisma/seed.ts
    echo [OK] Demo data seeded
) else (
    echo [OK] Skipped demo data for Production Mode
)

echo.
echo Step 10: Generating Prisma Client...
call %EXEC% prisma generate
echo [OK] Prisma Client ready

echo.
echo ==================================================
echo           [OK] Setup Complete! - تم الإعداد!
echo ==================================================
echo.
echo ----------------------------------------------
if "%MODE_CHOICE%"=="1" (
    echo   Mode:     DEMO - عرض تجريبي
) else (
    echo   Mode:     PRODUCTION - وضع الإنتاج
)
echo   URL:      http://localhost:3000
if "%MODE_CHOICE%"=="1" (
    echo   Email:    admin@blueprint.ae
    echo   Password: Admin@BP2024!
)
if "%DB_CHOICE%"=="1" (
    echo   Database: PostgreSQL
) else (
    echo   Database: SQLite
)
echo ----------------------------------------------
echo.
if "%MODE_CHOICE%"=="2" (
    echo [WARN] NOTE FOR PRODUCTION:
    echo Please edit .env to configure your SMTP and Stripe keys before going live.
    echo.
)

set /p START_DEV="Start server now? (y/n, default=y): "
if "%START_DEV%"=="" set START_DEV=y
if /i "%START_DEV%"=="y" (
    call %PKG_MGR% run dev
)
