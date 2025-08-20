# Dockerfile for Data Governance Decision Tool
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for building)
#RUN npm ci --only=production --silent
#RUN npm ci --silent

# ...existing code...
WORKDIR /app

COPY package*.json ./

# Install build dependencies for mozjpeg and other native modules
RUN apk add --no-cache autoconf automake libtool nasm build-base pkgconfig python3

RUN npm ci
# ...rest of your Dockerfile...
RUN npm ci 

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S governance && \
    adduser -S governance -u 1001 -G governance

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-default.conf /etc/nginx/conf.d/default.conf

# Copy security headers configuration
COPY security-headers.conf /etc/nginx/conf.d/security-headers.conf

# Set proper permissions
RUN chown -R governance:governance /usr/share/nginx/html && \
    chown -R governance:governance /var/cache/nginx && \
    chown -R governance:governance /var/log/nginx && \
    chown -R governance:governance /etc/nginx/conf.d && \
    chown -R governance:governance /var/run

# Create required directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp && \
    chown -R governance:governance /var/cache/nginx

# Switch to non-root user
USER governance

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Labels for metadata
LABEL maintainer="Enterprise Data Governance Team <governance@enterprise.com>"
LABEL version="1.0.0"
LABEL description="Enterprise Data Governance Decision Tool"
LABEL org.opencontainers.image.title="Data Governance Decision Tool"
LABEL org.opencontainers.image.description="Enterprise-grade tool for data governance recommendations"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.created="2025-08-19"
LABEL org.opencontainers.image.source="https://github.com/enterprise/governance-workflow"
LABEL org.opencontainers.image.licenses="MIT"

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
