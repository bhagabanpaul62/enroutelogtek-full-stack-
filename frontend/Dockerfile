# PRODUCTION image. Dockerfile.dev is the one used for local development.

# ---- Stage 1: install deps and build ----
FROM node:22-alpine AS builder

RUN corepack enable

WORKDIR /app

# Copy only the dependency files first, so Docker caches the install step
# and skips it when only source code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --frozen-lockfile: install exactly the versions in the lockfile (fail instead of upgrading).
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY . .

# NEXT_PUBLIC_* values are written into the browser JS during the build,
# so they must exist here (passed from docker-compose.yml as a build arg).
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_TELEMETRY_DISABLED=1

# Optimized production build ("next dev" is slow and not made for real traffic).
RUN pnpm build

# ---- Stage 2: run ----
# Fresh, small image: only the standalone server + static files
# (no full node_modules, no source code, no pnpm).
FROM node:22-alpine

# tini = tiny init process. It passes stop signals to node so redeploys/stops are
# clean and quick (Node running as PID 1 ignores them and gets force-killed after 10s).
RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Listen on all interfaces so Caddy (another container) can reach it.
ENV HOSTNAME=0.0.0.0

# The standalone output doesn't include public/ and .next/static, so copy them in.
# Owned by "node" so Next.js can write its image cache into .next/.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Don't run as root: if the app is ever hacked, the attacker gets fewer rights.
USER node

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
