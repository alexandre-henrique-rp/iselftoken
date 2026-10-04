# tokens

**Propósito:** Service utilitario para emissao e gerenciamento de tokens de investimento. Nao expoe controller proprio - e consumido por outros modulos da API (ex.: transactions, investment).

**Dependências:**
- `[../../prisma]` (acesso ao banco via PrismaService)
- `[../../common/dto]` (ResponseDto para envelope padrao)

**Mapa de Arquivos:**
- [tokens.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/tokens/tokens.service.ts) - emitTokensForInvestment e helpers de criacao/hash
