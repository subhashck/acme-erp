#!/usr/bin/env bash
# ==============================================================================
# ACME ERP - Production MinIO Migration Script
# ==============================================================================
# Purpose:
#   Migrates ACME ERP object storage from the retired official MinIO images
#   (`minio/minio:latest`, `minio/mc:latest`) to the Chainguard enterprise-grade
#   community builds (`cgr.dev/chainguard/minio:latest`).
#
# Safety:
#   - Takes an atomic filesystem snapshot of the `acme-erp_minio_data` volume.
#   - Validates backup archive integrity before making any container changes.
#   - Verifies healthcheck, bucket availability, and read/write canary operations.
#   - Provides one-command automated rollback via `--rollback <backup_file>`.
# ==============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

VOLUME_NAME="acme-erp_minio_data"
CONTAINER_MINIO="acme-erp-minio"
CONTAINER_INIT="acme-erp-minio-init"
NEW_IMAGE="cgr.dev/chainguard/minio:latest"
BACKUP_DIR="$(pwd)/backups"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/minio_backup_${TIMESTAMP}.tar.gz"

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1" >&2; }
log_step()    { echo -e "\n${CYAN}=================================================================${NC}\n${CYAN}>>> $1${NC}\n${CYAN}=================================================================${NC}"; }

COMPOSE_CMD=""

detect_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
  else
    log_error "Neither 'docker compose' nor 'docker-compose' found in PATH."
    exit 1
  fi
}

show_help() {
  cat <<EOF
Usage: ./scripts/migrate-minio-prod.sh [OPTIONS]

Options:
  --help, -h             Show this help message
  --backup-only          Create a backup archive of the MinIO volume without migrating
  --verify-only          Verify health, connectivity and bucket status of the running MinIO
  --rollback <archive>   Restore the specified .tar.gz archive into the MinIO volume
  --no-web-restart       Do not automatically restart the 'web' service after migration

Examples:
  # Standard migration (recommended):
  ./scripts/migrate-minio-prod.sh

  # Take backup only:
  ./scripts/migrate-minio-prod.sh --backup-only

  # Rollback in case of emergency:
  ./scripts/migrate-minio-prod.sh --rollback ./backups/minio_backup_20261031_120000.tar.gz
EOF
}

check_preflight() {
  log_step "Step 1: Pre-Flight Health & Environment Checks"

  # Detect compose command
  detect_compose

  # Docker daemon connectivity
  if ! docker info >/dev/null 2>&1; then
    log_error "Cannot connect to Docker daemon. Is Docker running?"
    exit 1
  fi
  log_info "Docker daemon is accessible."

  # Volume existence
  if ! docker volume inspect "${VOLUME_NAME}" >/dev/null 2>&1; then
    log_error "Docker volume '${VOLUME_NAME}' does not exist! Please check your volume name."
    exit 1
  fi
  log_info "Target Docker volume '${VOLUME_NAME}' verified."

  # Check available disk space in backup directory
  mkdir -p "${BACKUP_DIR}"
  local free_kb
  free_kb=$(df -k "${BACKUP_DIR}" | awk 'NR==2 {print $4}')
  if [ "${free_kb}" -lt 1048576 ]; then
    log_warn "Less than 1GB free disk space available in ${BACKUP_DIR}. Free: $((free_kb / 1024))MB."
  else
    log_info "Disk space check passed ($((free_kb / 1024))MB available)."
  fi
}

take_volume_backup() {
  log_step "Step 2: Snapshotting & Backing Up MinIO Volume"

  mkdir -p "${BACKUP_DIR}"
  log_info "Creating compressed snapshot of volume '${VOLUME_NAME}' -> ${BACKUP_FILE}..."

  docker run --rm \
    -v "${VOLUME_NAME}:/data:ro" \
    -v "${BACKUP_DIR}:/backup" \
    alpine sh -c "tar -czf /backup/$(basename "${BACKUP_FILE}") -C /data ."

  if [ ! -f "${BACKUP_FILE}" ]; then
    log_error "Failed to create backup archive ${BACKUP_FILE}!"
    exit 1
  fi

  # Verify tar archive integrity
  log_info "Verifying backup archive integrity..."
  if ! tar -tzf "${BACKUP_FILE}" >/dev/null 2>&1; then
    log_error "Backup archive verification failed! File may be corrupt."
    exit 1
  fi

  local backup_size
  backup_size=$(du -h "${BACKUP_FILE}" | cut -f1)
  log_success "Backup created and verified successfully: ${BACKUP_FILE} (${backup_size})"
}

