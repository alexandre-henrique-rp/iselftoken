# S3

## Propósito

Abstração sobre AWS SDK para object storage AWS S3. Provê upload, download, presigned URLs (TTL padrão 3600s), URL pública, delete e exists. Usado por uploads, signature e outros módulos que precisam armazenar arquivos.

## Dependências

- `@aws-sdk/client-s3` — cliente S3 oficial.
- `@aws-sdk/s3-request-presigner` — gera URLs pré-assinadas.
- `dotenv` — carrega `AWS_REGION`, credenciais AWS, `S3_PUBLIC_BASE_URL`, `S3_CORS_ORIGINS` e `UPLOAD_PRESIGNED_URL_TTL`.

## Mapa de Arquivos

- [s3.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/s3/s3.module.ts) — módulo global NestJS.
- [s3.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/s3/s3.service.ts) — `S3Service` com API: `upload`, `download`, `getUrl(bucket, key, expiresIn?)`, `getPublicUrl`, `delete`, `exists`.
- [s3.types.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/s3/s3.types.ts) — interfaces TypeScript.
- [s3.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/s3/s3.service.spec.ts) — testes unitários.

## Configuração

| Variável | Finalidade |
|---|---|
| `AWS_REGION` | Região AWS do bucket. Default `sa-east-1`. |
| `S3_BUCKET_PREFIX` | Prefixo dos buckets S3. |
| `S3_PUBLIC_BASE_URL` | URL pública opcional do bucket/CDN. |
| `S3_CORS_ORIGINS` | Origens permitidas para acesso direto do browser (comma-separated). |
| `UPLOAD_PRESIGNED_URL_TTL` | TTL das presigned URLs (segundos). Default 604800 (7d). |
| `BACKEND_PUBLIC_URL` | URL do backend NestJS (emails, redirects). |

## Buckets

Com prefixo `S3_BUCKET_PREFIX`: `image`, `image-md`, `image-sm`, `video`, `video-md`, `video-sm`, `document`, `comprovante`. O CORS deve ser configurado diretamente no bucket AWS S3.