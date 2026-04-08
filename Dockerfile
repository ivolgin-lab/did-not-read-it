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

# Production app target
FROM node:20-alpine AS app
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "server.js"]

# Migrations target
FROM base AS migrations
CMD ["sh", "-c", "npx drizzle-kit push && PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${DB_HOST} -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f db/search-trigger.sql"]
