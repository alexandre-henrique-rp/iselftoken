#!/bin/bash
set -euo pipefail

# =============================================================================
# User Data — EC2 Frontend (React SSR + Nginx) — Debian 12 — PROD
# Fluxo: Instala Docker + Git → Clona repo → Cria .env → Build e run container
# =============================================================================

export DEBIAN_FRONTEND=noninteractive

# ========================= VARIÁVEIS (preencher antes do deploy) =============
GITHUB_USER="alexandre-henrique-rp"
GITHUB_TOKEN="${GITHUB_TOKEN:?GITHUB_TOKEN deve ser exportado antes de executar este script}"           # PAT (classic) com scope 'repo' — injetado via secrets manager / env var, NUNCA versionado
GITHUB_REPO="https://github.com/iSelfToken/frontend.git"
APP_DIR="/home/admin/app"
BRANCH="main"

# URLs do ambiente
API_URL="https://api.iselftoken.com"
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
# [3/6] Configura Nginx como reverse proxy → Frontend (porta 5173)
# =============================================================================
echo "=== [3/6] Configurando Nginx ===" | tee -a /var/log/user-data.log

cat > /etc/nginx/sites-available/frontend << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        # react-router-serve escuta em 3000 dentro do container (NAO 5173)
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        # CSRF (S34): repassa Host sem modificações. RR7 compara Origin vs Host;
        # se divergirem, consulta allowedActionOrigins (build-time, via env
        # ALLOWED_ACTION_ORIGINS ou DEFAULT_ALLOWED_ORIGINS).
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

ln -sf /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/frontend
rm -f /etc/nginx/sites-enabled/default

systemctl enable nginx
systemctl restart nginx

# =============================================================================
# [4/6] Clona o repositório em ~/app
# =============================================================================
echo "=== [4/6] Clonando repositório ===" | tee -a /var/log/user-data.log

mkdir -p "${APP_DIR}"

# Monta URL autenticada para repo privado (user:token@github)
REPO_AUTH_URL="https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/iSelfToken/frontend.git"

git clone --depth 1 --branch "${BRANCH}" "${REPO_AUTH_URL}" "${APP_DIR}"

chown -R admin:admin "${APP_DIR}"

# =============================================================================
# [5/6] Cria .env com variáveis de ambiente
# =============================================================================
echo "=== [5/6] Criando .env ===" | tee -a /var/log/user-data.log

cat > "${APP_DIR}/.env" << ENVEOF
# ============================================================
# .env — IselfToken Frontend (Produção / EC2)
# Gerado automaticamente pelo user-data.sh em $(date -Iseconds)
# ============================================================

# Backend API URL (NestJS)
VITE_API_URL=${API_URL}

# CSRF / allowedActionOrigins (Sprint S34 — fix bug /admin/startups/:id/:phase
# retornando 400). React Router 7 consulta esta lista em BUILD TIME. A lista
# abaixo é explícita para prod mesmo que DEFAULT_ALLOWED_ORIGINS no
# react-router.config.ts já cubra os mesmos domínios — defense in depth
# para o caso de alguém alterar os defaults sem perceber o impacto.
#
# Wildcards suportados: * (1 segmento) e ** (multiplos, só no início).
# Exemplo: **.iselftoken.com casa staging.iselftoken.com,
# app.staging.iselftoken.com, mas NÃO casa iselftoken.com (domínio raiz).
ALLOWED_ACTION_ORIGINS=iselftoken.com,www.iselftoken.com,**.iselftoken.com

# Feature flags (server-side)
PAYMENTS_ENABLED=false
ENVEOF

chmod 600 "${APP_DIR}/.env"
chown admin:admin "${APP_DIR}/.env"

# =============================================================================
# [6/6] Build e run do container Docker
# =============================================================================
echo "=== [6/6] Build e run do container Docker ===" | tee -a /var/log/user-data.log

cd "${APP_DIR}"

docker build -t iselftoken-frontend:latest .

docker run -d \
  --name iselftoken_frontend \
  --restart unless-stopped \
  --env-file .env \
  # host 3000 = container 3000 (react-router-serve); nginx faz proxy da 80 -> 3000
  -p 3000:3000 \
  iselftoken-frontend:latest

echo "=== EC2 Frontend PROD setup COMPLETO — $(date) ===" | tee -a /var/log/user-data.log