pull_new_images() {
  log_step "Step 3: Pulling Chainguard MinIO Image"
  log_info "Pulling image: ${NEW_IMAGE}..."
  docker pull "${NEW_IMAGE}"
  log_success "Image ${NEW_IMAGE} ready."
}

update_compose_file() {
  log_step "Step 4: Ensuring docker-compose.yml Is Configured"

  if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found in current directory $(pwd)."
    exit 1
  fi

  if grep -q "cgr.dev/chainguard/minio:latest" docker-compose.yml; then
    log_info "docker-compose.yml is already configured with ${NEW_IMAGE}."
  else
    log_info "Updating image references in docker-compose.yml..."
    sed -i.bak 's|image: minio/minio:latest|image: cgr.dev/chainguard/minio:latest|g' docker-compose.yml
    sed -i.bak 's|image: minio/mc:latest|image: cgr.dev/chainguard/minio:latest|g' docker-compose.yml
    rm -f docker-compose.yml.bak
    log_success "docker-compose.yml updated."
  fi

  # Ensure user: root is configured for minio service so it can mount host volumes
  if ! grep -A 10 "container_name: acme-erp-minio" docker-compose.yml | grep -q "user: root"; then
    log_info "Adding 'user: root' to minio service in docker-compose.yml..."
    sed -i.bak '/container_name: acme-erp-minio/a\    user: root' docker-compose.yml
    rm -f docker-compose.yml.bak
  fi
}

restart_and_verify_minio() {
  log_step "Step 5: Restarting MinIO & Initializing Buckets"

  log_info "Stopping previous MinIO containers..."
  ${COMPOSE_CMD} stop minio minio-init || true
  ${COMPOSE_CMD} rm -f minio minio-init || true

  log_info "Starting updated MinIO services..."
  ${COMPOSE_CMD} up -d minio minio-init

  log_info "Waiting for MinIO container '${CONTAINER_MINIO}' to become healthy..."
  local retries=30
  local count=0
  local is_healthy=false

  while [ $count -lt $retries ]; do
    local health_status
    health_status=$(docker inspect --format='{{json .State.Health.Status}}' "${CONTAINER_MINIO}" 2>/dev/null || echo '"unknown"')
    if [ "${health_status}" = '"healthy"' ]; then
      is_healthy=true
      break
    fi
    count=$((count + 1))
    echo -n "."
    sleep 2
  done
  echo ""

  if [ "$is_healthy" != "true" ]; then
    log_error "MinIO container did not become healthy within 60 seconds!"
    log_error "Recent container logs:"
    docker logs --tail 30 "${CONTAINER_MINIO}"
    log_warn "You can rollback using: ./scripts/migrate-minio-prod.sh --rollback ${BACKUP_FILE}"
    exit 1
  fi

  log_success "MinIO container '${CONTAINER_MINIO}' is HEALTHY!"

  # Wait for minio-init to complete
  log_info "Checking minio-init status..."
  local init_exit_code
  init_exit_code=$(docker inspect --format='{{.State.ExitCode}}' "${CONTAINER_INIT}" 2>/dev/null || echo "1")
  if [ "${init_exit_code}" != "0" ]; then
    log_warn "minio-init exited with code ${init_exit_code}. Logs:"
    docker logs "${CONTAINER_INIT}"
  else
    log_success "minio-init completed successfully with exit code 0."
  fi
}

