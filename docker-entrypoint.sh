#!/bin/sh
set -e

# Apply pending Drizzle migrations before boot.
node ./node_modules/drizzle-kit/bin.cjs migrate

exec node server.js
