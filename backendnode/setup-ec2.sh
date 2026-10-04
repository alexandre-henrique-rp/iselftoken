#!/usr/bin/env bash
# ============================================================
# setup-ec2.sh — Provisiona EC2 Debian para IselfToken (apresentação)
#
# Uso:
#   chmod +x setup-ec2.sh
#   ./setup-ec2.sh
#
# Pré-requisito: rodar como usuário com sudo (ex: admin no Debian AWS)
# ============================================================
set -euo pipefail

# ==========================================
# VARIÁVEIS — Ajuste antes de executar
# ==========================================
APP_DIR="$HOME/app"
REPO_CLONE_CMD="git clone <SEU_REPOSITORIO_AQUI> ${APP_DIR}"
BRANCH="main"
COMPOSE_FILE="docker-compose.prod.yml"

# ==========================================
# Cores para output
# ==========================================
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ==========================================
# 1. Atualizar sistema Debian
# ==========================================
echo ""
echo "=========================================="
echo " IselfToken — Setup EC2 (Apresentação)"
echo "=========================================="
echo ""

log "Atualizando pacotes do sistema..."
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y \
    curl \
    wget \
    git \
    ca-certificates \
    gnupg \
    lsb-release \
    unzip \
    htop \
    nano

# ==========================================
# 2. Instalar Docker Engine (método oficial)
# ==========================================
if command -v docker &> /dev/null; then
    log "Docker já instalado: $(docker --version)"
else
    log "Instalando Docker Engine..."

    # Adiciona chave GPG oficial do Docker
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg

    # Adiciona repositório Docker
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Instala Docker
    sudo apt-get update -y
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    log "Docker instalado: $(docker --version)"
fi

# ==========================================
# 3. Configurar Docker sem sudo
# ==========================================
log "Configurando Docker para rodar sem sudo..."
if ! getent group docker > /dev/null 2>&1; then
    sudo groupadd docker
fi

if ! groups "$USER" | grep -q '\bdocker\b'; then
    sudo usermod -aG docker "$USER"
    warn "Usuário adicionado ao grupo docker. O script continuará com sudo para esta sessão."
    warn "Na próxima sessão SSH, docker funcionará sem sudo."
fi

# Garante que o Docker está rodando
sudo systemctl enable docker
sudo systemctl start docker

# ==========================================
# 4. Clonar o projeto
# ==========================================
if [ -d "$APP_DIR" ]; then
    warn "Diretório ${APP_DIR} já existe. Pulando clone..."
    cd "$APP_DIR"
    git fetch origin
    git checkout "$BRANCH"
    git pull origin "$BRANCH"
else
    log "Clonando repositório..."
    # ⚠️  EDITE a variável REPO_CLONE_CMD no topo do script com seu git clone
    if [[ "$REPO_CLONE_CMD" == *"<SEU_REPOSITORIO_AQUI>"* ]]; then
        err "Configure a variável REPO_CLONE_CMD no topo do script com o comando git clone do seu repositório."
    fi
    eval "$REPO_CLONE_CMD"
    cd "$APP_DIR"
    git checkout "$BRANCH"
fi

# Navega para o backend
cd "${APP_DIR}/backendnode"

# ==========================================
# 5. Criar diretórios necessários
# ==========================================
log "Criando diretórios de dados..."
mkdir -p ./data
mkdir -p ./storage
mkdir -p ./icons
mkdir -p ./uploads

# ==========================================
# 6. Configurar .env.prod
# ==========================================
if [ ! -f .env.prod ]; then
    if [ -f .env.prod.example ]; then
        cp .env.prod.example .env.prod
        warn "Arquivo .env.prod criado a partir do .env.prod.example"
        warn "⚠️  EDITE o .env.prod com suas credenciais antes de subir!"
    else
        err "Arquivo .env.prod.example não encontrado. Crie manualmente o .env.prod"
    fi
else
    log ".env.prod já existe."
fi

# ==========================================
# 7. Subir containers (usa sudo nesta sessão se grupo docker não carregou)
# ==========================================
log "Subindo containers com Docker Compose..."

# Usa sg para executar no grupo docker na sessão atual (evita re-login)
DOCKER_CMD="docker"
if ! docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
    warn "Usando sudo para docker nesta sessão (re-login para usar sem sudo)"
fi

$DOCKER_CMD compose -f "$COMPOSE_FILE" build --no-cache
$DOCKER_CMD compose -f "$COMPOSE_FILE" up -d

# Aguarda API ficar healthy
log "Aguardando API inicializar..."
RETRIES=0
MAX_RETRIES=30
until $DOCKER_CMD compose -f "$COMPOSE_FILE" exec -T api node -e "const h=require('http');h.get('http://localhost:7077/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))" 2>/dev/null; do
    RETRIES=$((RETRIES + 1))
    if [ $RETRIES -ge $MAX_RETRIES ]; then
        warn "API não respondeu após ${MAX_RETRIES} tentativas. Verificando logs..."
        $DOCKER_CMD compose -f "$COMPOSE_FILE" logs --tail=30 api
        break
    fi
    sleep 2
done

# ==========================================
# 8. Executar migrations se banco estiver vazio
# ==========================================
log "Verificando estado do banco de dados..."

DB_FILE="./data/iselftoken.db"

if [ ! -f "$DB_FILE" ] || [ ! -s "$DB_FILE" ]; then
    log "Banco SQLite vazio ou inexistente. Executando migrations..."
    $DOCKER_CMD compose -f "$COMPOSE_FILE" exec -T api \
        npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma
    log "Migrations aplicadas com sucesso!"
else
    log "Banco SQLite já existe ($(du -h "$DB_FILE" | cut -f1)). Migrations não executadas."
    warn "Para forçar migrations: docker compose -f $COMPOSE_FILE exec api npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma"
fi

# ==========================================
# 9. Status final
# ==========================================
echo ""
echo "=========================================="
echo -e "${GREEN} IselfToken — Deploy Concluído!${NC}"
echo "=========================================="
echo ""
echo "  API:        http://$(curl -s ifconfig.me 2>/dev/null || echo '<IP_PUBLICO>'):7077"
echo "  Swagger:    http://$(curl -s ifconfig.me 2>/dev/null || echo '<IP_PUBLICO>'):7077/docs"
echo "  RabbitMQ:   http://$(curl -s ifconfig.me 2>/dev/null || echo '<IP_PUBLICO>'):15672"
echo "  SQLite DB:  ${APP_DIR}/backendnode/data/iselftoken.db"
echo ""
echo "  Comandos úteis:"
echo "    Logs:      docker compose -f $COMPOSE_FILE logs -f api"
echo "    Restart:   docker compose -f $COMPOSE_FILE restart api"
echo "    Stop:      docker compose -f $COMPOSE_FILE down"
echo "    Rebuild:   docker compose -f $COMPOSE_FILE up -d --build"
echo "    Migrate:   docker compose -f $COMPOSE_FILE exec api npx prisma migrate deploy --schema=prisma/schema.sqlite.prisma"
echo ""
warn "Lembre-se: edite .env.prod com suas credenciais reais!"
echo ""
