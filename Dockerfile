FROM node:20-alpine AS base

RUN apk add --no-cache postgresql-client

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Development target — used by docker-stack.yml
FROM base AS dev

# Production build target
FROM base AS build
RUN npm run build

# Download the troubleshoot support-bundle binary. Architecture is taken from
# the buildx-provided TARGETARCH so amd64 and arm64 builds both work.
FROM alpine:3.20 AS troubleshoot
ARG TARGETOS=linux
ARG TARGETARCH
ARG TROUBLESHOOT_VERSION=0.125.1
RUN apk add --no-cache curl tar \
 && curl -fsSL -o /tmp/support-bundle.tar.gz \
      "https://github.com/replicatedhq/troubleshoot/releases/download/v${TROUBLESHOOT_VERSION}/support-bundle_${TARGETOS}_${TARGETARCH}.tar.gz" \
 && tar -xzf /tmp/support-bundle.tar.gz -C /usr/local/bin support-bundle \
 && chmod +x /usr/local/bin/support-bundle

# Production app target
FROM node:20-alpine AS app
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/node_modules ./node_modules
COPY --from=troubleshoot /usr/local/bin/support-bundle /usr/local/bin/support-bundle
CMD ["node", "server.js"]

# Migrations target
FROM base AS migrations
CMD ["sh", "-c", "npx drizzle-kit push && PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${DB_HOST} -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f db/search-trigger.sql"]
