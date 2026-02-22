#!/bin/bash
# Server health check script for abada-shop
# Location: /opt/scripts/health-check.sh
# Cron: */5 * * * * /opt/scripts/health-check.sh >> /var/log/abada-health.log 2>&1

set -euo pipefail

SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
COMPOSE_DIR="/opt/abada-shop/docker"
COMPOSE_CMD="docker compose -f ${COMPOSE_DIR}/docker-compose.yml -f ${COMPOSE_DIR}/docker-compose.prod.yml"
SERVICES=("api" "web" "postgres" "redis" "cloudflared")
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

log() {
  echo "[${TIMESTAMP}] $1"
}

send_alert() {
  local level="$1"
  local message="$2"

  log "[${level}] ${message}"

  if [ -z "$SLACK_WEBHOOK" ]; then
    return
  fi

  local color
  color=$([ "$level" = "CRITICAL" ] && echo "danger" || echo "warning")

  curl -s -X POST "$SLACK_WEBHOOK" \
    -H 'Content-type: application/json' \
    -d "{
      \"attachments\": [{
        \"color\": \"${color}\",
        \"title\": \"[${level}] abada-shop 서버 알림\",
        \"fields\": [
          { \"title\": \"메시지\", \"value\": \"${message}\", \"short\": false },
          { \"title\": \"시간\", \"value\": \"${TIMESTAMP}\", \"short\": true },
          { \"title\": \"서버\", \"value\": \"ws-248-247\", \"short\": true }
        ]
      }]
    }" > /dev/null 2>&1 || true
}

check_service() {
  local service="$1"
  local running
  running=$($COMPOSE_CMD ps --status running -q "$service" 2>/dev/null || true)

  if [ -z "$running" ]; then
    send_alert "CRITICAL" "${service} 컨테이너가 중지되었습니다. 재시작을 시도합니다."
    $COMPOSE_CMD restart "$service" 2>/dev/null || \
      send_alert "CRITICAL" "${service} 재시작 실패. 수동 확인 필요."
  else
    log "[OK] ${service} running"
  fi
}

check_api_health() {
  local http_code
  http_code=$(curl -sf -o /dev/null -w "%{http_code}" \
    --max-time 10 https://api.shop.abada.kr/health 2>/dev/null || echo "000")

  if [ "$http_code" != "200" ]; then
    send_alert "WARNING" "API 헬스체크 실패 (HTTP ${http_code})"
  else
    log "[OK] API health check passed"
  fi
}

check_disk_usage() {
  local usage
  usage=$(df /opt 2>/dev/null | tail -1 | awk '{print $5}' | tr -d '%' || echo "0")

  if [ "$usage" -gt 90 ]; then
    send_alert "CRITICAL" "디스크 사용률 ${usage}% (임계값: 90%)"
  elif [ "$usage" -gt 85 ]; then
    send_alert "WARNING" "디스크 사용률 ${usage}% (임계값: 85%)"
  else
    log "[OK] Disk usage: ${usage}%"
  fi
}

check_memory_usage() {
  local mem_usage
  mem_usage=$(free 2>/dev/null | awk '/^Mem:/{printf "%.0f", $3/$2*100}' || echo "0")

  if [ "$mem_usage" -gt 90 ]; then
    send_alert "WARNING" "메모리 사용률 ${mem_usage}% (임계값: 90%)"
  else
    log "[OK] Memory usage: ${mem_usage}%"
  fi
}

# Main execution
log "=== Health Check Start ==="

for service in "${SERVICES[@]}"; do
  check_service "$service"
done

check_api_health
check_disk_usage
check_memory_usage

log "=== Health Check Complete ==="
