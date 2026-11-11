#!/bin/sh
set -eu
mc alias set provision http://minio:9000 "$MINIO_ADMIN_USER" "$MINIO_ADMIN_PASSWORD"
mc mb --ignore-existing provision/acme-magazine
mc admin user add provision acme-magazine "$MAGAZINE_MINIO_SECRET_KEY"
cat > /tmp/magazine-policy.json <<'JSON'
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:GetBucketLocation","s3:ListBucket"],"Resource":["arn:aws:s3:::acme-magazine"]},{"Effect":"Allow","Action":["s3:GetObject","s3:PutObject","s3:DeleteObject"],"Resource":["arn:aws:s3:::acme-magazine/magazine/*"]}]}
JSON
mc admin policy create provision acme-magazine-policy /tmp/magazine-policy.json
mc admin policy attach provision acme-magazine-policy --user acme-magazine
