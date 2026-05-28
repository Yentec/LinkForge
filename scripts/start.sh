#!/bin/sh
set -e

# Apply database migrations before booting the API.
# Safe to run on every cold start: prisma migrate deploy is idempotent.
echo "Applying database migrations..."
npx prisma migrate deploy

echo "Starting LinkForge..."
exec node dist/server.js