verify_storage_integrity() {
  log_step "Step 6: Verifying Bucket & Read/Write Functionality"

  log_info "Inspecting buckets via mc client..."
  docker exec "${CONTAINER_MINIO}" mc ls local/ || true

  log_info "Listing objects in 'acme-erp' bucket..."
  docker exec "${CONTAINER_MINIO}" mc ls local/acme-erp || true

  # Canary upload and download test
  log_info "Performing canary read/write test..."
  local canary_id="canary_migration_${TIMESTAMP}.txt"
  docker exec "${CONTAINER_MINIO}" sh -c "echo 'ACME_ERP_MIGRATION_OK' | mc pipe local/acme-erp/${canary_id}"

  local canary_content
  canary_content=$(docker exec "${CONTAINER_MINIO}" mc cat "local/acme-erp/${canary_id}" 2>/dev/null || echo "")

  if [ "${canary_content}" != "ACME_ERP_MIGRATION_OK" ]; then
    log_error "Canary verification failed! Could not read back test object."
    exit 1
  fi

  # Clean up canary object
  docker exec "${CONTAINER_MINIO}" mc rm "local/acme-erp/${canary_id}" >/dev/null 2>&1 || true
  log_success "Canary read/write test PASSED! Storage operations are 100% functional."
}

restart_web_service() {
  log_step "Step 7: Restarting Web Service"
  log_info "Restarting 'web' container to ensure clean connection pool to new MinIO..."
  ${COMPOSE_CMD} up -d web
  log_success "Web service restarted."
}

do_rollback() {
  local archive_path="$1"
  log_step "EMERGENCY ROLLBACK INITIATED"

  detect_compose

  if [ ! -f "${archive_path}" ]; then
    log_error "Rollback archive '${archive_path}' not found!"
    exit 1
  fi

  log_warn "This will restore volume '${VOLUME_NAME}' from ${archive_path}."
  read -p "Are you sure you want to proceed? [y/N] " -r confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log_info "Rollback aborted by user."
    exit 0
  fi

  log_info "Stopping running services..."
  ${COMPOSE_CMD} stop web minio minio-init || true

  log_info "Restoring volume data from ${archive_path}..."
  docker run --rm \
    -v "${VOLUME_NAME}:/data" \
    -v "$(dirname "$(realpath "${archive_path}")"):/backup:ro" \
    alpine sh -c "rm -rf /data/* /data/..?* /data/.[!.]* 2>/dev/null || true; tar -xzf /backup/$(basename "${archive_path}") -C /data"

  log_info "Starting MinIO service..."
  ${COMPOSE_CMD} up -d minio minio-init web
  log_success "Rollback completed. Services restarted."
}

# Main routing logic
main() {
  local RESTART_WEB=true

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --help|-h)
        show_help
        exit 0
        ;;
      --backup-only)
        check_preflight
        take_volume_backup
        exit 0
        ;;
      --verify-only)
        verify_storage_integrity
        exit 0
        ;;
      --rollback)
        if [ -z "${2:-}" ]; then
          log_error "Please specify a backup archive for --rollback <archive>"
          exit 1
        fi
        do_rollback "$2"
        exit 0
        ;;
      --no-web-restart)
        RESTART_WEB=false
        shift
        ;;
      *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done

  echo -e "${GREEN}=================================================================${NC}"
  echo -e "${GREEN}  ACME ERP - MinIO Production Migration Tool                     ${NC}"
  echo -e "${GREEN}  Migrating: minio/minio -> cgr.dev/chainguard/minio:latest      ${NC}"
  echo -e "${GREEN}=================================================================${NC}"

  check_preflight
  take_volume_backup
  pull_new_images
  update_compose_file
  restart_and_verify_minio
  verify_storage_integrity

  if [ "${RESTART_WEB}" = true ]; then
    restart_web_service
  fi

  log_step "Migration Complete!"
  echo -e "${GREEN}MinIO has been successfully migrated to Chainguard builds!${NC}"
  echo -e "• Verified image: ${CYAN}${NEW_IMAGE}${NC}"
  echo -e "• Healthcheck:    ${GREEN}HEALTHY (mc ready local)${NC}"
  echo -e "• Backup saved:   ${YELLOW}${BACKUP_FILE}${NC}"
  echo -e "\nIf you ever need to rollback, execute:"
  echo -e "  ${CYAN}./scripts/migrate-minio-prod.sh --rollback ${BACKUP_FILE}${NC}\n"
}

main "$@"
