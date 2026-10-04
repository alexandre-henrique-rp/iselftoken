# Campanhas

**Propósito:** Gerencia campanhas de captação de startups — listagem, detalhes, checkout, criação de 1ª campanha + novas rodadas, transições controladas de status, edição em rascunho (DRAFT), alocação de recursos e auditoria CVM.

**📖 Documentação completa:** [README.md](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/README.md) — endpoints, regras de negócio, máquina de estados, modelo de dados, exemplos.

**Dependências:**

- `../../auth` (proteção do checkout e das operações de campanha com `AuthGuard`)
- `../../common` (payload autenticado e padronização de respostas)
- `../../prisma` (acesso ao banco, campanhas, startups, investimentos e tokens)
- `../../common/system-config` ([SystemConfigService](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/common/system-config/AGENTS.md) — fonte de configs dinâmicas; injetado em S01.2b em `create` + `state` + `module`)

**Mapa de Arquivos (S01.3a — formula financeira + 2 novos endpoints + E2E + docs):**

- [campaigns.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/campaigns.module.ts) — Registra 4 providers (Crud + Create + State + Resource) + importa `SystemConfigModule`.
- [campaigns.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/campaigns.controller.ts) — 10 endpoints REST (ver §2 do README; S01.2b adicionou `POST /:startupId` e `PATCH /:id/draft`).
- [service/campaigns-crud.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/service/campaigns-crud.service.ts) — Leituras públicas: `findAll`, `findOne`, `getCheckoutData` (S01.2b: usa `tokenSellPrice` snapshot do ADR-008, com fallback para `tokenPrice` legado).
- [service/campaigns-create.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/service/campaigns-create.service.ts) — `requestNewRound` (regra B05 + audit CVM + snapshots ADR-008) e `createFirstCampaign` (S01.2b: cria 1ª campanha, status DRAFT).
- [service/campaigns-state.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/service/campaigns-state.service.ts) — `executeAction`, `update` legado e `updateDraft` (S01.2b: PATCH /:id/draft — edita enquanto DRAFT, recalcula snapshots se financeiros mudam).
- [service/campaign-financial.helper.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/service/campaign-financial.helper.ts) — Helper estático compartilhado: `validateCampaignLimits` + `computeFinancialSnapshots` (DRY entre create e state).
- [service/campaign-resource.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/service/campaign-resource.service.ts) — Alocação de recursos (inalterado).
- [service/*.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/service/) — 67 testes unitários (4 spec files: helper + 3 services).
- [dto/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/campaigns/dto) — 6 DTOs (S01.2b: `UpdateCampaignDto` aceita `targetAmount`, `minInvestment`, `totalTokens` para edição em DRAFT).
- [test/e2e/flows/campaign-creation-flow.e2e-spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/test/e2e/flows/campaign-creation-flow.e2e-spec.ts) — S01.3a: 7 cenários E2E (sucesso, validação min/max, ownership, duplicidade, edição, edição-bloqueada).

**Novos endpoints (S01.2b):**

- `POST /campaigns/:startupId` — cria a **1ª** campanha da startup (status DRAFT). Sem regra B05. Bloqueia se já existe qualquer campanha prévia. Requer auth (founder owner ou ADMIN).
- `PATCH /campaigns/:id/draft` — edita campanha enquanto `status === DRAFT`. Revalida limites dinamicamente se `targetAmount`/`totalTokens` mudam e recalcula snapshots financeiros (ADR-008).

**Pattern de validação dinâmica (S01.2b):**

- DTOs validam apenas FORMA (`@IsNumber`, `@IsInt`, `@IsString`).
- Validação de REGRA (min/max de target/tokens) delegada ao `CampaignFinancialHelper.validateCampaignLimits()`, que consulta `SystemConfigService.getFinancialConfigs()`.
- Códigos de erro estruturados: `TARGET_BELOW_MINIMUM`, `TARGET_ABOVE_MAXIMUM`, `TOKENS_BELOW_MINIMUM`, `TOKENS_ABOVE_MAXIMUM`, `STARTUP_ALREADY_HAS_CAMPAIGN`, `CAMPAIGN_NOT_EDITABLE`.
- Para alterar limites sem deploy: PATCH `/admin/configs/:key` (endpoint admin do `SystemConfigModule`).

**Fórmula financeira (ADR-008 Modelo A):**

```
tokenBaseValue   = targetAmount / totalTokens
tokenSellPrice   = targetAmount / totalTokens  (= baseValue no Modelo A)
adminFeeValue    = targetAmount * PLATFORM_ADMIN_FEE_PCT  (default 0.20)
tokenMintingCost = totalTokens  * TOKEN_MINT_FEE            (default 1.00)
```

Snapshots gravados na criação da campanha (e atualizados em `updateDraft` quando `targetAmount`/`totalTokens` mudam) — auditoria/reconstrução sem depender de configs que podem mudar.
