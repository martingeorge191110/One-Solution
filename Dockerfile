# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDeps for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source
COPY . .

# Build NestJS
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy package manifests and install prod deps only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --omit=dev

# Generate Prisma client in production image
RUN npx prisma generate

# Copy built output from builder
COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["node", "dist/src/main"]
