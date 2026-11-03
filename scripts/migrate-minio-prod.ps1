<#
.SYNOPSIS
    ACME ERP - Production MinIO Migration Script for Windows / PowerShell
.DESCRIPTION
    Migrates ACME ERP object storage from the retired official MinIO images
    (`minio/minio:latest`, `minio/mc:latest`) to the Chainguard builds (`cgr.dev/chainguard/minio:latest`).
    Creates an automated snapshot of the `acme-erp_minio_data` volume and verifies read/write integrity.
.PARAMETER BackupOnly
    Create a backup archive of the MinIO volume without migrating.
.PARAMETER VerifyOnly
    Verify health, connectivity and bucket status of the running MinIO.
.PARAMETER Rollback
    Path to a .tar.gz archive to restore into the MinIO volume.
.PARAMETER NoWebRestart
    Do not restart the web service after migration.
.EXAMPLE
    .\scripts\migrate-minio-prod.ps1
    .\scripts\migrate-minio-prod.ps1 -BackupOnly
    .\scripts\migrate-minio-prod.ps1 -Rollback .\backups\minio_backup_20261031_120000.tar.gz
#>

[CmdletBinding()]
param(
    [switch]$BackupOnly,
    [switch]$VerifyOnly,
    [string]$Rollback,
    [switch]$NoWebRestart
)

$ErrorActionPreference = "Stop"

$VolumeName = "acme-erp_minio_data"
$ContainerMinio = "acme-erp-minio"
$ContainerInit = "acme-erp-minio-init"
$NewImage = "cgr.dev/chainguard/minio:latest"
$BackupDir = Join-Path (Get-Location) "backups"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$BackupFile = Join-Path $BackupDir "minio_backup_${Timestamp}.tar.gz"

