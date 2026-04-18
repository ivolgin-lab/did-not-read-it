#!/bin/sh
# Run drizzle-kit push and apply the search trigger, surfacing any
# database error clearly. drizzle-kit push renders its progress with a
# spinner and swallows connection errors, so we do a plain psql probe
# first — if the DB is unreachable or credentials are wrong, the error
# shows up in the pod logs directly instead of the container appearing
# to hang and then exit with no output.

set -u

echo "migrations: verifying database connectivity..."
if ! err=$(psql "$DATABASE_URL" -tAc "select 1" 2>&1); then
  echo "migrations: ERROR: cannot connect to the database" >&2
  echo "migrations: psql output: $err" >&2
  echo "migrations: check DATABASE_URL host, port, user, password, and database name" >&2
  exit 1
fi
echo "migrations: database reachable"

echo "migrations: running drizzle-kit push..."
if ! npx drizzle-kit push; then
  echo "migrations: ERROR: drizzle-kit push failed" >&2
  exit 1
fi

echo "migrations: applying search trigger..."
if ! psql "$DATABASE_URL" -f db/search-trigger.sql; then
  echo "migrations: ERROR: failed to apply db/search-trigger.sql" >&2
  exit 1
fi

echo "migrations: done"
