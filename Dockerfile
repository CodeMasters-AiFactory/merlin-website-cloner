# Merlin Website Cloner - Production Dockerfile
# COD-12-001: Multi-stage build for optimal image size

# ==================== BUILD STAGE ====================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci --include=dev
RUN cd frontend && npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build frontend
RUN cd frontend && npm run build

# Build backend (if TypeScript)
RUN npm run build 2>/dev/null || echo "No build step needed"

# ==================== PRODUCTION STAGE ====================
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    dumb-init

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Copy necessary source files
COPY --from=builder /app/src ./src

# Create directories for data persistence
RUN mkdir -p /app/data /app/clones /app/logs /app/configs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server/index.js"]
