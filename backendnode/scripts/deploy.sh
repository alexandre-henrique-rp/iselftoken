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
#   ./scripts/deploy.sh migrate       # backend: prisma migrate deploy
#   ./scripts/deploy.sh seed          # backend: prisma db seed
#   ./scripts/deploy.sh seed:assets   # backend: envia imagens de storage/image/seed
#   ./scripts/deploy.sh seed:emails   # backend: seed email templates
#   ./scripts/deploy.sh seed:location # backend: seed estados/cidades (pesado)
#   ./scripts/deploy.sh reset         # backend: APAGA DB + PKI e re-seed do zero
#                                     #           (use --yes para pular confirmação)
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
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
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

# Valida secret obrigatório no arquivo de env (PKI keystore).
# Interpolação do docker compose não lê .env.prod (só .env/shell), então a
# checagem é feita aqui, direto no .env.prod, para o build falhar cedo e sem
# cair no passphrase default público de dev.
require_env_secret() {
  local file="$1" name="$2" default_public="${3:-}"
  if [ ! -f "$file" ]; then
    log_err "$file não encontrado (crie a partir de .env.prod.example)"
    exit 1
  fi
  local value
  value="$(grep -E "^${name}=" "$file" | head -n1 | cut -d= -f2- | tr -d '"' || true)"
  if [ -z "$value" ]; then
    log_err "$name ausente em $file — gere um valor com: openssl rand -hex 32"
    exit 1
  fi
  if [ -n "$default_public" ] && [ "$value" = "$default_public" ]; then
    log_err "$name em $file está com o valor default de dev ($default_public). Gere um valor real com: openssl rand -hex 32"
    exit 1
  fi
}

cleanup_unused_images() {
  echo "  → imagens não utilizadas após o deploy"
  docker image prune -af >/dev/null
}

# S35 — Auto-baseline da prod DB antes de `migrate deploy`.
# Detecta DBs criadas via `prisma db push` (esquema materializado mas
# `_prisma_migrations` vazia) e popula a tabela de tracking sem rodar
# SQL. Idempotente: no-op se já migrada.
# Uso interno: chamada antes de cada `migrate deploy`.
do_maybe_baseline() {
  echo "  → checando se prod DB precisa de sincronização de migrations"
  # O script TypeScript em si já detecta o estado (early-exit se DB já
  # migrada ou fresh). Aqui só garantimos que rode antes de migrate deploy.
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx ts-node scripts/baseline-prod-db.ts 2>&1 | sed 's/^/    /'
}

# S35 — Garante que redis e rabbitmq estão rodando antes de qualquer
# `up -d` da api (que tem depends_on com service_healthy). Idempotente:
# `docker compose up -d <svc>` no-op se já estiver rodando; pull + create
# se estiver ausente. Espera ambos passarem no healthcheck (timeout 60s).
# Cenário típico de falha que isso resolve: operador rodou a stack só
# com `docker compose up -d api` (sem redis/rabbitmq), ou usou `--no-deps`
# num momento em que redis/rabbitmq já tinham morrido.
do_ensure_dependencies() {
  echo "  → verificando redis + rabbitmq (idem-potente)"
  # `up -d` sem --no-deps cria/inicia o que estiver faltando, mantém o que já roda.
  docker compose -f "$COMPOSE_FILE" up -d redis rabbitmq 2>&1 | sed 's/^/    /'

  # `docker inspect` precisa do NOME do container, não do nome do serviço.
  # docker-compose.prod.yml define container_name: iselftoken_<svc>.
  declare -A CONTAINER_NAME=(
    [redis]="iselftoken_redis"
    [rabbitmq]="iselftoken_rabbitmq"
  )

  for svc in redis rabbitmq; do
    local container="${CONTAINER_NAME[$svc]}"
    echo "  → aguardando $container ficar healthy..."
    local i=0
    while [ "$i" -lt 12 ]; do
      local status
      status=$(docker inspect -f "{{.State.Health.Status}}" "$container" 2>/dev/null || echo "missing")
      if [ "$status" = "healthy" ]; then
        log_ok "$svc healthy"
        break
      fi
      i=$((i + 1))
      if [ "$i" -eq 12 ]; then
        log_err "$svc ($container) não ficou healthy em 12 tentativas (status: $status). Veja os logs:"
        docker compose -f "$COMPOSE_FILE" logs --tail=30 "$svc" >&2
        exit 1
      fi
      sleep 5
    done
  done
}

