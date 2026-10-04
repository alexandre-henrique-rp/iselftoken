# Startup Module

**Generated:** 2026-07-07 (M5-S12 update)
**Updated:** 2026-09-30 (slug derivado de `nomeFantasia` — limpo, sem sufixo aleatório)
**Path:** `backend/src/api/startup/`

## OVERVIEW

CRUD + management for startup profiles and campaigns (equity crowdfunding). Includes dashboard overview expansion (M5-S12) e cancelamento de rodada com estorno automatico (B11).

## STRUCTURE

```
startup/
├── startup.module.ts            # @Module: registers StartupService + 3 dashboard services
├── startup.controller.ts        # @Controller('startup') — 8+ endpoints
├── startup.controller.spec.ts   # 1 teste (smoke)
├── startup-extras.controller.ts # Endpoints complementares
├── startup-extras.service.ts    # Service complementar
├── service/
│   ├── startup.service.ts                  # CRUD principal + findAll orquestrado
│   ├── startup.service.spec.ts             # Specs (cache invalidation + overview T027)
│   ├── startup-round.service.ts            # pauseRound + cancelRound (T107/T108/B11)
│   ├── startup-round.service.spec.ts       # 16 testes (pause/cancel + DRAFT + MISTO + 404)
│   ├── validate.fundador.ts                # Validador de plano Fundador
│   ├── dashboard-summary.service.ts         # 5 metodos + sparkline 30d (M5-S12 T048)
│   ├── dashboard-summary.service.spec.ts   # 15 testes
│   ├── enrichment.service.ts               # badges + valorCaptado + progresso (M5-S12 T049)
│   ├── enrichment.service.spec.ts          # 10 testes
│   ├── next-action.service.ts              # switch 6 combinacoes (M5-S12 T050)
│   └── next-action.service.spec.ts         # 13 testes
├── dto/                          # CreateStartupOnboardingDto, UpdateStartupDto, etc.
├── entities/
│   ├── startup.entity.ts                   # Entity base
│   ├── startup-list-response.entity.ts     # Entity array puro (legacy)
│   └── dashboard-overview.entity.ts        # Entity expandida (M5-S12 T051)
```

## WHERE TO LOOK (M5-S12 + B11)

| Task | Location |
|---|---|
| Agregacoes de summary (5 metodos) | `service/dashboard-summary.service.ts` |
| Enrichment (badges, valorCaptado, etc.) | `service/enrichment.service.ts` |
| Proxima acao (switch 6 combinacoes) | `service/next-action.service.ts` |
| Orquestracao findAll (Promise.all) | `service/startup.service.ts:findAll` |
| Entity expandida (startups + summary + tabsCount) | `entities/dashboard-overview.entity.ts` |
| DTOs auxiliares | `dto/dashboard-overview.dto.ts` |
| Pause/Cancel round + refund | `service/startup-round.service.ts` |
| E2E (10 cenarios dashboard) | `test/e2e/flows/startup-dashboard-overview.e2e-spec.ts` |
| E2E (8 cenarios cancel + refund B11) | `test/e2e/flows/cancel-round-with-refund.e2e-spec.ts` |

## ENDPOINTS PRINCIPAIS

| Method | Path | Description |
|---|---|---|
| POST | `/startup` | Criar startup (founder logado) |
| GET | `/startup` | Listar startups do founder com payload expandido (T106: inclui roundStatus) |
| PATCH | `/startup/:id` | Atualizar startup |
| DELETE | `/startup/:id` | Remover startup |
| GET | `/startup/dashboard/metrics` | Metricas agregadas (legacy) |
| GET | `/startup/:id` | Buscar startup por ID |
| PATCH | `/startup/:startupId/rodada/:rodadaId/pausar` | Pausar rodada (T107) - valida roundStatus === 'ativa' |
| PATCH | `/startup/:startupId/rodada/:rodadaId/cancelar` | Cancelar rodada (T108/B11) - valida roundStatus em 'criada_aguardando_reserva' ou 'pausada', processa refunds via C6Pix/C6Checkout adapters |

## CONVENTIONS

