#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy.sh — CLI de update/logs/migrate/seed para iselftoken
# Detecta automaticamente em qual repo está rodando.
#
# Uso:
#   ./scripts/deploy.sh               # menu interativo
#   ./scripts/deploy.sh update        # não-interativo: atualiza
#   ./scripts/deploy.sh logs          # não-interativo: tail logs
#   ./scripts/deploy.sh migrate       # backend: prisma db push
#   ./scripts/deploy.sh seed          # backend: prisma db seed
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --- Detecção de contexto (qual repo estou) ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$APP_DIR"

if [ -f "docker-compose.prod.yml" ]; then
  MODE="backendnode"
  COMPOSE_FILE="docker-compose.prod.yml"
  SERVICE_NAME="api"
elif [ -f "Dockerfile" ] && [ -d "app" ]; then
  MODE="frontend"
  IMAGE_NAME="iselftoken-frontend:latest"
  CONTAINER_NAME="iselftoken_frontend"
else
  echo -e "${RED}ERRO: rode este script na raiz de backendnode/ ou frontend/${NC}" >&2
  echo "  Diretório atual: $APP_DIR" >&2
  exit 1
fi

# --- Helpers ---
log_step() { echo -e "\n${YELLOW}[$1/3]${NC} ${BOLD}$2${NC}"; }
log_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
log_err()  { echo -e "${RED}✗ $1${NC}" >&2; }
confirm() {
  read -p "$1 (s/N): " ans
  [[ "$ans" =~ ^[sSyY]$ ]]
}
check_clean_tree() {
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    log_err "Working tree tem mudanças não commitadas. Faça commit/stash antes."
    git status --short >&2
    exit 1
  fi
}
cleanup_docker_before_build() {
  echo "  → cache de build não utilizado"
  docker builder prune -af >/dev/null
  echo "  → imagens não utilizadas"
  docker image prune -af >/dev/null
}

cleanup_unused_images() {
  echo "  → imagens não utilizadas após o deploy"
  docker image prune -af >/dev/null
}

# =============================================================================
# BACKEND
# =============================================================================
do_update_backend() {
  check_clean_tree

  log_step 1 "git pull"
  git pull --ff-only
  log_ok "repo atualizado"

  log_step 2 "build + restart (--no-deps: redis/rabbitmq intactos)"
  docker compose -f "$COMPOSE_FILE" up -d --build --no-deps --force-recreate "$SERVICE_NAME"
  log_ok "api reconstruído e em execução"

  log_step 3 "cleanup"
  cleanup_unused_images
  log_ok "cleanup concluído"
}

do_logs_backend() {
  if ! docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q .; then
    log_err "stack não está rodando"
    exit 1
  fi
  docker compose -f "$COMPOSE_FILE" logs -f --tail 100
}

do_migrate_backend() {
  if ! docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q .; then
    log_err "stack não está rodando (suba com 'update' antes de migrar)"
    exit 1
  fi
  echo "  → prisma db push (SQLite — schema.sqlite.prisma)"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx prisma db push --schema=prisma/schema.sqlite.prisma
}

do_seed_backend() {
  if ! docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q .; then
    log_err "stack não está rodando (suba com 'update' antes de seedear)"
    exit 1
  fi
  echo "  → prisma db seed"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx prisma db seed
}

# =============================================================================
# FRONTEND
# =============================================================================
do_update_frontend() {
  check_clean_tree
  if [ ! -f ".env" ]; then
    log_err ".env não encontrado em $APP_DIR (crie com VITE_API_URL=...)"
    exit 1
  fi

  log_step 1 "git pull"
  git pull --ff-only
  log_ok "repo atualizado"

  log_step 2 "limpeza Docker antes do build"
  cleanup_docker_before_build
  log_ok "cache e imagens não utilizadas removidos"

  log_step 3 "build + restart"
  docker build -t "$IMAGE_NAME" .
  if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --env-file .env \
    -p 5173:3000 \
    "$IMAGE_NAME"
  cleanup_unused_images
  log_ok "container reconstruído e em execução; imagens não utilizadas removidas"
}

do_logs_frontend() {
  if ! docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log_err "container $CONTAINER_NAME não existe"
    exit 1
  fi
  if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null)" != "true" ]; then
    log_err "container $CONTAINER_NAME não está rodando"
    exit 1
  fi
  docker logs -f "$CONTAINER_NAME" --tail 100
}

# =============================================================================
# Dispatcher
# =============================================================================
run_update() {
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  UPDATE — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  if [ "$INTERACTIVE" = "1" ]; then
    confirm "Confirma update?" || { echo "Abortado."; return 0; }
  fi
  case "$MODE" in
    backendnode) do_update_backend ;;
    frontend)    do_update_frontend ;;
  esac
  echo -e "\n${GREEN}Update concluído.${NC}"
}

run_logs() {
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  LOGS — ${BOLD}$MODE${NC} ${CYAN}(Ctrl+C para sair)${NC}"
  echo -e "${CYAN}=================================${NC}"
  case "$MODE" in
    backendnode) do_logs_backend ;;
    frontend)    do_logs_frontend ;;
  esac
}

require_backend() {
  if [ "$MODE" != "backendnode" ]; then
    log_err "'$1' só está disponível no backendnode (não faz sentido no frontend)"
    exit 1
  fi
}

run_migrate() {
  require_backend "migrate"
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  MIGRATE — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  if [ "$INTERACTIVE" = "1" ]; then
    confirm "Confirma migrate?" || { echo "Abortado."; return 0; }
  fi
  do_migrate_backend
  echo -e "\n${GREEN}Migrate concluído.${NC}"
}

run_seed() {
  require_backend "seed"
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  SEED — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  if [ "$INTERACTIVE" = "1" ]; then
    confirm "Confirma seed?" || { echo "Abortado."; return 0; }
  fi
  do_seed_backend
  echo -e "\n${GREEN}Seed concluído.${NC}"
}

show_menu() {
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  deploy CLI — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  echo "  1) update   — git pull, rebuild, replace, cleanup"
  echo "  2) logs     — tail dos containers (Ctrl+C para voltar)"
  if [ "$MODE" = "backendnode" ]; then
    echo "  3) migrate  — prisma db push (SQLite)"
    echo "  4) seed     — prisma db seed"
  fi
  echo "  0) sair"
  echo -e "${CYAN}=================================${NC}"
}

# =============================================================================
# Main
# =============================================================================
INTERACTIVE=0
case "${1:-}" in
  update)        run_update ;;
  logs)          run_logs ;;
  migrate)       run_migrate ;;
  seed)          run_seed ;;
  "")
    INTERACTIVE=1
    while true; do
      show_menu
      read -p "Escolha: " opt
      echo
      case "$opt" in
        1)        run_update ;;
        2)        run_logs ;;
        3)
          if [ "$MODE" = "backendnode" ]; then
            run_migrate
          else
            log_err "Opção 3 (migrate) só disponível no backendnode"
          fi
          ;;
        4)
          if [ "$MODE" = "backendnode" ]; then
            run_seed
          else
            log_err "Opção 4 (seed) só disponível no backendnode"
          fi
          ;;
        0|q|quit|sair) echo "Até mais."; exit 0 ;;
        *)        log_err "Opção inválida: $opt" ;;
      esac
    done
    ;;
  -h|--help|help)
    sed -n '2,12p' "$0"
    ;;
  *)
    log_err "Argumento inválido: $1"
    echo "Uso: $0 [update|logs|migrate|seed]"
    exit 1
    ;;
esac
