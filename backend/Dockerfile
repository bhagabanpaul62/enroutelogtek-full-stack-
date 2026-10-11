# PRODUCTION image. Dockerfile.dev is the one used for local development.

# ---- Stage 1: install dependencies ----
FROM node:22-alpine AS deps

RUN corepack enable

# Build tools for native modules (bcrypt) in case they need compiling.
# They stay in this stage only, so they don't bloat the final image.
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy only the dependency files first, so Docker caches the install step
# and skips it when only source code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# --frozen-lockfile: install exactly the versions in the lockfile (fail instead of upgrading).
# Dev deps are kept on purpose: drizzle-kit is needed to run migrations on the server.
RUN pnpm install --frozen-lockfile

# ---- Stage 2: run ----
FROM node:22-alpine

# tini = tiny init process. It passes stop signals to node so redeploys/stops are
# clean and quick (Node running as PID 1 ignores them and gets force-killed after 10s).
RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Don't run as root: if the app is ever hacked, the attacker gets fewer rights.
USER node

EXPOSE 8000

ENTRYPOINT ["/sbin/tini", "--"]
# Runs database migrations, then starts the API (see docker-entrypoint.sh).
CMD ["sh", "docker-entrypoint.sh"]
