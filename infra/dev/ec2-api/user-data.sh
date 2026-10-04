#!/bin/bash
set -euo pipefail

# =============================================================================
# User Data — EC2 API (NestJS + Nginx + Redis + RabbitMQ) — Debian 12
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

# Configuração do Nginx como reverse proxy para a API (porta 7077)
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
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF

# Ativa o site e remove o default
ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/api
rm -f /etc/nginx/sites-enabled/default

# Habilita e inicia Nginx
systemctl enable nginx
systemctl restart nginx

# Cria diretório para docker-compose da aplicação
mkdir -p /opt/iselftoken

# Docker Compose com Redis + RabbitMQ
cat > /opt/iselftoken/docker-compose.yml << 'EOF'
services:
  redis:
    image: redis:7.4-alpine
    container_name: iselftoken-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --maxmemory 100mb --maxmemory-policy allkeys-lru

  rabbitmq:
    image: rabbitmq:3.13-management
    container_name: iselftoken-rabbitmq
    restart: unless-stopped
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      RABBITMQ_DEFAULT_USER: iselftoken
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:-changeme}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

volumes:
  redis_data:
  rabbitmq_data:
EOF

# Inicia Redis e RabbitMQ
cd /opt/iselftoken
docker compose up -d

echo "EC2 API setup completed — $(date)" >> /var/log/user-data.log
