# Acme ERP Database Backup & Restore Workflow

Automated daily backups on the remote VPS using cron, paired with a manual PowerShell synchronization and restoration workflow for local Windows Docker development.

---

## 1. Remote VPS: Automated Backup Script

### Script: `/home/deploy/backup.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
CONTAINER_NAME="acme-erp-db"
DB_USER="postgres"
DB_NAME="acme_erp"
BACKUP_DIR="/home/deploy/backup"
RETENTION_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Run pg_dump inside container and compress
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" \vert{} gzip > "$BACKUP_FILE"

# Delete backups older than RETENTION_DAYS
find "$BACKUP_DIR" -type f -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete


# Acme ERP Database Backup & Restore Workflow

Automated daily backups on the remote VPS using cron, paired with a manual PowerShell synchronization and restoration workflow for local Windows Docker development.

---

## 1. Remote VPS: Automated Backup Script

### Script: `/home/deploy/backup.sh`

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
CONTAINER_NAME="acme-erp-db"
DB_USER="postgres"
DB_NAME="acme_erp"
BACKUP_DIR="/home/deploy/backup"
RETENTION_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Run pg_dump inside container and compress
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" \vert{} gzip > "$BACKUP_FILE"

# Delete backups older than RETENTION_DAYS
find "$BACKUP_DIR" -type f -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
```

chmod +x /home/deploy/backup.sh

Edit the crontab:

```bash
crontab -e
```

Add the daily schedule (runs everyday at 2:00 AM):

```bash
# Backup Acme ERP database every day at 2:00 AM
0 2 * * * /home/deploy/backup.sh > /dev/null 2>&1
```

2. Local Windows: Sync & Restore Script
Script: D:\deploy\sync-and-restore.ps1


```powershell
### Powershell

# Configuration
$VpsHost = "148.113.6.25"
$VpsPort = "20019"
$VpsUser = "deploy"
$RemoteBackupDir = "/home/deploy/backup"
$LocalBackupDir = "D:\deploy\backups"

$ContainerName = "acme-erp-db"
$DbUser = "postgres"
$DbName = "acme_erp"

# Ensure local destination exists
if (!(Test-Path $LocalBackupDir)) {
    New-Item -ItemType Directory -Path $LocalBackupDir -Force | Out-Null
}

# 1. Fetch the latest backup filename from VPS
Write-Host "Finding latest backup on VPS..." -ForegroundColor Cyan
$LatestRemoteFile = ssh -p $VpsPort "${VpsUser}@${VpsHost}" "ls -1t $RemoteBackupDir/backup_*.sql.gz | head -n 1"

if (-not $LatestRemoteFile) {
    Write-Error "No backup files found in $RemoteBackupDir on remote host."
    exit 1
}

$FileName = Split-Path $LatestRemoteFile -Leaf$LocalGzPath = Join-Path $LocalBackupDir$FileName
$SqlFileName =$FileName -replace '\.gz$', ''$LocalSqlPath = Join-Path $LocalBackupDir$SqlFileName

# 2. Download via SCP
Write-Host "Downloading $FileName..." -ForegroundColor Cyan
scp -P $VpsPort "${VpsUser}@${VpsHost}:${LatestRemoteFile}" "$LocalGzPath"

# 3. Decompress .gz to .sql
Write-Host "Extracting $FileName..." -ForegroundColor Cyan
tar -xzf "$LocalGzPath" -C "$LocalBackupDir"

# 4. Recreate local database
Write-Host "Resetting local database '$DbName'..." -ForegroundColor Cyan
docker exec -i $ContainerName sh -c "dropdb -U $DbUser$DbName && createdb -U $DbUser$DbName"

# 5. Restore database
Write-Host "Restoring database from $SqlFileName..." -ForegroundColor Cyan
Get-Content -Raw "$LocalSqlPath" \vert{} docker exec -i $ContainerName psql -U $DbUser -d$DbName

Write-Host "Database restore completed successfully!" -ForegroundColor Green
```

3. Running the Restore
To pull the latest dump and reset your local database environment, run in PowerShell:

```powershell
# PowerShell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\sync-and-restore.ps1
```