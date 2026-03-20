#!/bin/bash

# ─── 주차관리 시스템 실행 스크립트 ────────────────────────────────────────────
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$REPO_DIR/apps/api"
ADMIN_DIR="$REPO_DIR/apps/admin"
MOBILE_DIR="$REPO_DIR/apps/mobile"
LOG_DIR="$REPO_DIR/logs"

# pnpm 경로 설정
export PNPM_HOME="/Users/soul/Library/pnpm"
export PATH="$PNPM_HOME:$PATH"

# ─── 색상 정의 ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────
log()  { echo -e "${BOLD}[$(date '+%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }
err()  { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "${CYAN}→${NC} $1"; }

check_pnpm() {
  if ! command -v pnpm &>/dev/null; then
    err "pnpm을 찾을 수 없습니다."
    info "설치: curl -fsSL https://get.pnpm.io/install.sh | sh -"
    exit 1
  fi
}

# ─── 명령 파싱 ────────────────────────────────────────────────────────────────
CMD="${1:-dev}"

# ─── 도움말 ───────────────────────────────────────────────────────────────────
usage() {
  echo ""
  echo -e "${BOLD}🅿 주차관리 시스템 실행 스크립트${NC}"
  echo ""
  echo "사용법:"
  echo "  ./start.sh [명령]"
  echo ""
  echo "명령:"
  echo -e "  ${GREEN}dev${NC}      파일 변경 감지 + 자동 재시작 (기본값, 권장)"
  echo "  start    백그라운드 실행 (로그 파일 기록)"
  echo "  stop     실행 중인 모든 서버 종료"
  echo "  setup    초기 설정 (의존성 설치 + DB 마이그레이션 + 시드)"
  echo "  status   서버 상태 확인"
  echo "  logs     백그라운드 서버 로그 보기"
  echo "  help     이 도움말 출력"
  echo ""
  echo "접속 주소:"
  echo "  API    http://localhost:4000"
  echo "  Admin  http://localhost:5173"
  echo "  Mobile http://localhost:5174"
  echo ""
  echo "테스트 계정:"
  echo "  admin@demo.com / admin123"
  echo ""
}

# ─── LAN IP 감지 (공통 사용) ──────────────────────────────────────────────────
get_lan_ip() {
  ipconfig getifaddr en0 2>/dev/null || \
  ipconfig getifaddr en1 2>/dev/null || \
  hostname -I 2>/dev/null | awk '{print $1}' || \
  echo ""
}

print_urls() {
  local lan_ip
  lan_ip=$(get_lan_ip)
  echo ""
  echo -e "  ${BOLD}API 서버${NC}  →  ${CYAN}http://localhost:4000${NC}"
  echo -e "  ${BOLD}Admin${NC}     →  ${CYAN}http://localhost:5173${NC}"
  echo -e "  ${BOLD}Mobile${NC}    →  ${CYAN}http://localhost:5174${NC}"
  if [ -n "$lan_ip" ]; then
    echo ""
    echo -e "  ${BOLD}📱 같은 네트워크에서 접속 (QR 스캔용)${NC}"
    echo -e "  ${BOLD}Admin${NC}     →  ${YELLOW}http://${lan_ip}:5173${NC}"
    echo -e "  ${BOLD}Mobile${NC}    →  ${YELLOW}http://${lan_ip}:5174${NC}"
    echo ""
    echo -e "  ${GREEN}💡 Admin을 ${BOLD}http://${lan_ip}:5173${NC}${GREEN} 으로 열면"
    echo -e "     QR 코드가 자동으로 LAN IP를 사용합니다${NC}"
  fi
  echo ""
  echo -e "  로그인: ${YELLOW}admin@demo.com${NC} / ${YELLOW}admin123${NC}"
  echo ""
}

check_db() {
  if [ ! -f "$API_DIR/.env" ]; then
    warn ".env 파일이 없습니다. 초기 설정을 먼저 실행하세요:"
    info "  ./start.sh setup"
    exit 1
  fi
  if [ ! -f "$API_DIR/prisma/dev.db" ] && [ ! -f "$API_DIR/dev.db" ]; then
    warn "데이터베이스가 없습니다. 초기 설정을 먼저 실행하세요:"
    info "  ./start.sh setup"
    exit 1
  fi
}

# ─── dev 모드 (파일 변경 감지 + 자동 재시작) ─────────────────────────────────
cmd_dev() {
  echo ""
  echo -e "${BOLD}🅿 주차관리 시스템 — 개발 모드 (watch)${NC}"
  echo ""
  echo -e "  ${GREEN}파일 변경 시 자동으로 재시작됩니다${NC}"
  echo -e "  종료: ${RED}Ctrl+C${NC}"

  check_pnpm
  check_db

  print_urls

  cd "$REPO_DIR"
  # concurrently로 3개 서버 동시 실행
  # --kill-others-on-fail: 하나가 비정상 종료되면 나머지도 종료
  # --restart-tries 5: 비정상 종료 시 최대 5회 재시작
  pnpm exec concurrently \
    --names "API,ADMIN,MOBILE" \
    --prefix-colors "cyan.bold,blue.bold,magenta.bold" \
    --prefix "[{name}]" \
    --timestamp-format "HH:mm:ss" \
    --kill-others-on-fail \
    --restart-tries 5 \
    --restart-after 1000 \
    "cd apps/api && pnpm dev" \
    "cd apps/admin && pnpm dev" \
    "cd apps/mobile && pnpm dev"
}

# ─── 초기 설정 ────────────────────────────────────────────────────────────────
cmd_setup() {
  log "${BOLD}초기 설정을 시작합니다...${NC}"
  echo ""

  check_pnpm

  # 의존성 설치
  info "의존성 설치 중..."
  cd "$REPO_DIR"
  pnpm install
  ok "의존성 설치 완료"

  # .env 파일 생성
  if [ ! -f "$API_DIR/.env" ]; then
    info ".env 파일 생성 중..."
    cp "$API_DIR/.env.example" "$API_DIR/.env" 2>/dev/null || \
    cat > "$API_DIR/.env" <<'ENVEOF'
DATABASE_URL="file:./dev.db"
JWT_SECRET="parking-dev-secret-min-32-chars-ok"
JWT_EXPIRES_IN="15m"
PORT=4000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN="http://localhost:5173,http://localhost:5174"
SENSOR_WEBHOOK_SECRET="dev-sensor-secret"
ANPR_WEBHOOK_SECRET="dev-anpr-secret"
SENTRY_DSN=""
OTEL_EXPORTER_OTLP_ENDPOINT=""
ENVEOF
    ok ".env 파일 생성 완료"
  else
    ok ".env 파일 이미 존재 (건너뜀)"
  fi

  # Prisma 클라이언트 생성
  info "Prisma 클라이언트 생성 중..."
  cd "$API_DIR"
  pnpm db:generate
  ok "Prisma 클라이언트 생성 완료"

  # DB 마이그레이션
  info "DB 마이그레이션 실행 중..."
  pnpm db:migrate
  ok "DB 마이그레이션 완료"

  # 시드 데이터
  info "시드 데이터 삽입 중..."
  pnpm db:seed
  ok "시드 데이터 완료"

  echo ""
  echo -e "${GREEN}${BOLD}✅ 초기 설정이 완료되었습니다!${NC}"
  echo ""
  echo "이제 실행하려면:"
  echo -e "  ${CYAN}./start.sh${NC}"
  echo ""
}

# ─── 서버 실행 ────────────────────────────────────────────────────────────────
start_api() {
  mkdir -p "$LOG_DIR"
  info "API 서버 시작 중... (포트 4000)"
  cd "$API_DIR"
  nohup pnpm dev > "$LOG_DIR/api.log" 2>&1 &
  echo $! > "$LOG_DIR/api.pid"
  ok "API 서버 시작됨 (PID: $(cat "$LOG_DIR/api.pid"))"
}

start_admin() {
  mkdir -p "$LOG_DIR"
  info "Admin 대시보드 시작 중... (포트 5173)"
  cd "$ADMIN_DIR"
  nohup pnpm dev > "$LOG_DIR/admin.log" 2>&1 &
  echo $! > "$LOG_DIR/admin.pid"
  ok "Admin 대시보드 시작됨 (PID: $(cat "$LOG_DIR/admin.pid"))"
}

start_mobile() {
  mkdir -p "$LOG_DIR"
  info "모바일 시뮬레이터 시작 중... (포트 5174)"
  cd "$MOBILE_DIR"
  nohup pnpm dev > "$LOG_DIR/mobile.log" 2>&1 &
  echo $! > "$LOG_DIR/mobile.pid"
  ok "모바일 시뮬레이터 시작됨 (PID: $(cat "$LOG_DIR/mobile.pid"))"
}

wait_for_api() {
  local max=20
  local count=0
  info "API 서버 준비 대기 중..."
  while [ $count -lt $max ]; do
    if curl -sf http://localhost:4000/health > /dev/null 2>&1; then
      ok "API 서버 응답 확인"
      return 0
    fi
    sleep 1
    count=$((count + 1))
  done
  warn "API 서버가 응답하지 않습니다. 로그를 확인하세요: ./start.sh logs"
  return 1
}

cmd_start() {
  echo ""
  echo -e "${BOLD}🅿 주차관리 시스템을 백그라운드로 시작합니다${NC}"
  echo ""

  check_pnpm
  check_db

  start_api
  sleep 3
  wait_for_api

  start_admin
  start_mobile

  echo ""
  echo -e "${GREEN}${BOLD}✅ 모든 서버가 백그라운드에서 실행 중입니다${NC}"
  print_urls
  echo -e "  종료:   ${RED}./start.sh stop${NC}"
  echo -e "  로그:   ${CYAN}./start.sh logs${NC}"
  echo ""
}

# ─── 서버 종료 ────────────────────────────────────────────────────────────────
stop_pid() {
  local name="$1"
  local pidfile="$LOG_DIR/$name.pid"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      ok "$name 종료됨 (PID: $pid)"
    else
      warn "$name 프로세스를 찾을 수 없음 (이미 종료됨?)"
    fi
    rm -f "$pidfile"
  else
    warn "$name PID 파일 없음"
  fi
}

cmd_stop() {
  echo ""
  log "서버를 종료합니다..."
  mkdir -p "$LOG_DIR"
  stop_pid "api"
  stop_pid "admin"
  stop_pid "mobile"

  # 포트 기반 강제 종료 (백업)
  for port in 4000 5173 5174; do
    pid=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pid" ]; then
      kill "$pid" 2>/dev/null && ok "포트 $port 프로세스 종료됨"
    fi
  done

  echo ""
  ok "모든 서버가 종료되었습니다."
  echo ""
}

# ─── 상태 확인 ────────────────────────────────────────────────────────────────
cmd_status() {
  echo ""
  echo -e "${BOLD}서버 상태${NC}"
  echo ""

  check_port() {
    local name="$1"
    local port="$2"
    local pidfile="$LOG_DIR/$name.pid"
    local pid_info=""

    if [ -f "$pidfile" ]; then
      pid_info="(PID: $(cat "$pidfile"))"
    fi

    if curl -sf "http://localhost:$port" > /dev/null 2>&1 || \
       curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
      echo -e "  ${GREEN}●${NC} ${BOLD}$name${NC} — 포트 $port 응답 중 $pid_info"
    else
      echo -e "  ${RED}●${NC} ${BOLD}$name${NC} — 포트 $port 응답 없음 $pid_info"
    fi
  }

  check_port "API" "4000"
  check_port "Admin" "5173"
  check_port "Mobile" "5174"

  echo ""

  # DB 상태
  local db_path=""
  if [ -f "$API_DIR/prisma/dev.db" ]; then
    db_path="$API_DIR/prisma/dev.db"
  elif [ -f "$API_DIR/dev.db" ]; then
    db_path="$API_DIR/dev.db"
  fi

  if [ -n "$db_path" ]; then
    local size
    size=$(du -sh "$db_path" 2>/dev/null | cut -f1)
    ok "DB 파일 존재 ($db_path, $size)"
  else
    err "DB 파일 없음 — ./start.sh setup 실행 필요"
  fi

  echo ""
}

# ─── 로그 보기 ────────────────────────────────────────────────────────────────
cmd_logs() {
  local target="${2:-all}"
  echo ""

  show_log() {
    local name="$1"
    local logfile="$LOG_DIR/$name.log"
    if [ -f "$logfile" ]; then
      echo -e "${BOLD}── $name 로그 ──────────────────────────────${NC}"
      tail -30 "$logfile"
      echo ""
    else
      warn "$name 로그 파일 없음"
    fi
  }

  if [ "$target" = "api" ]; then
    show_log "api"
  elif [ "$target" = "admin" ]; then
    show_log "admin"
  elif [ "$target" = "mobile" ]; then
    show_log "mobile"
  else
    show_log "api"
    show_log "admin"
    show_log "mobile"
  fi

  echo "실시간 로그 보기:"
  echo -e "  ${CYAN}tail -f $LOG_DIR/api.log${NC}"
  echo ""
}

# ─── 명령 실행 ────────────────────────────────────────────────────────────────
case "$CMD" in
  dev)     cmd_dev ;;
  start)   cmd_start ;;
  setup)   cmd_setup ;;
  stop)    cmd_stop ;;
  status)  cmd_status ;;
  logs)    cmd_logs "$@" ;;
  help|--help|-h) usage ;;
  *)
    err "알 수 없는 명령: $CMD"
    usage
    exit 1
    ;;
esac
