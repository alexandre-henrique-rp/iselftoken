# PRD — Remoção do RustFS e Migração para AWS S3 (Produção) + Filesystem Local (Desenvolvimento)

**Data:** 10/08/2026  
**Autor:** Agente IselfToken  
**Status:** Draft — Aguardando aprovação  
**Prioridade:** Alta  
**Sprint estimado:** 2-3 sprints

---

## 1. Contexto e Motivação

### Estado Atual

O projeto utiliza **RustFS** como object storage S3-compatible para desenvolvimento local e (potencialmente) produção. O RustFS:

- Roda como container Docker (`rustfs/rustfs:latest`) nas portas 9000/9001
- Exige um container auxiliar (`rustfs_perms`) para ajuste de permissões de volume
- Armazena imagens, documentos, vídeos e certificados PDF dos tokens
- É acessado via AWS SDK v3 com `forcePathStyle: true`
- Apresenta instabilidade ocasional no ambiente local (volumes, permissões)

### Problema

1. **RustFS não é adequado para produção** — sem SLA, sem replicação geo, sem CDN integrado
2. **Overhead desnecessário no dev** — subir container S3-compatible só para salvar imagens localmente
3. **Custo de manutenção** — container `rustfs_perms` para corrigir permissões, volumes extras, configuração de DNS para virtual-hosted

### Decisão

- **Produção:** AWS S3 nativo (região sa-east-1, São Paulo)
- **Desenvolvimento local:** Filesystem local com abstração que simula a interface S3 (presigned URLs viram paths servidos pelo backend)
- **Remover completamente:** RustFS, MinIO e containers associados

---

## 2. Objetivos

| # | Objetivo | Critério de Aceite |
|---|----------|-------------------|
| O1 | Remover RustFS e MinIO do docker-compose | Container `rustfs`, `rustfs_perms` e volumes eliminados; `docker compose up -d` funciona sem eles |
| O2 | Produção usando AWS S3 real | Uploads, downloads e presigned URLs funcionando em bucket S3 `sa-east-1` |
| O3 | Dev local usando filesystem | Imagens salvas em `./storage/` no backend; presigned URLs servidas via rota do NestJS; zero containers extras |
| O4 | Zero breaking changes na API | Frontend continua usando as mesmas rotas e contratos; URLs de imagens continuam funcionando |
| O5 | Manter a interface IObjectStorageProvider | Novo provider `LocalFsStorageProvider` implementa a mesma interface |
| O6 | Migração transparente | `STORAGE_PROVIDER=local` para dev, `STORAGE_PROVIDER=s3` para prod |

---

## 3. Arquitetura Proposta

### 3.1 Visão Geral

```
┌──────────────────────────────────────────────────────────────────┐
│                    STORAGE_PROVIDER env                           │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  "s3" (prod)    │    │  "local" (dev)  │                     │
│  │                 │    │                 │                      │
│  │ S3StorageProvider    │ LocalFsStorage  │                      │
│  │   (AWS SDK v3)  │    │  Provider       │                      │
│  │                 │    │  (fs + serve)   │                      │
│  └────────┬────────┘    └────────┬────────┘                     │
│           │                      │                               │
│           ▼                      ▼                               │
│  ┌─────────────────────────────────────────────┐                 │
│  │        IObjectStorageProvider               │                  │
│  │  upload | download | delete | presignedUrl  │                  │
│  │  exists | healthCheck | uploadStream        │                  │
│  └─────────────────────────────────────────────┘                 │
│                          ▲                                        │
│                          │                                        │
│  ┌──────────────────┬────┴───────────────────────────────────┐   │
│  │ UploadsService   │ TokenCertificateService │ UploadsService (pipeline síncrono) │ │
│  └──────────────────┴────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Provider: `LocalFsStorageProvider` (Desenvolvimento)

**Responsabilidades:**
- Salvar arquivos em disco local: `./storage/{bucket}/{key}`
- Servir arquivos via rota NestJS: `GET /api/files/{bucket}/{key}`
- Simular presigned URLs como: `http://localhost:7077/api/files/{bucket}/{key}?token={hmac}&expires={ts}`
- Criar diretórios automaticamente (mkdir -p)
- Health check: verificar se o diretório base existe e tem permissão de escrita