- Module pattern NestJS
- DTOs com class-validator + ValidationPipe global
- ResponseDto wrapper (`error`, `message`, `codigo`, `data`)
- LGPD-safe: campos monetarios em centavos (number)
- Founders devem ter role `FOUNDER` ou `ADMIN` (bypass)
- LGPD: agregacoes de investidor usam COUNT (nunca lista)
- Performance: agregacoes em `Promise.all` paralelizadas
- Cancelamento processa refunds sequencialmente (aborta em qualquer falha → 502)
- Audit logs: PAYMENT_REFUND (sucesso), PAYMENT_REFUND_FAILED (erro), com reason='CANCEL_ROUND'
- **Slug derivado de `nomeFantasia` (URL pública):** ver seção "Geração de Slug"

## GERAÇÃO DE SLUG (Sprint S34-b)

A URL pública (`/startup/<slug>`) é derivada exclusivamente do campo
`nomeFantasia` enviado pelo fundador no momento da criação. Sem IDs
internos, sem `nanoid`/cuid, sem sufixos aleatórios.

**Implementação:** `service/startup-crud.service.ts` → `generateSlug()` + `generateUniqueSlug()`.

### Pipeline de limpeza (`generateSlug`)

1. `lowercase` + `normalize('NFD')` + remoção de combining marks (acentos)
2. `&` → `e` (conector preservado para semântica de marca)
3. Remoção de **sufixos empresariais** como tokens isolados: `S.A.`, `Ltda`, `ME`, `EPP`, `Eireli`, `Inc`, `Corp`, `LLC`, `GmbH`, etc.
4. Remoção de **stopwords** isoladas (PT-BR): `de`, `da`, `do`, `das`, `dos`, `em`, `na`, `no`, `nas`, `nos`, `para`, `por`, `com`. **Não** remove `e/and` (preserva identidade de marca).
5. Substituição de não-alfanumérico por espaço; colapso de múltiplos espaços/hífens.
6. Trim de hífens nas pontas + limite de **60 caracteres** + remoção de hífen trailing do slice.

### Garantia de unicidade (`generateUniqueSlug`)

- Se `baseSlug` não existe no banco → retorna o base (URL limpa).
- Se colide → anexa `-1`, `-2`, `-3`, ... (até 9999).
- Fallback extremo (após 9999 colisões): `baseSlug-<base36 do timestamp>`.
- **Não** usa `nanoid`/`cuid` — objetivo é URL limpa e compartilhável.

### Exemplos

| `nomeFantasia` | Slug gerado |
|---|---|
| `Rocket Invite Inova Simples` | `rocket-invite-inova-simples` |
| `Rocket Invite S.A.` | `rocket-invite` |
| `Açaí & Tecnologia` | `acai-e-tecnologia` |
| `Padaria da Esquina de São Paulo` | `padaria-esquina-sao-paulo` |
| `Black & White Foods` | `black-e-white-foods` |
| `Acme I.S. Tech` | `acme-i-s-tech` |
| `Rocket Invite` (2ª colisão) | `rocket-invite-1` |

### Comportamento estável

- Slug é gerado **uma vez** na criação; **não** muda quando `nomeFantasia` é editado (preserva links antigos compartilhados em divulgações).
- Editar `nomeFantasia` no painel admin/founder não regenera o slug (decisão consciente — evita quebrar SEO/marketing).

### Anti-padrão

- ❌ Adicionar sufixo aleatório (`nanoid`, `cuid`, `randomBytes`) no slug — prejudica a divulgação.
- ❌ Regenerar slug automaticamente quando o fundador edita o `nomeFantasia`.

## ANTI-PATTERNS

- Nao usar `as any` em producao
- Nao retornar email/nome/CPF de investidor em payloads (LGPD)
- Nao usar `/\\D/g` no caminho critico (CNPJ alfanumerico)
- Nao misturar letras minusculas no storage (sempre uppercase)
- Nao criar abstracao para uso futuro (YAGNI)
- Nao fechar campaign se qualquer refund falhar (rollback via 502)
- Nao adicionar sufixo aleatorio (nanoid/cuid) no slug — URL publica deve ser limpa
- Nao regenerar slug automaticamente apos edicao do nomeFantasia (preserva links antigos)
