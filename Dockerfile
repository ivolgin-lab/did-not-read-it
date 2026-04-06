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
FROM base AS app
COPY --from=build /app/.next ./.next
CMD ["npm", "start"]

# Migrations target
FROM base AS migrations
CMD ["sh", "-c", "npx drizzle-kit push && PGPASSWORD=${POSTGRES_PASSWORD} psql -h ${DB_HOST} -U ${POSTGRES_USER} -d ${POSTGRES_DB} -f db/search-trigger.sql"]
