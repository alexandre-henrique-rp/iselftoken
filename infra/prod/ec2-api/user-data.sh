#!/bin/bash
#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# User Data — EC2 API (NestJS + Nginx) — Debian 12 — PROD
# Fluxo: Instala Docker + Git → Clona repo → Cria .env.prod → Sobe containers
# =============================================================================

export DEBIAN_FRONTEND=noninteractive

# ========================= CONFIGURAÇÃO EXTERNA =============================
# O arquivo abaixo deve ser criado fora do repositório, com owner root e modo 600.
# Exemplo de caminho: /etc/iselftoken/ec2-api.env
SECRETS_FILE="${SECRETS_FILE:-/etc/iselftoken/ec2-api.env}"

if [[ ! -r "${SECRETS_FILE}" ]]; then
  echo "Arquivo de secrets ausente ou ilegível: ${SECRETS_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
. "${SECRETS_FILE}"
set +a

# Segredos obrigatórios são validados antes de qualquer alteração na máquina.
: "${GITHUB_USER:?GITHUB_USER ausente no arquivo de secrets}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN ausente no arquivo de secrets}"
: "${JWT_SECRET:?JWT_SECRET ausente no arquivo de secrets}"
: "${WEBHOOK_HASH_SECRET:?WEBHOOK_HASH_SECRET ausente no arquivo de secrets}"
: "${RABBITMQ_PASS:?RABBITMQ_PASS ausente no arquivo de secrets}"
: "${SMTP_USER:?SMTP_USER ausente no arquivo de secrets}"
: "${SMTP_PASS:?SMTP_PASS ausente no arquivo de secrets}"
: "${EFI_WEBHOOK_HMAC_SECRET:?EFI_WEBHOOK_HMAC_SECRET ausente no arquivo de secrets}"

# Configuração não sensível e valores opcionais.
GITHUB_REPO="${GITHUB_REPO:-https://github.com/iSelfToken/backendnode.git}"
APP_DIR="${APP_DIR:-/home/admin/app}"
BRANCH="${BRANCH:-main}"
FRONTEND_URL="${FRONTEND_URL:-https://iselftoken.com}"
BACKEND_PUBLIC_URL="${BACKEND_PUBLIC_URL:-https://api.iselftoken.com}"
RABBITMQ_USER="${RABBITMQ_USER:-admin}"
# Passphrase do keystore PKI. Preferir vir do arquivo de secrets (estável
# entre boots). Se ausente, deriva de forma determinística do JWT_SECRET
# para permanecer ESTÁVEL a cada reprovisionamento — trocar a passphrase
# invalida o keystore existente. Nunca usar a default de dev do código.
KEY_STORAGE_PASSPHRASE="${KEY_STORAGE_PASSPHRASE:-$(printf '%s' "${JWT_SECRET}" | sha256sum | cut -d' ' -f1)}"
SMTP_HOST="${SMTP_HOST:-email-smtp.us-east-1.amazonaws.com}"
SMTP_PORT="${SMTP_PORT:-587}"
SMTP_SECURE="${SMTP_SECURE:-false}"
AWS_SES_FROM_EMAIL="${AWS_SES_FROM_EMAIL:-naoresponda@iselftoken.com}"
SMTP_FROM_EMAIL="${SMTP_FROM_EMAIL:-${AWS_SES_FROM_EMAIL}}"
AWS_SES_CONFIGURATION_SET="${AWS_SES_CONFIGURATION_SET:-iselftoken-prod}"
AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET_PREFIX="${S3_BUCKET_PREFIX:-iselftoken}"
S3_PUBLIC_BASE_URL="${S3_PUBLIC_BASE_URL:-}"
S3_PUBLIC_HOST="${S3_PUBLIC_HOST:-}"
# AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY são opcionais; prefira IAM Role na EC2.
# =============================================================================

echo "=== [1/6] Atualizando sistema ===" | tee -a /var/log/user-data.log

apt-get update -y
apt-get upgrade -y

# =============================================================================
# [2/6] Instala dependências: Docker, Git, Nginx
# =============================================================================
echo "=== [2/6] Instalando dependências ===" | tee -a /var/log/user-data.log

apt-get install -y ca-certificates curl gnupg git

# Docker (repositório oficial)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker
usermod -aG docker admin

# Nginx
apt-get install -y nginx

# =============================================================================
# [3/6] Configura Nginx como reverse proxy → API (porta 7077)
# =============================================================================
echo "=== [3/6] Configurando Nginx ===" | tee -a /var/log/user-data.log

cat > /etc/nginx/sites-available/api << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 60M;

    location / {
        proxy_pass http://127.0.0.1:7077;
        proxy_http_version 1.1;
        proxy_request_buffering off;
        proxy_read_timeout 300s;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    location /health {
        proxy_pass http://127.0.0.1:7077/health;
    }
}
EOF

ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/api
rm -f /etc/nginx/sites-enabled/default

systemctl enable nginx
systemctl restart nginx

# =============================================================================
# [4/6] Clona o repositório em ~/app
# =============================================================================
echo "=== [4/6] Clonando repositório ===" | tee -a /var/log/user-data.log

mkdir -p "${APP_DIR}"
# Usa GIT_ASKPASS para não colocar o token na URL nem na linha de comando.
ASKPASS_SCRIPT="$(mktemp)"
trap 'rm -f "${ASKPASS_SCRIPT}"' EXIT
cat > "${ASKPASS_SCRIPT}" <<'ASKPASS_EOF'
#!/bin/sh
case "$1" in
  *Username*) printf '%s\n' "${GITHUB_USER}" ;;
  *Password*) printf '%s\n' "${GITHUB_TOKEN}" ;;
  *) exit 1 ;;
