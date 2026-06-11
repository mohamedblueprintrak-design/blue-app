# ============================================
# BluePrint SaaS - Production Dockerfile
# ============================================
# Multi-stage build for optimized production image
# Uses Node.js for dependency installation and runtime

# Stage 1: Dependencies
FROM node:20-alpine AS deps
# python3, make, g++ needed for native modules (sharp)
RUN apk add --no-cache libc6-compat openssl python3 make g++

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
# --ignore-scripts skips prepare:husky (dev-only) and postinstall:prisma-generate
# We run prisma generate manually below
RUN npm ci --ignore-scripts

# Generate Prisma Client
RUN npx prisma generate

# ============================================
# Stage 2: Builder
FROM node:20-alpine AS builder


WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# NOTE: Secrets (DATABASE_URL, JWT_SECRET, ENCRYPTION_KEY) are NOT baked into the image.
# Next.js standalone does NOT execute API routes or middleware at build time,
# so these secrets are never needed during the build phase.
# At runtime, inject secrets via docker-compose env_file, .env, or Docker secrets.
# Prisma generate is handled in the deps stage; no DATABASE_URL needed here.

# Build the application
RUN npm run build

# ============================================
# Stage 3: Install production dependencies only
FROM node:20-alpine AS prod-deps
# python3, make, g++ needed for native modules (sharp)
RUN apk add --no-cache libc6-compat openssl python3 make g++

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
# --ignore-scripts skips prepare:husky (not installed in prod) and postinstall
# We run prisma generate manually below
RUN npm ci --only=production --ignore-scripts

# Generate Prisma Client (production)
RUN npx prisma generate

# ============================================
# Stage 4: Runner (Production)
FROM node:20-alpine AS runner

WORKDIR /app

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (includes only needed files)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy production node_modules for Prisma and other server-side deps
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy Prisma schema for migrations at runtime
COPY --from=builder /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

# Install postgresql-client for migrations
RUN apk add --no-cache postgresql-client

# Copy entrypoint script
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

# Set proper ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Set port
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the application via entrypoint
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
