#!/bin/sh
set -e

if [ -z "$NITRO_DATABASE_URL" ]; then
  echo "NITRO_DATABASE_URL is not set; the API needs a Postgres database" >&2
  exit 1
fi

# Apply pending migrations before the server starts
cd /app/migrate
node node_modules/prisma/dist/prisma.js db migrate --no-interactive --no-color
cd /app

exec "$@"
