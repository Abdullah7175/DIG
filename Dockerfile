# ============================================
# Multi-Stage Docker Build for Secure Deployment
# Stage 1: Build everything (source code stays here)
# Stage 2: Production runtime (only compiled code)
# ============================================

# ============================================
# STAGE 1: Builder - Compile TypeScript & Build Frontend
# ============================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.js ./
COPY components.json ./
COPY fix-schema-imports.js ./

# Install ALL dependencies (including dev dependencies for building)
RUN npm ci

# Copy source code (this will NOT be in final image)
COPY server ./server
COPY shared ./shared
COPY client ./client

# Build backend (TypeScript → JavaScript)
RUN npm run build:backend

# Build frontend (Vite build)
RUN npm run build:frontend

# ============================================
# STAGE 2: Production Runtime - Minimal Image
# ============================================
FROM node:20-alpine AS production

# Set working directory
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy ONLY built files from builder stage (NO SOURCE CODE)
COPY --from=builder /app/dist ./dist

# Copy only necessary files (no source code)
COPY --from=builder /app/fix-schema-imports.js ./

# Create uploads directory
RUN mkdir -p uploads

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/server/index.js"]

