git pull origin docker-version

docker compose down

### Backup
### docker exec -t <container_name> pg_dump -U <db_user> <db_name> | gzip > /path/to/backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
docker exec -t acme-erp-db pg_dump -U postgres acme_erp | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

### Backup in windows for docker compose
docker exec acme-erp-db pg_dump -U postgres acme_erp | Out-File -Encoding utf8 backup.sql

### Restore in vps
gunzip -c backup.sql.gz | docker exec -i acme-erp-db psql -U <db_user> -d <db_name>
docker exec -t acme-erp-db pg_restore -U <db_user> -d <db_name> --clean --if-exists /path/to/backup/file.sql


### copy backup to windows
scp -P 20019 deploy@148.113.1.66:/home/deploy/backup/backup_20260918_090406.sql.gz  D:\deploy\backups

### drop and recreate empty database
docker exec -i acme-erp-db sh -c "dropdb -U postgres acme_erp && createdb -U postgres acme_erp"

### Restore in windows

Get-Content D:\deploy\backup_20261009_060445.sql | docker exec -i acme-erp-db psql -U postgres -d acme_erp

docker compose up --build -d

### execute commands inside docker container
docker exec -it acme-erp-web sh

# Overall filesystem usage
df -h

# Docker's view of disk consumption
docker system df

# More detailed Docker breakdown
docker system df -v

# Biggest top-level directories
sudo du -xh --max-depth=1 / 2>/dev/null | sort -h

# Specifically inspect Docker
sudo du -xh --max-depth=1 /var/lib/docker 2>/dev/null | sort -h

docker builder prune -a


# for local docker build
docker compose -f docker-compose.yml -f docker-compose.production.yml -f docker-compose.local.yml up -d --build

# for PROD acme-erp-web deployment
docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build

---

## 🗄️ MinIO Object Storage Migration & Maintenance

MinIO removed their official Docker Hub images (`minio/minio:latest`, `minio/mc:latest`). ACME ERP uses Chainguard's maintained builds (`cgr.dev/chainguard/minio:latest`).

### 1. Run MinIO Production Migration

#### Linux VPS (Bash):
```bash
# Make script executable
chmod +x ./scripts/migrate-minio-prod.sh

# Run automated migration (takes backup, updates compose, verifies health & data)
./scripts/migrate-minio-prod.sh

# Or create a snapshot backup without migrating:
./scripts/migrate-minio-prod.sh --backup-only

# Verify storage health and bucket contents:
./scripts/migrate-minio-prod.sh --verify-only
```

#### Windows Host (PowerShell):
```powershell
# Run automated migration
.\scripts\migrate-minio-prod.ps1

# Backup volume only
.\scripts\migrate-minio-prod.ps1 -BackupOnly

# Verify storage
.\scripts\migrate-minio-prod.ps1 -VerifyOnly
```

### 2. Emergency Rollback

If you need to restore your MinIO volume from an automated snapshot:

```bash
# Linux:
./scripts/migrate-minio-prod.sh --rollback ./backups/minio_backup_<TIMESTAMP>.tar.gz

# Windows:
.\scripts\migrate-minio-prod.ps1 -Rollback .\backups\minio_backup_<TIMESTAMP>.tar.gz
```