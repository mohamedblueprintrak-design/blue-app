@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title BluePrint Setup
color 0B

echo ==================================================
echo   BluePrint - Engineering Consultancy ERP
echo ==================================================
echo.

echo [Checking prerequisites...]
where bun >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    set "RUNNER=bun"
    set "PKG_MGR=bun"
    set "EXEC=bunx"
    echo [OK] Bun found
    goto check_git
)

where node >nul 2>nul
if !ERRORLEVEL! EQU 0 (
    set "RUNNER=node"
    set "PKG_MGR=npm"
    set "EXEC=npx"
    echo [OK] Node.js found ^(Fallback from Bun^)
    goto check_git
)

echo [ERROR] Neither Bun nor Node.js found! Please install Node.js.
pause
exit /b 1

:check_git
where git >nul 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Git not found
    pause
    exit /b 1
) else (
    echo [OK] Git found
)

echo [OK] OpenSSL / Crypto ready
echo.

echo ================================================
echo   Step 1: Choose Mode - Choose Mode
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
set /p "MODE_CHOICE=Enter choice (1 or 2, default=1): "
if "!MODE_CHOICE!"=="" set "MODE_CHOICE=1"

echo.
echo ================================================
echo   Step 2: Choose Database - Choose Database
echo ================================================
echo.
echo   [1] PostgreSQL - For production
echo   [2] SQLite - For quick demo
echo.
set /p "DB_CHOICE=Enter choice (1 or 2, default=2): "
if "!DB_CHOICE!"=="" set "DB_CHOICE=2"

echo.
echo Step 3: Generating Secrets...
for /f "delims=" %%i in ('powershell -NoProfile -Command "([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))"') do set "JWT_SECRET=%%i"
for /f "delims=" %%i in ('powershell -NoProfile -Command "([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))"') do set "ENCRYPTION_KEY=%%i"
for /f "delims=" %%i in ('powershell -NoProfile -Command "([Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N'))"') do set "CSRF_SECRET=%%i"
echo [OK] Secrets generated

echo.
echo Step 4: Creating .env file...
if exist .env (
    copy .env .env.backup >nul
    echo [OK] Old .env backed up to .env.backup
)

if "!MODE_CHOICE!"=="1" (
    set "DEMO_MODE=true"
    set "NODE_ENV=development"
) else (
    set "DEMO_MODE=false"
    set "NODE_ENV=production"
)

if "!DB_CHOICE!"=="1" (
    set "DATABASE_URL=postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"
) else (
    set "DATABASE_URL=file:./db/custom.db"
)

(
echo DATABASE_URL=!DATABASE_URL!
echo JWT_SECRET="!JWT_SECRET!"
echo NEXTAUTH_SECRET="!JWT_SECRET!"
echo CSRF_SECRET="!CSRF_SECRET!"
echo ENCRYPTION_KEY="!ENCRYPTION_KEY!"
echo DEMO_MODE=!DEMO_MODE!
echo NODE_ENV=!NODE_ENV!
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
"!RUNNER!" scripts\prepare-schema.js
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to prepare Prisma schema!
    pause
    exit /b 1
)
echo [OK] Prisma schema prepared

echo.
echo Step 6: Cleaning old files...
if exist .next rmdir /s /q .next
if "!DB_CHOICE!"=="2" (
    if exist db\custom.db del db\custom.db
)
echo [OK] Cleaned

echo.
echo Step 7: Installing dependencies (!PKG_MGR! install)...
call !PKG_MGR! install
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to install dependencies!
    pause
    exit /b 1
)
echo [OK] Dependencies installed

echo.
echo Step 8: Creating Database Tables...
call !EXEC! prisma db push
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to push database schema!
    pause
    exit /b 1
)
echo [OK] Database schema pushed

echo.
echo Step 9: Seeding data...
if "!MODE_CHOICE!"=="1" goto run_seeding
echo [OK] Skipped demo data for Production Mode
goto post_seeding

:run_seeding
call !EXEC! tsx prisma/seed.ts
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to seed demo data!
    pause
    exit /b 1
)
echo [OK] Demo data seeded

:post_seeding

echo.
echo Step 10: Generating Prisma Client...
call !EXEC! prisma generate
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to generate Prisma Client!
    pause
    exit /b 1
)
echo [OK] Prisma Client ready

set "SETUP_TOKEN="
if "!MODE_CHOICE!"=="1" goto generate_token
goto post_token

:generate_token
echo.
echo Step 11: Generating one-time setup token...
REM Write the token generator script to a temp file using a heredoc-style approach.
REM We use a JS file written line-by-line, escaping parentheses with ^ to avoid
REM breaking the cmd parser. Each echo uses >> to append.
> temp_token.js (
echo const crypto = require('crypto'^);
echo const token = crypto.randomBytes(24^).toString('hex'^);
echo const hash = crypto.createHash('sha256'^).update(token^).digest('hex'^);
echo const fs = require('fs'^);
echo const now = Date.now(^);
echo const data = { version: 1, tokens: [{ hash, createdAt: now, consumed: false }], updatedAt: new Date(^).toISOString(^) };
echo fs.writeFileSync('.setup-tokens.json', JSON.stringify(data, null, 2^)^);
echo process.stdout.write(token^);
)
"!RUNNER!" temp_token.js > temp_token_output.txt 2>nul
if !ERRORLEVEL! NEQ 0 (
    echo [ERROR] Failed to generate setup token!
    if exist temp_token.js del temp_token.js
    if exist temp_token_output.txt del temp_token_output.txt
    pause
    exit /b 1
)
set /p "SETUP_TOKEN=" < temp_token_output.txt
del temp_token.js
del temp_token_output.txt
echo [OK] Setup token generated

:post_token

echo.
echo ==================================================
echo           [OK] Setup Complete!
echo ==================================================
echo.
echo ----------------------------------------------
if "!MODE_CHOICE!"=="1" (
    echo   Mode:     DEMO
) else (
    echo   Mode:     PRODUCTION
)
echo   URL:      http://localhost:3000
if "!DB_CHOICE!"=="1" (
    echo   Database: PostgreSQL
) else (
    echo   Database: SQLite
)
echo ----------------------------------------------
echo.

if "!MODE_CHOICE!"=="1" goto show_demo_info
goto show_prod_info

:show_demo_info
echo [SECURE] To view demo login credentials:
echo.
echo   1. Open this URL in your browser:
echo      http://localhost:3000/setup-complete
echo.
echo   2. Enter the following setup token (one-time use only):
echo.
echo      !SETUP_TOKEN!
echo.
echo   [!] Save this token now - it will not be shown again.
echo       The token is valid for 24 hours from now.
echo.
goto post_info

:show_prod_info
echo [WARN] NOTE FOR PRODUCTION:
echo Please edit .env to configure your SMTP and Stripe keys before going live.
echo.

:post_info

set /p "START_DEV=Start server now? (y/n, default=y): "
if "!START_DEV!"=="" set "START_DEV=y"
if /i "!START_DEV!"=="y" (
    call !PKG_MGR! run dev
) else (
    echo.
    echo Press any key to exit...
    pause >nul
)

endlocal