# =============================================================================
# BACKEND
# =============================================================================
do_update_backend() {
  check_clean_tree

  echo "  → validando secrets obrigatórios"
  require_env_secret ".env.prod" "KEY_STORAGE_PASSPHRASE" "dev-passphrase-change-in-production"
  # S35 — RABBITMQ_USER/PASS DEVEM existir em .env.prod para que tanto o
  # serviço rabbitmq (via ${RABBITMQ_USER:-admin}) quanto a api (via env_file)
  # leiam o mesmo valor. Sem checagem, a api cai no default 'admin'/'admin'
  # (env.schema.ts) e o broker cai em 'admin'/'admin' (compose default) —
  # funciona por sorte. Mas se o operador setar RABBITMQ_PASS só em .env.prod
  # (não em shell env), o broker ainda usa 'admin' e a api usa o valor do
  # .env.prod → mismatch → ACCESS_REFUSED no boot. Forçar ambos aqui.
  require_env_secret ".env.prod" "RABBITMQ_USER"
  require_env_secret ".env.prod" "RABBITMQ_PASS"
  log_ok "secrets validados"

  log_step 1 "git pull"
  git pull --ff-only
  log_ok "repo atualizado"

  log_step 2 "limpeza Docker antes do build"
  cleanup_docker_before_build
  log_ok "cache e imagens não utilizadas removidos"

  log_step 3 "garantir redis + rabbitmq rodando"
  do_ensure_dependencies

  log_step 4 "build + restart da api"
  docker compose -f "$COMPOSE_FILE" up -d --build --no-deps --force-recreate "$SERVICE_NAME"
  cleanup_unused_images
  log_ok "api reconstruído e em execução; imagens não utilizadas removidas"

  log_step 5 "migrate + seed emails"
  echo "  → sincronizando _prisma_migrations (auto-baseline se DB legada de db push)"
  do_maybe_baseline
  echo "  → prisma migrate deploy (SQLite — schema.sqlite.prisma)"
  # S35 — `prisma migrate deploy` em vez de `prisma db push`. O `db push`
  # tentava recriar tabelas já materializadas na prod (ex.: `startup_document_na`),
  # falhando com "table already exists". `migrate deploy` é idempotente e
  # rastreia a aplicação via tabela `_prisma_migrations`. O auto-baseline
  # acima popula `_prisma_migrations` quando ela está vazia (DB legada),
  # então `migrate deploy` se torna um no-op nesse caso.
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma
  echo "  → seed email templates"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npm run seed:emails
  log_ok "migrate + seed emails concluído"
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
  echo "  → sincronizando _prisma_migrations (auto-baseline se DB legada de db push)"
  do_maybe_baseline
  echo "  → prisma migrate deploy (SQLite — schema.sqlite.prisma)"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma
}

do_seed_backend() {
  if ! docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q .; then
    log_err "stack não está rodando (suba com 'update' antes de seedear)"
    exit 1
  fi
  echo "  → sincronizando schema SQLite (auto-baseline + migrate deploy)"
  do_maybe_baseline
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma
  echo "  → prisma db seed"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx prisma db seed
}

do_seed_emails_backend() {
  if ! docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q .; then
    log_err "stack não está rodando (suba com 'update' antes de seedear)"
    exit 1
  fi
  echo "  → seed email templates"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npm run seed:emails
}

