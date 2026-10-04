# Users

**Propósito:** Gestão de usuários da plataforma: cadastro, perfil, dados pessoais, KYC e operações administrativas de conta.

**Dependências:**
- `[../../auth]` (AuthModule: JWT, 2FA e sessão)
- `[../../auth/session]` (SessionService: cache Redis)
- `[../startup]` (StartupModule)
- `[../../prisma]` (PrismaService: acesso ao banco)

**Mapa de Arquivos:**
- [users.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/users/users.module.ts) - definição do módulo NestJS
- [users.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/users/users.controller.ts) - rotas HTTP de usuários
- [users.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/users/users.service.ts) - regras de negócio
- [users.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/users/users.controller.spec.ts) - testes do controller
- [users.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/users/users.service.spec.ts) - testes do service
- [dto/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/users/dto) - DTOs de criação e edição
- [entities/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/users/entities) - entidades de resposta
