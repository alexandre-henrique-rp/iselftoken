# Upload Refactor — Configuração de Infraestrutura AWS S3

## Variáveis de Ambiente (adicionar ao .env)

```bash
# AWS S3
AWS_REGION=sa-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_PREFIX=iselftoken
S3_PUBLIC_HOST=s3.sa-east-1.amazonaws.com

# Upload Limits
UPLOAD_MAX_SIZE_MB=50
UPLOAD_QUOTA_FREE_MB=500
UPLOAD_QUOTA_PRO_MB=5000
UPLOAD_MAX_COUNT_FREE=1000
UPLOAD_MAX_COUNT_PRO=10000

# Redis (para cache de presigned URLs)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Docker Compose

O `docker-compose.yml` contém somente os serviços auxiliares locais:
- `redis` (cache)
- `rabbitmq` (fila de processamento)

O object storage é AWS S3 e não exige container local.

## DNS (para virtual-hosted URLs em produção)

Para usar domínio próprio ou CDN, configurar o DNS apontando para a distribuição/CDN que acessa o bucket AWS S3.

## CORS

Configurar o CORS diretamente no bucket AWS S3. Para acesso pelo frontend, garantir que as origens permitidas estejam incluídas:
```
S3_CORS_ORIGINS=http://localhost:5173,https://*.yourdomain.com
```