do_seed_assets_backend() {
  if ! docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q .; then
    log_err "stack não está rodando (suba com 'update' antes de enviar assets)"
    exit 1
  fi
  echo "  → seed assets (storage/image/seed → storage configurado)"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx ts-node prisma/seeds/seed-assets.ts
}

do_seed_location_backend() {
  if ! docker compose -f "$COMPOSE_FILE" ps --services 2>/dev/null | grep -q .; then
    log_err "stack não está rodando (suba com 'update' antes de seedear)"
    exit 1
  fi
  echo "  → seed location (pesado — pode demorar)"
  docker compose -f "$COMPOSE_FILE" exec -T "$SERVICE_NAME" \
    npx ts-node prisma/seeds/seed-location.ts
}

# DESTRUTIVO — apaga db/iselftoken.db + db/.pki_keystore.json e re-cria
# tudo do zero. Use apenas em ambiente de demo ou quando quiser zerar
# o estado da plataforma. Quaisquer termos de adesao ja assinados
# ficam invalidados (PKI CAs novas).
#
# O backup vai para db/.backup/YYYYMMDD-HHMMSS/ antes da remocao,
# entao se voce errar o comando ainda da pra restaurar manualmente.
do_reset_backend() {
  local assume_yes="${ASSUME_YES:-}"

  log_warn "ATENCAO: este comando apaga TODOS os dados da plataforma."
  log_warn "  - DB SQLite (db/iselftoken.db)"
  log_warn "  - PKI keystore (db/.pki_keystore.json) -> CAs novas no restart"
  log_warn "  - Todos os termos de adesao ja assinados ficam invalidados"
  log_warn "  - Volumes de redis/rabbitmq NAO sao tocados"
  log_warn ""
  log_warn "Backup automatico vai para db/.backup/<timestamp>/ antes da remocao."

  if [ "$assume_yes" != "--yes" ]; then
    if [ "${INTERACTIVE:-0}" = "1" ]; then
      confirm "Confirma RESET do banco de dados da prod?" || {
        log_warn "Abortado."
        return 0
      }
    else
      log_err "Modo não-interativo requer --yes. Use: ./scripts/deploy.sh reset --yes"
      exit 1
    fi
  fi

  echo "  → parando container da api (libera file handles do SQLite)"
  docker compose -f "$COMPOSE_FILE" stop "$SERVICE_NAME"

  # Backup timestamped dentro de db/.backup/ para nao poluir o repo.
  local ts
  ts=$(date +%Y%m%d-%H%M%S)
  local backup_dir="./db/.backup/${ts}"
  mkdir -p "$backup_dir"
  echo "  → movendo artefatos atuais para $backup_dir/"
  for f in db/iselftoken.db db/iselftoken.db-journal db/.pki_keystore.json db/.pki_keystore.json.enc; do
    if [ -e "$f" ]; then
      mv "$f" "$backup_dir/"
      log_ok "backup: $f -> $backup_dir/"
    fi
  done

  echo "  → subindo api (CMD cria DB fresh + baseline + auto-popula CAs)"
  docker compose -f "$COMPOSE_FILE" up -d --no-deps --force-recreate "$SERVICE_NAME"

  echo "  → aguardando api ficar healthy..."
  local i=0
  while [ "$i" -lt 24 ]; do
    local h
    h=$(docker inspect -f "{{.State.Health.Status}}" iselftoken_api 2>/dev/null || echo "missing")
    if [ "$h" = "healthy" ]; then
      log_ok "api healthy"
      break
    fi
    i=$((i + 1))
    if [ "$i" -eq 24 ]; then
      log_err "api nao ficou healthy em 24 tentativas. Veja os logs:"
      docker compose -f "$COMPOSE_FILE" logs --tail=40 "$SERVICE_NAME" >&2
      exit 1
    fi
    sleep 5
  done

  echo "  → rodando seeds (main + emails + location)"
  do_seed_backend
  do_seed_emails_backend
  do_seed_location_backend

  log_ok "Reset concluido. Backup preservado em $backup_dir/"
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

  log_step 2 "build + restart"
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
  log_ok "container reconstruído e em execução"

  log_step 3 "cleanup"
  remove_old_images "iselftoken-frontend"
  log_ok "cleanup concluído"
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

run_seed_emails() {
  require_backend "seed:emails"
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  SEED EMAILS — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  if [ "$INTERACTIVE" = "1" ]; then
    confirm "Confirma seed de email templates?" || { echo "Abortado."; return 0; }
  fi
  do_seed_emails_backend
  echo -e "\n${GREEN}Seed de email templates concluído.${NC}"
}

run_seed_assets() {
  require_backend "seed:assets"
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  SEED ASSETS — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  if [ "$INTERACTIVE" = "1" ]; then
    confirm "Confirma envio dos assets?" || { echo "Abortado."; return 0; }
  fi
  do_seed_assets_backend
  echo -e "\n${GREEN}Assets enviados.${NC}"
}

run_seed_location() {
  require_backend "seed:location"
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  SEED LOCATION — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  echo -e "${YELLOW}  ⚠ Este seed é pesado (estados/cidades). Pode demorar.${NC}"
  if [ "$INTERACTIVE" = "1" ]; then
    confirm "Confirma seed de localização?" || { echo "Abortado."; return 0; }
  fi
  do_seed_location_backend
  echo -e "\n${GREEN}Seed de localização concluído.${NC}"
}

run_reset() {
  require_backend "reset"
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  RESET — ${BOLD}$MODE${NC} ${RED}(destrutivo)${NC}"
  echo -e "${CYAN}=================================${NC}"
  ASSUME_YES="${2:-}" do_reset_backend
  echo -e "\n${GREEN}Reset concluído.${NC}"
}

show_menu() {
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}  deploy CLI — ${BOLD}$MODE${NC}"
  echo -e "${CYAN}=================================${NC}"
  echo "  1) update   — git pull, rebuild, replace, cleanup"
  echo "  2) logs     — tail dos containers (Ctrl+C para voltar)"
  if [ "$MODE" = "backendnode" ]; then
    echo "  3) migrate    — prisma migrate deploy (SQLite)"
    echo "  4) seed       — prisma db seed (main)"
    echo "  5) seed:assets  — envia imagens de storage/image/seed"
    echo "  6) seed:emails  — seed de email templates"
    echo "  7) seed:location — seed de estados/cidades (pesado)"
    echo "  8) reset      — ⚠ APAGA DB + PKI e re-seed do zero (--yes)"
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
  seed:assets)   run_seed_assets ;;
  seed:emails)   run_seed_emails ;;
  seed:location) run_seed_location ;;
  reset)         run_reset "${2:-}" ;;
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
        5)
          if [ "$MODE" = "backendnode" ]; then
            run_seed_assets
          else
            log_err "Opção 5 (seed:assets) só disponível no backendnode"
          fi
          ;;
        6)
          if [ "$MODE" = "backendnode" ]; then
            run_seed_emails
          else
            log_err "Opção 6 (seed:emails) só disponível no backendnode"
          fi
          ;;
        7)
          if [ "$MODE" = "backendnode" ]; then
            run_seed_location
          else
            log_err "Opção 7 (seed:location) só disponível no backendnode"
          fi
          ;;
        8)
          if [ "$MODE" = "backendnode" ]; then
            run_reset
          else
            log_err "Opção 8 (reset) só disponível no backendnode"
          fi
          ;;
        0|q|quit|sair) echo "Até mais."; exit 0 ;;
        *)        log_err "Opção inválida: $opt" ;;
      esac
    done
    ;;
  -h|--help|help)
    sed -n '2,18p' "$0"
    ;;
  *)
    log_err "Argumento inválido: $1"
    echo "Uso: $0 [update|logs|migrate|seed|seed:assets|seed:emails|seed:location|reset]"
    exit 1
    ;;
esac
