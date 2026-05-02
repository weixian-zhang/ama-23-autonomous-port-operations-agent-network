# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install all dependencies (incl. dev) for the TypeScript build
COPY package.json package-lock.json* ./
RUN npm ci

# Copy sources and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# tsc only emits .js — copy runtime assets (prompts, data) that agents
# read via readFileSync(join(__dirname, '...')) at runtime.
RUN cd src && find . -type f \( -name '*.md' -o -name '*.json' \) -print0 \
    | xargs -0 -I {} sh -c 'mkdir -p "../dist/$(dirname "{}")" && cp "{}" "../dist/{}"'

# ---------- Production deps stage ----------
FROM node:20-alpine AS prod-deps

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3978

# Copy production node_modules and built app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build     /app/dist          ./dist
COPY package.json ./

# Run as the unprivileged `node` user shipped with the image
USER node

EXPOSE 3978

# Lightweight HTTP healthcheck against /api/health (no curl needed)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3978)+'/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
