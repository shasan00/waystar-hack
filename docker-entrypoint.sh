#!/bin/sh
set -e

# Run pending Drizzle migrations against DATABASE_URL before boot.
# drizzle-kit is copied into the runner stage by the Dockerfile.
node ./node_modules/drizzle-kit/bin.cjs migrate

exec node server.js
