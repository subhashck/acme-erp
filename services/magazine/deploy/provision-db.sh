#!/bin/sh
set -eu
# psql variables quote identifiers and passwords; no SQL shell interpolation.
psql -v ON_ERROR_STOP=1 --set=magazine_password="$MAGAZINE_DB_PASSWORD" <<'SQL'
SELECT 'CREATE ROLE acme_magazine LOGIN' WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'acme_magazine') \gexec
ALTER ROLE acme_magazine WITH PASSWORD :'magazine_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
SELECT 'CREATE DATABASE acme_magazine OWNER acme_magazine' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'acme_magazine') \gexec
SQL
