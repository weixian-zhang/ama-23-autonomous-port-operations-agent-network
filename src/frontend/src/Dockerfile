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
# Serve the built SPA with Vite's built-in preview server (Node).
# Same Node version as the build stage to keep the runtime predictable.
FROM node:24-alpine AS runtime

WORKDIR /app

# Bring in only what `vite preview` needs at runtime:
#   - dist/ (the built assets it serves)
#   - node_modules/ (vite itself + its deps)
#   - package.json + vite.config.ts (vite reads these on startup)
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/vite.config.ts ./vite.config.ts

# Drop privileges
USER node

# Non-privileged port — must match Container Apps ingress targetPort
EXPOSE 8080

# `--host 0.0.0.0` is required so the server binds outside the container's loopback,
# otherwise ACA's startup probe (and ingress) cannot reach it.
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "8080"]