esac
ASKPASS_EOF
chmod 700 "${ASKPASS_SCRIPT}"
export GIT_ASKPASS="${ASKPASS_SCRIPT}"
export GIT_TERMINAL_PROMPT=0

git clone --depth 1 --branch "${BRANCH}" "${GITHUB_REPO}" "${APP_DIR}"

unset GIT_ASKPASS GIT_TERMINAL_PROMPT
rm -f "${ASKPASS_SCRIPT}"
trap - EXIT

chown -R admin:admin "${APP_DIR}"

# =============================================================================
# [5/6] Cria .env.prod com variáveis de ambiente
# =============================================================================
echo "=== [5/6] Criando .env.prod ===" | tee -a /var/log/user-data.log

cat > "${APP_DIR}/.env.prod" << ENVEOF
# ============================================================
# .env.prod — IselfToken API (Produção / EC2)
# Gerado automaticamente pelo user-data.sh em $(date -Iseconds)
# ============================================================

# DATABASE (SQLite para apresentação)
DATABASE_PROVIDER=sqlite
DATABASE_URL="file:/app/data/iselftoken.db"

# SERVIDOR
PORT=7077

# JWT
JWT_SECRET="${JWT_SECRET}"
WEBHOOK_HASH_SECRET="${WEBHOOK_HASH_SECRET}"
JWT_EXPIRES_IN="30m"

# FRONTEND URL (CORS)
FRONTEND_URL="${FRONTEND_URL}"
BACKEND_PUBLIC_URL="${BACKEND_PUBLIC_URL}"

# REDIS (gerenciado pelo docker-compose)
REDIS_HOST=redis
REDIS_PORT=6379

# RABBITMQ (gerenciado pelo docker-compose)
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=${RABBITMQ_USER}
RABBITMQ_PASS=${RABBITMQ_PASS}

# PKI / KEYSTORE (CA interna para assinatura de termos)
# KEY_STORAGE_PATH: diretório persistido (mesmo volume do SQLite).
# KEY_STORAGE_PASSPHRASE: criptografia AES-256-GCM do keystore.
KEY_STORAGE_MODE=in-memory
KEY_STORAGE_PATH=/app/db
KEY_STORAGE_PASSPHRASE="${KEY_STORAGE_PASSPHRASE}"

# EMAIL / SMTP (AWS SES)
SMTP_HOST="${SMTP_HOST}"
SMTP_PORT=${SMTP_PORT}
SMTP_SECURE=${SMTP_SECURE}
SMTP_USER="${SMTP_USER}"
SMTP_PASS="${SMTP_PASS}"
AWS_SES_FROM_EMAIL="${AWS_SES_FROM_EMAIL}"
SMTP_FROM_EMAIL="${SMTP_FROM_EMAIL}"
AWS_SES_CONFIGURATION_SET="${AWS_SES_CONFIGURATION_SET}"
AWS_REGION="${AWS_REGION}"
# Credenciais AWS são opcionais; em produção, prefira a IAM Role da EC2.
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# OBJECT STORAGE (AWS S3)
S3_BUCKET_PREFIX="${S3_BUCKET_PREFIX}"
S3_PUBLIC_BASE_URL="${S3_PUBLIC_BASE_URL}"
S3_PUBLIC_HOST="${S3_PUBLIC_HOST}"
UPLOAD_PRESIGNED_URL_TTL=604800

# SENTRY (opcional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.2
SENTRY_RELEASE=

# C6 BANK (mock)
C6_MODE=mock
C6_BASE_URL=https://baas-api-sandbox.c6bank.info
C6_CLIENT_ID=
C6_CLIENT_SECRET=
C6_PIX_KEY=
C6_CLIENT_CERT_PATH=./certs/c6/client.crt
C6_CLIENT_KEY_PATH=./certs/c6/client.key
C6_CA_PATH=

# EFI BANK (mock)
EFI_MODE=mock
EFI_ENABLED=false
EFI_BANK_MIGRATION=false
EFI_WEBHOOK_HMAC_SECRET="${EFI_WEBHOOK_HMAC_SECRET}"
ENVEOF

chmod 600 "${APP_DIR}/.env.prod"
chown admin:admin "${APP_DIR}/.env.prod"

# =============================================================================
# [6/6] Sobe os containers com docker compose
# =============================================================================
echo "=== [6/6] Subindo containers Docker ===" | tee -a /var/log/user-data.log

cd "${APP_DIR}"

# Cria diretórios de dados persistentes
mkdir -p data storage icons uploads
chown -R admin:admin data storage icons uploads

# Sobe em modo detached
# --env-file garante que a interpolação ${...} do compose (ex.: senha do
# RabbitMQ) use as MESMAS credenciais do .env.prod que a API consome. Sem
# isso, RABBITMQ_DEFAULT_PASS cai no default e diverge da API (403 ACCESS_REFUSED).
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Aguarda o container da API ficar healthy antes de rodar a seed
echo "=== [6/6] Aguardando API ficar healthy ===" | tee -a /var/log/user-data.log
sleep 10

# Roda a seed do banco (SQLite — cria dados iniciais)
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T api npx prisma db push --schema=prisma/schema.sqlite.prisma
docker compose --env-file .env.prod -f docker-compose.prod.yml exec -T api npx prisma db seed

echo "=== EC2 API PROD setup COMPLETO — $(date) ===" | tee -a /var/log/user-data.log
