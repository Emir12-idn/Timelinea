#!/bin/sh
set -e

echo "Applying database migrations..."
npx prisma migrate deploy

if [ "$RUN_SEED_ON_BOOT" = "true" ]; then
  echo "Running seed script..."
  npx prisma db seed || true
fi

exec "$@"
