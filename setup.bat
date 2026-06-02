@echo off
title BluePrint Setup
color 0A
echo ============================================
echo   BluePrint - Engineering Consultancy ERP
echo   Windows Setup Script
echo ============================================
echo.

:: Check Bun
where bun >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] Bun is not installed!
    echo Please install Bun from https://bun.sh
    pause
    exit /b 1
)

:: Ask for database type
echo ============================================
echo   Database Configuration
echo ============================================
echo.
echo   Choose your database:
echo   [1] PostgreSQL (RECOMMENDED - production-grade)
echo   [2] SQLite (simple local dev - no external DB needed)
echo.
set /p DB_CHOICE="Enter choice (1 or 2, default=2): "
if "%DB_CHOICE%"=="" set DB_CHOICE=2

echo.
echo [1/7] Creating .env file...
if not exist .env (
    copy .env.example .env >nul 2>nul
    if not exist .env (
        echo DATABASE_URL="file:./db/custom.db" > .env
        echo JWT_SECRET=VGVzdEtleUZvckRldmVsb3BtZW50T25seTIzNDU2Nzg5MA== >> .env
        echo NEXTAUTH_SECRET="blueprint-dev-secret-key-2025-do-not-use-in-production" >> .env
        echo NEXTAUTH_URL="http://localhost:3000" >> .env
        echo DEMO_MODE=true >> .env
    )
    echo   [OK] .env file created
) else (
    echo   [OK] .env file already exists
)

:: ============================================
:: Switch Prisma schema based on database choice
:: We have TWO pre-made schema files:
::   prisma/schema.sqlite.prisma     (default - no @db.* annotations)
::   prisma/schema.postgresql.prisma (with @db.Text, @db.VarChar, etc.)
:: ============================================
echo.
echo [2/7] Configuring Prisma schema for %DB_CHOICE%...
if "%DB_CHOICE%"=="1" (
    if exist prisma\schema.postgresql.prisma (
        copy /y prisma\schema.postgresql.prisma prisma\schema.prisma >nul
        echo   [OK] Schema set to PostgreSQL (with @db.* annotations)

        :: Update DATABASE_URL in .env to PostgreSQL
        if exist .env (
            powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=.*', 'DATABASE_URL=\"postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public\"' | Set-Content .env"
            echo   [OK] .env DATABASE_URL updated to PostgreSQL
        )
    ) else (
        echo   [WARN] prisma\schema.postgresql.prisma not found!
        echo   Using current schema. Make sure provider = "postgresql" is set.
    )
) else (
    if exist prisma\schema.sqlite.prisma (
        copy /y prisma\schema.sqlite.prisma prisma\schema.prisma >nul
        echo   [OK] Schema set to SQLite (no @db.* annotations)

        :: Update DATABASE_URL in .env to SQLite
        if exist .env (
            powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=.*', 'DATABASE_URL=\"file:./db/custom.db\"' | Set-Content .env"
            echo   [OK] .env DATABASE_URL updated to SQLite
        )
    ) else (
        echo   [WARN] prisma\schema.sqlite.prisma not found!
        echo   Using current schema. Make sure provider = "sqlite" is set.
    )
)

echo.
echo [3/7] Cleaning legacy files (Next.js 16 uses proxy.ts, not middleware.ts)...
if exist src\middleware.ts (
    del src\middleware.ts
    echo   [OK] Deleted legacy src\middleware.ts (Next.js 16 uses proxy.ts only)
) else (
    echo   [OK] No legacy middleware.ts found
)
if exist sentry.client.config.ts (
    del sentry.client.config.ts
    echo   [OK] Deleted legacy sentry.client.config.ts
)
if exist sentry.server.config.ts (
    del sentry.server.config.ts
    echo   [OK] Deleted legacy sentry.server.config.ts
)
if exist sentry.edge.config.ts (
    del sentry.edge.config.ts
    echo   [OK] Deleted legacy sentry.edge.config.ts
)

echo.
echo [4/7] Installing dependencies...
call bun install
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo [ERROR] bun install failed!
    pause
    exit /b 1
)
echo   [OK] Dependencies installed

echo.
echo [5/7] Setting up database...
if "%DB_CHOICE%"=="1" (
    echo   Running Prisma migrations for PostgreSQL...
    call bunx prisma migrate deploy
    if %ERRORLEVEL% NEQ 0 (
        echo   [WARN] Migration deploy failed. Trying migrate dev...
        call bunx prisma migrate dev --name init
        if %ERRORLEVEL% NEQ 0 (
            color 0C
            echo [ERROR] Database migration failed!
            echo   Make sure PostgreSQL is running and DATABASE_URL is correct in .env
            pause
            exit /b 1
        )
    )
) else (
    if exist db\custom.db (
        del db\custom.db
        echo   [OK] Old database removed
    )
    call bunx prisma db push
    if %ERRORLEVEL% NEQ 0 (
        color 0C
        echo [ERROR] Database setup failed!
        echo   Check that prisma/schema.prisma has provider = "sqlite"
        echo   and .env has DATABASE_URL="file:./db/custom.db"
        pause
        exit /b 1
    )
)
echo   [OK] Database tables created

echo.
echo [6/7] Seeding demo data...
call bunx tsx prisma/seed.ts
if %ERRORLEVEL% NEQ 0 (
    echo   [WARN] Seed had issues, but database is ready
) else (
    echo   [OK] Demo data seeded
)

echo.
echo [7/7] Generating Prisma client...
call bunx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo   [WARN] Prisma generate had issues
) else (
    echo   [OK] Prisma client generated
)

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo   Login: admin@blueprint.ae / Admin@BP2024!
echo   URL:   http://localhost:3000
echo.
if "%DB_CHOICE%"=="1" (
    echo   Database: PostgreSQL
    echo   For setup guide, see MIGRATION.md
) else (
    echo   Database: SQLite
    echo   For PostgreSQL migration, run setup.bat again and choose 1
)
echo.
echo   Starting dev server...
echo   Press Ctrl+C to stop
echo ============================================
echo.

:: Kill any process using port 3000
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo   [WARN] Port 3000 is in use by PID %%a - killing process...
    taskkill /F /PID %%a >nul 2>nul
    timeout /t 2 /nobreak >nul
)
echo   [OK] Port 3000 is free

call bun run dev
if %ERRORLEVEL% NEQ 0 (
    color 0C
    echo.
    echo [ERROR] Dev server failed to start!
    echo.
    echo Common fixes:
    echo   1. Make sure port 3000 is not in use
    echo   2. Delete the .next folder and try again
    echo   3. Run: bun run dev
    echo.
    pause
    exit /b 1
)
