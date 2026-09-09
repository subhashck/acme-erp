#!/bin/sh
# will do a db import instead of the drizzle stuff
set -e

echo "Starting ACME ERP startup script..."

# Run module schema setup and Drizzle schema migrations to keep database up to date
echo "Applying database setup and migrations..."
pnpm db:setup
pnpm db:push

# Run seed file to populate initial data
echo "Running database seed..."
# pnpm db:seed

# Start the Node Hono API server
echo "Starting Hono API server..."
exec pnpm start
