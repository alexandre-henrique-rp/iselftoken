# founder

**Propósito:** Gerencia dados de fundadores e o fluxo de adesao digital via PKI/assinatura de certificado. Hoje o modulo se materializa na feature `termo-adesao`, que emite, assina e verifica o termo de adesao do fundador.

**Dependências:**
- `[../../common]` (PKI, DTOs, filtros, guardas, validators)
- `[../startup]` (startup vinculada ao fundador)
- `[../../prisma]` (acesso ao banco)
- `[../../auth]` (guarda AuthGuard nas rotas)

**Mapa de Arquivos:**
- [termo-adesao/termo-adesao.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/founder/termo-adesao/termo-adesao.module.ts) - declaracao do modulo NestJS
- [termo-adesao/termo-adesao.controller.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/founder/termo-adesao/termo-adesao.controller.ts) - rotas HTTP de emissao/assinatura/verificacao
- [termo-adesao/termo-adesao.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/founder/termo-adesao/termo-adesao.service.ts) - logica de negocio do termo
- [termo-adesao/termo-adesao.controller.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/founder/termo-adesao/termo-adesao.controller.spec.ts) - teste do controller
- [termo-adesao/termo-adesao.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/founder/termo-adesao/termo-adesao.service.spec.ts) - teste do service
- [termo-adesao/dto/sign-termo-adesao.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/founder/termo-adesao/dto/sign-termo-adesao.dto.ts) - payload de assinatura
- [termo-adesao/dto/termo-adesao-response.dto.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/api/founder/termo-adesao/dto/termo-adesao-response.dto.ts) - resposta do termo
