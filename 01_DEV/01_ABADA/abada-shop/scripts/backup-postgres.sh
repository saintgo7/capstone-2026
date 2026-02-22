#!/bin/bash
# PostgreSQL daily backup script for abada-shop
# Location: /opt/scripts/backup-postgres.sh
# Cron: 0 2 * * * /opt/scripts/backup-postgres.sh >> /var/log/abada-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_DIR="/opt/abada-shop/docker"
COMPOSE_CMD="docker compose -f ${COMPOSE_DIR}/docker-compose.yml -f ${COMPOSE_DIR}/docker-compose.prod.yml"
DB_CONTAINER="abada-shop-postgres-1"
DB_NAME="${POSTGRES_DB:-abada_shop}"
DB_USER="${POSTGRES_USER:-abada}"
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql.gz"
RETENTION_DAYS=30
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"

log() {
  echo "[${TIMESTAMP}] $1"
}

send_alert() {
  local level="$1"
  local message="$2"

  if [ -z "$SLACK_WEBHOOK" ]; then
    return
  fi

  curl -s -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    -d "{
      \"text\": \"[${level}] abada-shop 백업 알림: ${message}\"
    }" > /dev/null 2>&1 || true
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "=== PostgreSQL Backup Start ==="

# Run pg_dump
if docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"; then
  BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  log "[OK] Backup completed: ${BACKUP_FILE} (${BACKUP_SIZE})"
  send_alert "INFO" "일일 백업 완료: ${BACKUP_FILE} (${BACKUP_SIZE})"
else
  log "[ERROR] Backup failed!"
  rm -f "$BACKUP_FILE"
  send_alert "CRITICAL" "일일 백업 실패! 수동 확인 필요."
  exit 1
fi

# Delete old backups
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
if [ "$DELETED" -gt 0 ]; then
  log "[OK] Deleted ${DELETED} old backup(s) (older than ${RETENTION_DAYS} days)"
fi

# Show current backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "*.sql.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "[OK] Total backups: ${BACKUP_COUNT} files, ${TOTAL_SIZE}"

log "=== PostgreSQL Backup Complete ==="
