#!/bin/sh
# will do a db import instead of the drizzle stuff
set -e

echo "Starting ACME ERP startup script..."

# Generate one installation-specific Web Push key pair and keep it in the
# persistent volume mounted by Compose. Never print or replace an existing pair.
VAPID_KEYS_FILE="${VAPID_KEYS_FILE:-/var/lib/acme-erp/vapid.env}"
if [ -z "${VAPID_PUBLIC_KEY:-}" ] || [ -z "${VAPID_PRIVATE_KEY:-}" ]; then
  if [ ! -s "$VAPID_KEYS_FILE" ]; then
    echo "Generating persistent Web Push VAPID keys..."
    pnpm exec web-push generate-vapid-keys --json | node -e '
      let input = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", chunk => input += chunk);
      process.stdin.on("end", () => {
        const keys = JSON.parse(input);
        if (!keys.publicKey || !keys.privateKey) process.exit(1);
        process.stdout.write(`VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`);
      });
    ' > "$VAPID_KEYS_FILE.tmp"
    chmod 600 "$VAPID_KEYS_FILE.tmp"
    mv "$VAPID_KEYS_FILE.tmp" "$VAPID_KEYS_FILE"
  fi
  set -a
  . "$VAPID_KEYS_FILE"
  set +a
  export VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY
fi

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
