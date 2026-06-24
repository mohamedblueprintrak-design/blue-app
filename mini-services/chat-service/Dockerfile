# ============================================
# BluePrint WebSocket Chat Service - Dockerfile
# ============================================

# Stage 1: Build dependencies & generate Prisma client
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Copy root configurations & prisma directory
COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY mini-services/chat-service ./mini-services/chat-service/

# Install root dependencies
RUN bun install --frozen-lockfile

# Install microservice dependencies & generate client
WORKDIR /app/mini-services/chat-service
RUN bun install --frozen-lockfile
RUN bunx prisma generate --schema=../../prisma/schema.prisma

# Stage 2: Production runtime
FROM oven/bun:1-alpine AS runner
WORKDIR /app

# Copy all built dependencies and code from builder
COPY --from=builder /app /app

EXPOSE 3003
ENV PORT=3003
ENV NODE_ENV=production

WORKDIR /app/mini-services/chat-service

# Run using Bun
CMD ["bun", "run", "index.ts"]
