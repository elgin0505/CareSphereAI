# Root-level Dockerfile for Cloud Build trigger (Dockerfile mode).
# Build context = repo root (/workspace), so all paths use backend/ prefix.
# The Cloud Build trigger looks for /workspace/Dockerfile — this file.

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install all deps (including dev) so tsc can compile
COPY backend/package.json backend/package-lock.json ./
RUN npm ci

# Copy source and compile to dist/
COPY backend/tsconfig.json ./
COPY backend/src ./src
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Install only production deps
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 8080
CMD ["node", "dist/index.js"]
