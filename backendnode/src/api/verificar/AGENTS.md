# Verificar

**Propósito:** Endpoints públicos para validar autenticidade de documentos assinados digitalmente (Termo de Adesao). Sem autenticação, com rate limit de 100 req/IP/min.

**Dependências:**
- `../../prisma` (acesso ao banco via PrismaModule)
- `../../s3` (URLs presigned para download de PDF)
- `../../common/pki` (validacao de certificados X.509)
- `@nestjs/throttler` (rate limiting)

**Mapa de Arquivos:**
- [verificar.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/verificar/verificar.module.ts) - módulo NestJS, registra controller e service
- [verificar.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/verificar/verificar.controller.ts) - rotas GET /verificar/:id e /verificar/:id/download
- [verificar.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/verificar/verificar.service.ts) - validacao de hash SHA-256, certificados e redirecionamento S3
- [verificar.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/verificar/verificar.controller.spec.ts) - testes do controller
- [verificar.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/verificar/verificar.service.spec.ts) - testes do service
- [dto/](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/verificar/dto) - DTOs de resposta (VerificarResponseDto, NotFound, Download)