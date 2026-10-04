# Prisma

**Propósito:** Camada de acesso ao banco de dados SQLite via Prisma ORM. Provê `PrismaService` como provedor global injetável em todos os módulos do projeto.

**Dependências:**
- `[../../../prisma/schema.sqlite.prisma]` (definição do schema e modelos)
- `[../../../node_modules/@prisma/client]` (client Prisma gerado)

**Mapa de Arquivos:**
- [prisma.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/prisma/prisma.module.ts) - módulo `@Global` que provê e exporta `PrismaService`
- [prisma.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/prisma/prisma.service.ts) - service com `OnModuleInit`/`OnModuleDestroy` e adapter MariaDB singleton
- [prisma.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/prisma/prisma.service.spec.ts) - testes unitários do ciclo de vida do service
