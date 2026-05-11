# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:24-alpine AS build

WORKDIR /app

# Vite inlines VITE_* env vars at build time, so the production value
# must be available during `npm run build` (NOT as a runtime container
# env var). The CI workflow passes it via:
#     docker build --build-arg VITE_WS_URL=wss://...
# Re-exporting the ARG as ENV makes Vite pick it up.
ARG VITE_WS_URL
ENV VITE_WS_URL=${VITE_WS_URL}

# Install dependencies first to leverage Docker layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
# Use the unprivileged nginx image: runs as UID 101, listens on 8080 by default,
# pid file in /tmp — avoids permission/exit-code-1 issues on Azure Container Apps.
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

USER root

# SPA-friendly nginx config (fallback to index.html for client-side routes).
# Using a real file (not inline printf) so the config is reproducible and easy
# to validate locally with `nginx -t`.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets and make sure the unprivileged nginx user can read them
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html

USER nginx

# Non-privileged port so the image runs rootless on ACA / Kubernetes
EXPOSE 8080

# Run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