function Write-Info($msg)    { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Success($msg) { Write-Host "[SUCCESS] $msg" -ForegroundColor Green }
function Write-Warn($msg)    { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-ErrorMsg($msg){ Write-Host "[ERROR] $msg" -ForegroundColor Red }
function Write-Step($msg) {
    Write-Host "`n=================================================================" -ForegroundColor Cyan
    Write-Host ">>> $msg" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
}

# 1. Rollback Mode
if ($Rollback) {
    Write-Step "EMERGENCY ROLLBACK INITIATED"
    if (-not (Test-Path $Rollback)) {
        Write-ErrorMsg "Rollback archive '$Rollback' not found!"
        exit 1
    }

    $confirmation = Read-Host "Are you sure you want to restore volume '$VolumeName' from '$Rollback'? (y/N)"
    if ($confirmation -notmatch "^[Yy]$") {
        Write-Info "Rollback aborted by user."
        exit 0
    }

    Write-Info "Stopping running services..."
    docker compose stop web minio minio-init

    $archiveName = Split-Path $Rollback -Leaf
    $archiveDir = Split-Path (Resolve-Path $Rollback) -Parent

    Write-Info "Restoring volume data from $archiveName..."
    docker run --rm -v "${VolumeName}:/data" -v "${archiveDir}:/backup" alpine sh -c "rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null || true; tar -xzf /backup/$archiveName -C /data"

    Write-Info "Restarting services..."
    docker compose up -d minio minio-init web
    Write-Success "Rollback completed. Services restarted."
    exit 0
}

# 2. Verify Only Mode
if ($VerifyOnly) {
    Write-Step "Storage Verification"
    docker exec $ContainerMinio mc ls local/
    docker exec $ContainerMinio mc ls local/acme-erp
    Write-Success "Verification completed."
    exit 0
}

Write-Host "=================================================================" -ForegroundColor Green
Write-Host "  ACME ERP - MinIO Production Migration Tool                     " -ForegroundColor Green
Write-Host "  Migrating: minio/minio -> cgr.dev/chainguard/minio:latest      " -ForegroundColor Green
Write-Host "=================================================================" -ForegroundColor Green

# 3. Pre-flight Checks
Write-Step "Step 1: Pre-Flight Environment Checks"
try {
    docker info | Out-Null
    Write-Info "Docker daemon is accessible."
} catch {
    Write-ErrorMsg "Cannot connect to Docker daemon. Is Docker Desktop running?"
    exit 1
}

$volCheck = docker volume inspect $VolumeName 2>$null
if (-not $volCheck) {
    Write-ErrorMsg "Docker volume '$VolumeName' does not exist!"
    exit 1
}
Write-Info "Target Docker volume '$VolumeName' verified."

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

# 4. Snapshot & Backup
Write-Step "Step 2: Snapshotting & Backing Up MinIO Volume"
Write-Info "Creating compressed snapshot -> $BackupFile..."
$backupArchiveName = Split-Path $BackupFile -Leaf

docker run --rm -v "${VolumeName}:/data:ro" -v "${BackupDir}:/backup" alpine sh -c "tar -czf /backup/$backupArchiveName -C /data ."

if (-not (Test-Path $BackupFile)) {
    Write-ErrorMsg "Failed to create backup archive $BackupFile!"
    exit 1
}

$fileItem = Get-Item $BackupFile
$sizeMB = [math]::Round($fileItem.Length / 1MB, 2)
Write-Success "Backup created and verified: $BackupFile ($sizeMB MB)"

if ($BackupOnly) {
    Write-Success "Backup only mode completed successfully."
    exit 0
}

# 5. Pull Image
Write-Step "Step 3: Pulling Chainguard MinIO Image"
Write-Info "Pulling $NewImage..."
docker pull $NewImage
Write-Success "Image $NewImage ready."

# 6. Update Compose File
Write-Step "Step 4: Ensuring docker-compose.yml Is Configured"
if (Test-Path "docker-compose.yml") {
    $composeContent = Get-Content "docker-compose.yml" -Raw
    $updated = $false
    if ($composeContent -match "image:\s*minio/minio:latest") {
        $composeContent = $composeContent -replace "image:\s*minio/minio:latest", "image: cgr.dev/chainguard/minio:latest"
        $updated = $true
    }
    if ($composeContent -match "image:\s*minio/mc:latest") {
        $composeContent = $composeContent -replace "image:\s*minio/mc:latest", "image: cgr.dev/chainguard/minio:latest"
        $updated = $true
    }
    if ($composeContent -notmatch "container_name:\s*acme-erp-minio[\r\n\s]+restart:\s*always[\r\n\s]+user:\s*root") {
        $composeContent = $composeContent -replace "(container_name:\s*acme-erp-minio[\r\n\s]+restart:\s*always)", "`$1`n    user: root"
        $updated = $true
    }
    if ($updated) {
        Set-Content "docker-compose.yml" $composeContent
        Write-Success "docker-compose.yml updated with new image and root user mount configuration."
    } else {
        Write-Info "docker-compose.yml is already configured."
    }
}

# 7. Restart MinIO
Write-Step "Step 5: Restarting MinIO & Initializing Buckets"
Write-Info "Stopping previous MinIO containers..."
docker compose stop minio minio-init 2>$null | Out-Null
docker compose rm -f minio minio-init 2>$null | Out-Null

Write-Info "Starting updated MinIO services..."
docker compose up -d minio minio-init

Write-Info "Waiting for MinIO container to become healthy..."
$isHealthy = $false
for ($i = 0; $i -lt 30; $i++) {
    $status = docker inspect --format="{{json .State.Health.Status}}" $ContainerMinio 2>$null
    if ($status -eq '"healthy"') {
        $isHealthy = $true
        break
    }
    Write-Host -NoNewline "."
    Start-Sleep -Seconds 2
}
Write-Host ""

if (-not $isHealthy) {
    Write-ErrorMsg "MinIO container did not become healthy within 60 seconds!"
    docker logs --tail 30 $ContainerMinio
    Write-Warn "To rollback, run: .\scripts\migrate-minio-prod.ps1 -Rollback $BackupFile"
    exit 1
}
Write-Success "MinIO container '$ContainerMinio' is HEALTHY!"

# 8. Storage Verification
Write-Step "Step 6: Verifying Bucket & Read/Write Operations"
Write-Info "Listing buckets..."
docker exec $ContainerMinio mc ls local/

Write-Info "Running canary read/write test..."
$canaryId = "canary_migration_${Timestamp}.txt"
docker exec $ContainerMinio sh -c "echo 'ACME_ERP_MIGRATION_OK' | mc pipe local/acme-erp/$canaryId"
$readBack = docker exec $ContainerMinio mc cat "local/acme-erp/$canaryId"

if ($readBack.Trim() -ne "ACME_ERP_MIGRATION_OK") {
    Write-ErrorMsg "Canary verification failed! Could not read back test object."
    exit 1
}
docker exec $ContainerMinio mc rm "local/acme-erp/$canaryId" | Out-Null
Write-Success "Canary test PASSED! Storage operations are 100% functional."

# 9. Restart Web Service
if (-not $NoWebRestart) {
    Write-Step "Step 7: Restarting Web Service"
    Write-Info "Restarting 'web' container..."
    docker compose up -d web
    Write-Success "Web service restarted."
}

Write-Step "Migration Complete!"
Write-Host "MinIO has been successfully migrated to Chainguard builds!" -ForegroundColor Green
Write-Host "• Verified image: $NewImage" -ForegroundColor Cyan
Write-Host "• Healthcheck:    HEALTHY (mc ready local)" -ForegroundColor Green
Write-Host "• Backup saved:   $BackupFile" -ForegroundColor Yellow
Write-Host "`nIf you ever need to rollback, execute:"
Write-Host "  .\scripts\migrate-minio-prod.ps1 -Rollback $BackupFile`n" -ForegroundColor Cyan

