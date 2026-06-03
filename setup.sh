#!/bin/bash
echo "============================================"
echo "  BluePrint - Engineering Consultancy ERP"
echo "  Setup Script"
echo "============================================"
echo ""

# Check Bun
if ! command -v bun &> /dev/null; then
    echo "[ERROR] Bun is not installed!"
    echo "Install Bun: curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Ask for database type
echo "============================================"
echo "  Database Configuration"
echo "============================================"
echo ""
echo "  Choose your database:"
echo "  [1] PostgreSQL (RECOMMENDED - production-grade)"
echo "  [2] SQLite (simple local dev - no external DB needed)"
echo ""
read -p "Enter choice (1 or 2, default=2): " DB_CHOICE
DB_CHOICE=${DB_CHOICE:-2}

# [0/7] Ensure latest code is used
echo ""
echo "[0/7] Checking for latest code..."
if command -v git &> /dev/null; then
    if [ -d .git ]; then
        echo "  Pulling latest code from GitHub..."
        if git pull origin main 2>&1; then
            echo "  [OK] Latest code pulled"
        else
            echo "  [WARN] git pull failed. Continuing with local code..."
        fi
    else
        echo "  Not a git repository (archive download). Converting to git..."
        git init 2>/dev/null
        git remote add origin https://github.com/mohamedblueprintrak-design/blue.git 2>/dev/null
        if git fetch --depth=1 origin main 2>&1; then
            if git reset --hard origin/main 2>&1; then
                echo "  [OK] Latest code downloaded from GitHub"
            else
                echo "  [WARN] git reset failed. Continuing with archive code..."
            fi
        else
            echo "  [WARN] git fetch failed. Continuing with archive code..."
        fi
    fi
else
    echo "  [SKIP] Git not installed. Using current code."
    echo "  TIP: Install Git for auto-updates."
fi

echo ""
echo "[1/7] Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env 2>/dev/null
    if [ ! -f .env ]; then
        echo 'DATABASE_URL="file:./db/custom.db"' > .env
        echo 'JWT_SECRET=VGVzdEtleUZvckRldmVsb3BtZW50T25seTIzNDU2Nzg5MA==' >> .env
        echo 'NEXTAUTH_SECRET="blueprint-dev-secret-key-2025-do-not-use-in-production"' >> .env
        echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env
        echo 'DEMO_MODE=true' >> .env
    fi
    echo "  [OK] .env file created"
else
    echo "  [OK] .env file already exists"
fi

# Configure database based on choice
if [ "$DB_CHOICE" = "1" ]; then
    echo ""
    echo "  Configuring for PostgreSQL..."
    echo "  Make sure PostgreSQL is running and accessible."
    echo "  The default URL is: postgresql://blueprint:blueprint_dev@localhost:5432/blueprint?schema=public"
    echo "  Edit .env to change the DATABASE_URL if needed."
    echo ""
    echo "  IMPORTANT: The Prisma schema uses provider = \"postgresql\" by default."
    echo "  If you previously used SQLite, the schema is already configured for PostgreSQL."
else
    echo ""
    echo "  Configuring for SQLite (simple local development)..."
    echo "  You need to switch the Prisma schema to SQLite provider."
    echo "  In prisma/schema.prisma:"
    echo "    1. Change provider = \"postgresql\" to provider = \"sqlite\""
    echo "    2. Remove all @db.Text and @db.VarChar() annotations"
    echo "  Then set DATABASE_URL in .env to: \"file:./db/custom.db\""
    echo ""
    echo "  Or use Docker: docker-compose up -d postgres"
fi

echo ""
echo "[2/7] Installing dependencies..."
bun install
echo "  [OK] Dependencies installed"

echo ""
echo "[3/7] Cleaning build cache..."
if [ -d .next ]; then
    rm -rf .next
    echo "  [OK] Build cache cleared"
else
    echo "  [OK] No build cache to clear"
fi
# Remove deprecated middleware/proxy files (causes [[...slug]] route conflict in Next.js 16)
if [ -f src/middleware.ts ]; then
    rm src/middleware.ts
    echo "  [OK] Removed deprecated middleware.ts"
fi
if [ -f src/proxy.ts ]; then
    rm src/proxy.ts
    echo "  [OK] Removed deprecated proxy.ts"
fi

echo ""
echo "[4/7] Setting up database..."
if [ "$DB_CHOICE" = "1" ]; then
    echo "  Running Prisma migrations for PostgreSQL..."
    bunx prisma migrate deploy 2>/dev/null || {
        echo "  [WARN] migrate deploy failed. Trying migrate dev..."
        bunx prisma migrate dev --name init
    }
else
    if [ -f db/custom.db ]; then
        rm db/custom.db
        echo "  [OK] Old database removed"
    fi
    bunx prisma db push
fi
echo "  [OK] Database tables created"

echo ""
echo "[5/7] Seeding demo data..."
bunx tsx prisma/seed.ts
echo "  [OK] Demo data seeded"

echo ""
echo "[6/7] Generating Prisma client..."
bunx prisma generate
echo "  [OK] Prisma client generated"

echo ""
echo "[7/7] Starting dev server..."
echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "  Login: admin@blueprint.ae / Admin@BP2024!"
echo "  URL:   http://localhost:3000"
echo ""
if [ "$DB_CHOICE" = "1" ]; then
    echo "  Database: PostgreSQL"
else
    echo "  Database: SQLite"
fi
echo "  For PostgreSQL setup guide, see MIGRATION.md"
echo ""
echo "  Starting dev server..."
echo "  Press Ctrl+C to stop"
echo "============================================"
echo ""

# Kill any process using port 3000
echo "Checking port 3000..."
PORT_PID=$(lsof -ti:3000 2>/dev/null || true)
if [ -n "$PORT_PID" ]; then
    echo "  [WARN] Port 3000 is in use by PID $PORT_PID - killing process..."
    kill -9 $PORT_PID 2>/dev/null || true
    sleep 2
fi
echo "  [OK] Port 3000 is free"

bun run dev
