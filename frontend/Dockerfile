# ==================================
# Multi-stage Dockerfile for Frontend
# ==================================

# ----------------
# Stage 1: Builder
# ----------------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code (including .env.production)
COPY . .

# Build production bundle (will use .env.production)
RUN npm run build

# ----------------
# Stage 2: Production with Nginx
# ----------------
FROM nginx:alpine AS production

# Copy nginx template (BACKEND_URL se inyecta en runtime via envsubst)
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx cache directories
RUN mkdir -p /var/cache/nginx/client_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Sustituye solo ${BACKEND_URL} — las $variables de nginx ($host, $uri, etc.) quedan intactas
CMD ["/bin/sh", "-c", "envsubst '${BACKEND_URL}' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

# ----------------
# Stage 3: Development
# ----------------
FROM node:22-alpine AS development

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code (will be overridden by volume in docker-compose)
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
