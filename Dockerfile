# ============================================
# BluePrint SaaS - Production Dockerfile
# ============================================
# Multi-stage build for optimized production image

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g bun

WORKDIR /app

# Copy package files
COPY bun.lock package.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN bun install --frozen-lockfile

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

# Build-time DATABASE_URL placeholder for Prisma generate (if needed during build).
# NOTE: JWT_SECRET and ENCRYPTION_KEY are NOT set here.
# They were previously passed as ARG/ENV which baked placeholder values into
# image layers — a security risk even though runtime values override them.
# Next.js standalone does NOT execute API routes or middleware at build time,
# so these secrets are never needed during the build phase.
# At runtime, inject secrets via docker-compose env_file, .env, or Docker secrets.
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder

# Copy .env.example as a reference for required environment variables.
# IMPORTANT: .env (with real secrets) is NEVER copied into the image.
# At runtime, provide env vars via docker-compose env_file or Docker secrets.
COPY .env.example* .env.reference

# Build the application
RUN npm run build

# ============================================
# Stage 3: Install production dependencies only
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g bun

WORKDIR /app

COPY bun.lock package.json ./
COPY prisma ./prisma/

# Install ONLY production dependencies
RUN bun install --frozen-lockfile --production

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

# Copy .env.example reference for operators to know required env vars
COPY --from=builder /app/.env.reference ./.env.reference

# Create uploads directory
RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

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

# Start the application
CMD ["node", "server.js"]