**Simulação de Presigned URLs:**
- Gerar HMAC-SHA256 do path + expiração usando `APP_SECRET` (ou chave dedicada)
- O middleware de servir arquivos valida o HMAC e a expiração antes de enviar o arquivo
- TTL default: 7 dias (mesma semântica do S3)
- Em dev, aceitar também requests sem token (para facilitar debug) se `NODE_ENV=development`

**Criação automática de buckets (pastas):**

No `onModuleInit()`, o provider deve criar todas as pastas que simulam os buckets S3:

```typescript
async onModuleInit(): Promise<void> {
  const buckets = ['image', 'image-sm', 'image-md', 'video', 'video-sm',
    'video-md', 'video-lg', 'document', 'comprovante'];
  for (const bucket of buckets) {
    await fs.mkdir(path.join(this.basePath, bucket), { recursive: true });
  }
  this.logger.log(`[LocalFs] Diretórios de storage criados em ${this.basePath}`);
}
```

Isso garante que ao subir o servidor pela primeira vez, todas as "buckets" locais já existem — mesma semântica do `ensureBucketsExist()` do S3.

**Estrutura de diretórios (criada automaticamente no startup):**
```
backendnode/
├── storage/           <-- Gitignored, criado no onModuleInit()
│   ├── image/
│   │   ├── abc123.jpg
│   │   └── def456.webp
│   ├── image-sm/
│   ├── image-md/
│   ├── document/
│   │   └── token-certificates/
│   ├── video/
│   ├── video-sm/
│   ├── video-md/
│   ├── video-lg/
│   └── comprovante/
```

### 3.3 Provider: `S3StorageProvider` (Produção — Refatorado)

