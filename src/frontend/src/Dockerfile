# syntax=docker/dockerfile:1.7

# ---------- Build stage ----------
FROM node:24-alpine AS build

WORKDIR /app

# Install dependencies first to leverage Docker layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# SPA-friendly nginx config (fallback to index.html for client-side routes)
RUN printf '%s\n' \
  'server {' \
  '  listen 8080;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '  location / {' \
  '    try_files $uri $uri/ /index.html;' \
  '  }' \
  '  location ~* \.(?:js|css|woff2?|ttf|eot|otf|svg|png|jpg|jpeg|gif|webp|ico|glb|gltf|hdr|bin)$ {' \
  '    expires 7d;' \
  '    access_log off;' \
  '    add_header Cache-Control "public, max-age=604800, immutable";' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Use non-privileged port so the image can run as non-root in containers/k8s
EXPOSE 8080

# Run nginx in the foreground
CMD ["nginx", "-g", "daemon off;"]
