# Multi-stage build for CareSphere AI backend
# Target: Google Cloud Run (Node 20, Alpine)

# --- Build stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install all deps (including dev) so tsc can compile
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and compile to dist/
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- Runtime stage ---
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Install only production deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JS from the builder stage
COPY --from=builder /app/dist ./dist

EXPOSE 8080
USER node

CMD ["node", "dist/index.js"]
