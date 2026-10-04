# Investments

**Propósito:** Investimentos em campanhas de startups (criação PENDING, confirmação após pagamento, emissão de tokens).

**Dependências:**
- `[../../prisma/prisma.service]` (acesso a Investment, Campaign, Subscription, Payment)
- `[../../auth/auth.guard]` (AuthGuard obrigatório em todas as rotas)
- `[../../common/dto/response.dto]` (wrapper padrão ResponseDto)
- `[../tokens/tokens.service]` (emissão de tokens via TokensService.emitTokensForInvestment)

**Mapa de Arquivos:**
- [investments.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/investments/investments.module.ts) - módulo registra InvestmentsService e TokensService
- [investments.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/investments/investments.controller.ts) - rotas POST /investments, GET /investments, POST /investments/:id/confirm
- [investments.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/investments/investments.service.ts) - valida subscription/campanha OPEN, calcula tokensQty, confirma e emite tokens
- [dto/create-investment.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/investments/dto/create-investment.dto.ts) - CreateInvestmentDto (campaignId, amount)
- [investments.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/investments/investments.service.spec.ts) - testes unitários do service