**Mudanças em relação ao atual:**
- Remover referências a MinIO (`MINIO_*` env vars deprecated)
- Usar variáveis AWS nativas: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_PREFIX`
- Remover `forcePathStyle: true` (AWS S3 real usa virtual-hosted por default)
- Usar `AWS_REGION=sa-east-1` para menor latência no Brasil
- Manter suporte a endpoint customizado via `S3_ENDPOINT` (para testes com LocalStack)

**Variáveis de ambiente (produção):**
```bash
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=sa-east-1
S3_BUCKET_PREFIX=iselftoken-prod
S3_PUBLIC_BASE_URL=https://iselftoken-prod-image.s3.sa-east-1.amazonaws.com
# Opcional: CDN
S3_CDN_URL=https://cdn.iselftoken.com
```

### 3.4 Rota de Servir Arquivos (Dev Only)

```typescript
// src/common/storage/local-files.controller.ts
@Controller('api/files')
export class LocalFilesController {
  @Get(':bucket/:key(*)')
  serveFile(@Param('bucket') bucket, @Param('key') key, @Query() query) {
    // 1. Validar HMAC (se NODE_ENV !== development, exigir token válido)
    // 2. Verificar expiração
    // 3. res.sendFile(path.join(STORAGE_BASE, bucket, key))
  }
}
```

Essa rota só é registrada quando `STORAGE_PROVIDER=local`.

---

## 4. Plano de Execução Detalhado

### Fase 1: Criar `LocalFsStorageProvider` (Sprint 1)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| T1 | Criar `src/common/storage/local-fs-storage.provider.ts` implementando `IObjectStorageProvider` | Novo | M |
| T2 | Criar `src/common/storage/local-files.controller.ts` para servir arquivos em dev | Novo | S |
| T3 | Criar utilitário de HMAC para presigned URLs locais | Novo | S |
| T4 | Atualizar `storage-provider.factory.ts` para suportar `mode === 'local'` | Modificar | S |
| T5 | Atualizar `StorageProviderModule` para registrar `LocalFilesController` condicionalmente | Modificar | S |
| T6 | Adicionar `storage/` ao `.gitignore` | Modificar | XS |
| T7 | Criar script de seed para popular `storage/` com assets de teste | Novo | S |
| T8 | Testes unitários do `LocalFsStorageProvider` | Novo | M |

### Fase 2: Refatorar `S3StorageProvider` para AWS Nativo (Sprint 1)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| T9 | Refatorar `S3StorageProvider` para usar variáveis AWS nativas (`AWS_*`) | Modificar | M |
| T10 | Remover `forcePathStyle: true` (usar virtual-hosted default) | Modificar | S |
| T11 | Adicionar suporte a `S3_ENDPOINT` para override (LocalStack/testing) | Modificar | S |
| T12 | Adicionar suporte a `S3_CDN_URL` para URLs públicas via CloudFront | Modificar | S |
| T13 | Atualizar `buildPublicUrl()` para usar CDN se configurado | Modificar | S |
| T14 | Testes unitários com mock do S3Client | Modificar | M |

### Fase 3: Migrar Consumidores Legados (Sprint 2)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| T15 | Migrar `TokenCertificateService` de `S3Service` para `@Inject(OBJECT_STORAGE_PROVIDER)` | Modificar | M |
| T16 | Migrar `PresignedUrlCacheService` de `S3Service` para provider direto | Modificar | S |
| T17 | Remover chamadas diretas ao `S3Service` em todo o codebase | Vários | M |
| T18 | Marcar `S3Service` como fully deprecated + log warning se instanciado | Modificar | S |
| T19 | Atualizar `S3Module` para exportar apenas compatibilidade transitória | Modificar | S |

### Fase 4: Remover RustFS e Infraestrutura Morta (Sprint 2)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| T20 | Remover serviço `rustfs` e `rustfs_perms` do `docker-compose.yml` | Modificar | S |
| T21 | Remover diretório `docker/rustfs/` | Deletar | XS |
| T22 | Remover `rustfs-storage.provider.ts` | Deletar | S |
| T23 | Remover referências ao RustFS na factory (fallback) | Modificar | S |
| T24 | Remover variáveis `RUSTFS_*` do `.env.example` | Modificar | XS |
| T25 | Remover/substituir variáveis `MINIO_*` por `AWS_*` no `.env.example` | Modificar | S |
| T26 | Atualizar `docker/minio/` — remover se não mais usado | Deletar | XS |
| T27 | Atualizar `AGENTS.md` e documentação para refletir nova infra | Modificar | S |
| T28 | Remover specs do `RustFsStorageProvider` | Deletar | XS |

### Fase 5: Validação e Docs (Sprint 2-3)

| # | Tarefa | Arquivos | Esforço |
|---|--------|----------|---------|
| T29 | Teste e2e: upload + download + presigned URL no modo `local` | Novo | M |
| T30 | Teste e2e: upload + download + presigned URL no modo `s3` (com LocalStack) | Novo | L |
| T31 | Atualizar `.env.example` com novos exemplos para dev e prod | Modificar | S |
| T32 | Atualizar `README.md` do backend com instruções de setup simplificadas | Modificar | S |
| T33 | Verificar que `docker compose up -d` sobe sem RustFS e funciona | Manual | S |

---

## 5. Detalhamento Técnico

### 5.1 `LocalFsStorageProvider` — Pseudocódigo

```typescript
@Injectable()
export class LocalFsStorageProvider implements IObjectStorageProvider {
  private readonly basePath: string; // ./storage
  private readonly baseUrl: string;  // http://localhost:7077/api/files
  private readonly secret: string;   // APP_SECRET ou STORAGE_HMAC_SECRET

  constructor(private config: ConfigService) {
    this.basePath = config.get('LOCAL_STORAGE_PATH', './storage');
    this.baseUrl = config.get('LOCAL_STORAGE_BASE_URL', 'http://localhost:7077/api/files');
    this.secret = config.get('APP_SECRET', 'dev-secret');
  }

