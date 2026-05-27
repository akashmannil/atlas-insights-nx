# syntax=docker/dockerfile:1.7
# Multi-stage build for apps/web (Vite + React).
# Context: monorepo root.

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /workspace

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY libs/shared-types/package.json libs/shared-types/
COPY libs/shared-utils/package.json libs/shared-utils/

RUN npm ci --workspaces --include-workspace-root

# ---------- build ----------
FROM deps AS build
WORKDIR /workspace

ARG VITE_API_BASE_URL=/api
ARG VITE_USE_DIRECT_FEED=false
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_USE_DIRECT_FEED=$VITE_USE_DIRECT_FEED

COPY tsconfig.base.json ./
COPY libs ./libs
COPY apps/web ./apps/web

RUN npm run -w apps/web build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

# Static bundle + SPA-aware nginx config that also reverse-proxies /api.
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html

EXPOSE 80

# nginx already runs as a non-root worker by default; the master process needs
# root only to bind low ports (we bind 80 here).
CMD ["nginx", "-g", "daemon off;"]
