# Uploads

**Propósito:** Upload multipart com pipeline síncrono, deduplicação SHA-256, sanitização e geração de uma variant por tamanho (formato original na média e WebP na pequena), URLs de storage e cleanup automático.

**Dependências:**
- `[../../prisma]` — modelo Upload
- `[../../common/storage]` — IObjectStorageProvider + Factory

## Fluxo atual

- A rota pública é `POST /uploads`; o BFF do frontend a expõe como `POST /api/uploads`.
- `UploadsController` valida arquivo, MIME, `kind`, sessão opcional e quota antes de chamar `UploadsService.create()`.
- `UploadsService.create()` grava o original, confirma sua disponibilidade, sanitiza imagens, gera variants e persiste o registro como `READY` antes de responder.
- O processamento é síncrono: `UploadsService.create()` valida e prepara o arquivo antes de responder. Uploads não publicam jobs nem dependem de RabbitMQ ou Redis; RabbitMQ permanece reservado ao domínio de pagamentos e Redis à sessão/cache.
- O endpoint de status é apenas uma consulta autorizada de compatibilidade; o frontend não deve aguardar polling para um upload novo, pois o contrato é síncrono.

## Rate limiting e quotas

- Não usar `@Throttle` específico no `POST /uploads`.
- O `ThrottlerGuard` global (100 req/min por IP) cobre a proteção contra abuso.
- `QuotaService.checkQuota()` é chamado antes da persistência quando há sessão autenticada.
- `UserPlanHelper` resolve o plano via `Subscription.ACTIVE` com cache em memória TTL de 5 minutos.

## Mapa de arquivos

- `uploads.module.ts` — módulo, Multer, storage, processamento síncrono e cleanup
- `uploads.controller.ts` — POST/GET REST
- `uploads.service.ts` — persistência, sanitização, variants, consulta e remoção
- `admin-uploads.controller.ts` — DELETE administrativo/compliance
- `uploads-public.controller.ts` — GET público limitado
- `services/quota.service.ts` — limites FREE/PRO
- `services/image-processor.service.ts` — validação e sanitização de imagens
- `services/variant-generator.service.ts` — geração da variant média no formato original e da pequena em WebP
- `helpers/user-plan.helper.ts` — Subscription → UserPlan
- `jobs/cleanup.job.ts` — limpeza de uploads abandonados e órfãos

## Regras de segurança

- MIME type é validado no backend; o Content-Type do cliente não é confiável.
- A quota é validada antes de persistir o arquivo.
- O registro só fica `READY` depois do original e das variants aplicáveis estarem disponíveis.
- URLs só são expostas como renderizáveis para registros `READY`.
- A posse do upload vem da sessão; `userId` enviado pelo cliente não autoriza associação.
- Não logar CPF, email, telefone ou dados de documentos em texto livre.