  async upload(options: ObjectStorageUploadOptions): Promise<ObjectStorageUploadResult> {
    const dir = path.join(this.basePath, options.bucket);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, options.key);
    await fs.writeFile(filePath, options.file);
    return {
      url: `${this.baseUrl}/${options.bucket}/${options.key}`,
      key: options.key,
      bucket: options.bucket,
      size: options.file.length,
    };
  }

  async download(bucket: string, key: string): Promise<ObjectStorageDownloadResult> {
    const filePath = path.join(this.basePath, bucket, key);
    const body = await fs.readFile(filePath);
    const mime = this.guessMime(key);
    return { body, contentType: mime, size: body.length };
  }

  async delete(bucket: string, key: string): Promise<void> {
    const filePath = path.join(this.basePath, bucket, key);
    await fs.unlink(filePath).catch(() => {});
  }

  async getPresignedUrl(bucket: string, key: string, expiresIn = 604800): Promise<string> {
    const expires = Math.floor(Date.now() / 1000) + expiresIn;
    const payload = `${bucket}/${key}:${expires}`;
    const token = crypto.createHmac('sha256', this.secret).update(payload).digest('hex');
    return `${this.baseUrl}/${bucket}/${key}?token=${token}&expires=${expires}`;
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, bucket, key);
    try { await fs.access(filePath); return true; } catch { return false; }
  }

  async healthCheck(): Promise<boolean> {
    try { await fs.access(this.basePath); return true; } catch { return false; }
  }

  async uploadStream(options: ObjectStorageUploadStreamOptions): Promise<ObjectStorageUploadResult> {
    const dir = path.join(this.basePath, options.bucket);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, options.key);
    const ws = createWriteStream(filePath);
    await pipeline(options.stream, ws);
    return {
      url: `${this.baseUrl}/${options.bucket}/${options.key}`,
      key: options.key,
      bucket: options.bucket,
      size: options.size,
    };
  }
}
```

### 5.2 `S3StorageProvider` — Variáveis de Ambiente Finais (Produção)

```bash
# Produção (AWS S3 real)
STORAGE_PROVIDER=s3
AWS_ACCESS_KEY_ID=AKIAxxxxxxxxxx
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
AWS_REGION=sa-east-1
S3_BUCKET_PREFIX=iselftoken-prod
S3_ENDPOINT=                          # vazio = usa AWS default
S3_FORCE_PATH_STYLE=false             # virtual-hosted (default AWS)
S3_CDN_URL=https://cdn.iselftoken.com # opcional: CloudFront
UPLOAD_PRESIGNED_URL_TTL=604800
```

### 5.3 Variáveis de Ambiente Finais (Desenvolvimento)

```bash
# Desenvolvimento local (filesystem)
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./storage
LOCAL_STORAGE_BASE_URL=http://localhost:7077/api/files
APP_SECRET=dev-secret-change-in-prod
UPLOAD_PRESIGNED_URL_TTL=604800
```

### 5.4 Factory Atualizada

```typescript
export type StorageProviderMode = 's3' | 'local';
// Remover 'rustfs' completamente

