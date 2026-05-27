# syntax=docker/dockerfile:1.7
# Multi-stage build for apps/api (NestJS).
# Context: monorepo root (see docker-compose.yml / CI).

# ---------- deps ----------
FROM node:20-alpine AS deps
WORKDIR /workspace

# Copy workspace manifests first so layer cache survives source-only edits.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY libs/shared-types/package.json libs/shared-types/
COPY libs/shared-utils/package.json libs/shared-utils/

RUN npm ci --workspaces --include-workspace-root

# ---------- build ----------
FROM deps AS build
WORKDIR /workspace

COPY tsconfig.base.json ./
COPY libs ./libs
COPY apps/api ./apps/api

RUN npm run -w apps/api build

# Prune dev deps for a slimmer runtime layer.
RUN npm prune --omit=dev --workspaces --include-workspace-root

# ---------- runtime ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    API_HOST=0.0.0.0 \
    API_PORT=3000

# Drop privileges. node:alpine ships a `node` user (uid 1000).
RUN apk add --no-cache tini

# npm workspaces hoists deps to the root node_modules — there is no per-app
# node_modules to copy. Nest resolves @atlas/shared-types etc. via the root
# node_modules symlinks created by `npm ci --workspaces`.
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api/dist ./apps/api/dist
COPY --from=build /workspace/apps/api/package.json ./apps/api/package.json
COPY --from=build /workspace/libs ./libs
COPY --from=build /workspace/package.json ./package.json

USER node

EXPOSE 3000

# tini reaps zombies + forwards signals so Nest's shutdown hooks fire on SIGTERM.
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main.js"]
