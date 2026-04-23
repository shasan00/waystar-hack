#!/bin/sh
set -e

# Migrations are applied out-of-band from the local workstation via
# `pnpm db:migrate` before a deploy. Running drizzle-kit at container boot
# pulls in esbuild + drizzle-kit's whole config-loader chain, which we don't
# want to ship in the runner stage.
exec node server.js