export async function createStorageProvider(configService?: any): Promise<IObjectStorageProvider> {
  const mode = (process.env.STORAGE_PROVIDER || 'local') as StorageProviderMode;

  if (mode === 'local') {
    logger.log('[Storage] Usando LocalFsStorageProvider (desenvolvimento)');
    return new LocalFsStorageProvider(configService);
  }

  // mode === 's3'
  logger.log('[Storage] Usando S3StorageProvider (produção/staging)');
  const provider = new S3StorageProvider(configService);
  const healthy = await provider.healthCheck();
  if (!healthy) {
    logger.error('[Storage] S3 indisponível! Verificar credenciais/rede.');
    throw new Error('S3StorageProvider não está acessível');
  }
  return provider;
}
```

**Nota:** Removemos o fallback automático para RustFS. Se S3 falhar em produção, a aplicação deve falhar ruidosamente (fail fast), não degradar silenciosamente.

---

## 6. Docker Compose Final (Desenvolvimento)

Após a remoção do RustFS, o `docker-compose.yml` terá apenas:

| Serviço | Porta | Uso |
|---------|-------|-----|
| MySQL 8 | 3307 | Banco principal |
| Redis 7.4 | 6379 | Sessions + cache |
| RabbitMQ 3.13 | 5672/15672 | Fila de mensagens |
| Segurança de upload | Validação de MIME, sanitização, dedup e limite de 50MB | UploadsService (pipeline síncrono) |

**Removidos:** `rustfs`, `rustfs_perms` (e seus volumes)

---

## 7. Fluxo de Upload — Antes vs Depois

### Antes (com RustFS)

```
Developer Machine
├── docker compose up → sobe RustFS (9000/9001) + perms container
├── NestJS usa STORAGE_PROVIDER=rustfs
├── Upload: buffer → AWS SDK → RustFS container → volume Docker
└── Download: presigned URL aponta para localhost:9000/bucket/key
```

### Depois (filesystem local)

```
Developer Machine
├── docker compose up → SEM RustFS (só MySQL, Redis e RabbitMQ)
├── NestJS usa STORAGE_PROVIDER=local
├── Upload: buffer → fs.writeFile → ./storage/bucket/key
└── Download: presigned URL → GET /api/files/bucket/key?token=hmac
```

---

## 8. Impacto no Frontend

**Zero mudanças necessárias.** O frontend já consome:
- URLs de imagem retornadas pela API (campo `url` nos uploads)
- Presigned URLs retornadas pelos endpoints (certificados, documentos)

A única diferença é que em dev as URLs apontam para `localhost:7077/api/files/...` ao invés de `localhost:9000/...`. Isso já é configurável via `S3_PUBLIC_BASE_URL` / `LOCAL_STORAGE_BASE_URL`.

---

## 9. Migração de Dados

### Ambiente de Desenvolvimento
- **Não há migração**: dados do RustFS local podem ser descartados
- Novo seed script popula `./storage/` com fixtures de teste

### Ambiente de Produção (quando houver)
- Se já existirem dados no RustFS de staging: script one-shot que lê objetos do RustFS e copia para S3
- Ferramentas: `aws s3 sync` ou script Node com stream pipe

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Presigned URLs locais menos seguras que S3 reais | Média | Baixo (só em dev) | HMAC + expiração; em dev aceitar sem token |
| Filesystem local não replica comportamento exato do S3 (ex: eventual consistency) | Baixa | Baixo | Irrelevante para dev; testes e2e em staging com S3 real |
| `TokenCertificateService` ainda usa `S3Service` legado | Alta | Médio | Migrar na Fase 3 antes de remover S3Service |
| Upload de arquivo grande pode travar filesystem em dev | Baixa | Baixo | Usar `uploadStream` com pipe para disco |
| CDN (CloudFront) invalida cache ao atualizar objeto | Média | Médio | Content-addressable keys (SHA-256) = imutáveis |

---

## 11. Definição de Done (DoD)

- [ ] `docker compose up -d` funciona sem RustFS/MinIO
- [ ] Todos os testes existentes passam com `STORAGE_PROVIDER=local`
- [ ] Upload de imagem funciona em dev (salva em `./storage/`)
- [ ] Presigned URL funciona em dev (HMAC validado, arquivo servido)
- [ ] Upload de certificado PDF funciona
- [ ] Zero referências a `RustFS` no codebase (exceto changelog/docs históricos)
- [ ] Zero variáveis `RUSTFS_*` no `.env.example`
- [ ] `S3StorageProvider` funciona com credenciais AWS reais em staging
- [ ] TypeScript compila sem erros
- [ ] Coverage de testes >= 80% nos novos providers

---

## 12. Timeline Estimada

| Sprint | Fase | Entregável |
|--------|------|-----------|
| S1 (semana 1-2) | Fase 1 + 2 | `LocalFsStorageProvider` funcionando + S3Provider refatorado |
| S2 (semana 3-4) | Fase 3 + 4 | Consumidores migrados + RustFS removido |
| S3 (semana 5) | Fase 5 | Testes e2e + documentação + deploy staging |

---

## 13. Checklist de Aprovação

Antes de iniciar a implementação, confirmar com o time:

- [ ] Concordância em remover RustFS completamente
- [ ] Região AWS confirmada (`sa-east-1`)
- [ ] Bucket naming convention aprovada (`iselftoken-prod-{tipo}` ou `iselftoken-prod` com prefix)
- [ ] IAM Policy definida (least privilege para o serviço)
- [ ] Budget AWS aprovado (estimativa: ~$5-20/mês para o volume atual)
- [ ] CloudFront (CDN) será usado? Se sim, domínio (`cdn.iselftoken.com`)
- [ ] Estratégia de backup S3 (versionamento de bucket? lifecycle rules?)
