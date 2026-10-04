# Backup

**Propósito:** Serviço e interceptor para captura de snapshot dos dados do usuário antes de operações administrativas (`ADMIN`, `UPDATE`, `DELETE`). Garante trilha de auditoria e possibilidade de rollback.

**Dependências:**
- `[../prisma]` (acesso ao banco via `PrismaService`)
- `[../common]` (decorators, filtros e utilitários compartilhados)

**Mapa de Arquivos:**
- [backup.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/backup/backup.module.ts) - módulo `@Global` que provê `BackupService` e `BackupInterceptor`
- [backup.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/backup/backup.service.ts) - lógica de snapshot (`userBackup`) com enum `BackupProcess`
- [backup.interceptor.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/backup/backup.interceptor.ts) - interceptor NestJS que aciona o backup automaticamente
- [backup.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/backup/backup.service.spec.ts) - testes unitários do serviço de backup
