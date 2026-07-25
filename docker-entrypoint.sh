#!/bin/sh
set -e

echo "Starting ACME ERP startup script..."

# Run Drizzle schema migrations to keep database up to date
echo "Applying database migrations (drizzle-kit push)..."
pnpm db:push

# Run seed file to populate initial data
echo "Running database seed..."
pnpm db:seed

# Start the Node Hono API server
echo "Starting Hono API server..."
exec pnpm start
