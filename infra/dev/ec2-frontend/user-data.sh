#!/bin/bash
set -euo pipefail

# =============================================================================
# User Data — EC2 Frontend (React SSR + Nginx) — Debian 12
# =============================================================================

export DEBIAN_FRONTEND=noninteractive

# Atualiza o sistema
apt-get update -y
apt-get upgrade -y

# Instala dependências
apt-get install -y ca-certificates curl gnupg

# Instala Docker (repositório oficial)
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Habilita Docker
systemctl enable docker
systemctl start docker

# Adiciona user admin ao grupo docker
usermod -aG docker admin

# Instala Nginx
apt-get install -y nginx

# Configuração do Nginx como reverse proxy para o frontend (porta 3000)
cat > /etc/nginx/sites-available/frontend << 'EOF'
server {
    listen 80;
    server_name _;

    client_max_body_size 60M;

    # Bloqueia probe conhecido do SAP NetWeaver antes de encaminhar ao SSR.
    # Mantemos 404 para não expor nem simular um endpoint de upload.
    location = /developmentserver/metadatauploader {
        access_log off;
        log_not_found off;
        return 404;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
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
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Ativa o site e remove o default
ln -sf /etc/nginx/sites-available/frontend /etc/nginx/sites-enabled/frontend
rm -f /etc/nginx/sites-enabled/default

# Habilita e inicia Nginx
systemctl enable nginx
systemctl restart nginx

# Cria diretório para a aplicação
mkdir -p /opt/iselftoken

echo "EC2 Frontend setup completed — $(date)" >> /var/log/user-data.log
