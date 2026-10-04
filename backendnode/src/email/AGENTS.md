# Email

**Propósito:** Envio de e-mails transacionais via AWS SES, com templates HTML pré-definidos para fluxos de autenticação, verificação e notificações.

**Dependências:**
- `[../../app.module]` (registro do módulo no bootstrap)
- `[email.service]` (cliente AWS SES)

**Mapa de Arquivos:**
- [email.module.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/email.module.ts) - módulo `@Global` que provê e exporta `EmailService`
- [email.service.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/email.service.ts) - serviço principal AWS SES (tipos `template`/`simple`/`html`)
- [email.service.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/email.service.spec.ts) - testes unitários do serviço
- [README.md](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/README.md) - documentação interna do módulo
- [templates/base.template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/templates/base.template.ts) - layout HTML base reutilizado pelos templates
- [templates/index.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/templates/index.ts) - barrel de exportação dos templates
- [templates/welcome.template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/templates/welcome.template.ts) - template de boas-vindas ao usuário
- [templates/verification-code.template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/templates/verification-code.template.ts) - template do código 2FA de verificação
- [templates/validation-email.template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/templates/validation-email.template.ts) - template de validação de e-mail (cadastro)
- [templates/forgot-password.template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/templates/forgot-password.template.ts) - template de recuperação de senha
- [templates/rejection-notification.template.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/templates/rejection-notification.template.ts) - template de notificação de rejeição

## Seed de Email Templates (FIN-05)

**Arquivo:** [`prisma/seed-email-templates.ts`](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/prisma/seed-email-templates.ts)

Roda via `npm run seed:emails`. Popula a tabela `EmailTemplate` + `EmailTemplateVersion` com templates iniciais. **Idempotente** — pula templates já existentes (preserva edições manuais no painel admin).

**Total: 14 templates** (Sprint S34 adicionou 2):

| Slug | Tema | Origem |
|---|---|---|
| `welcome` | claro | seed (legado — sem tema dark) |
| `verification-code` | claro | seed (legado) |
| `validation-email` | claro | seed (legado) |
| `forgot-password` | claro | seed (legado) |
| `rejection-notification` | claro | seed (legado) |
| `repasse-configurado` | claro | seed (legado) |
| `parcela-solicitada` | claro | seed (legado) |
| `parcela-aprovada` | claro | seed (legado) |
| `parcela-rejeitada` | claro | seed (legado) |
| `parcela-depositada` | claro | seed (legado) |
| `repasse-concluido` | claro | seed (legado) |
| `marketplace-position-launch` | claro | seed (legado) |
| **`new-login-alert`** | **dark + magenta** | seed (S34) |
| **`kyc-resubmission-requested`** | **dark + magenta** | seed (S34) |

### Migração futura dos 12 templates legados (claro → dark)

Os 12 templates seedados originalmente usam HTML cru (cores claras, gradient `#667eea → #764ba2`), enquanto os templates hardcoded em `src/email/templates/*.ts` usam o `baseTemplate()` (dark + magenta `#d500f9` + Inter).

**Decisão Sprint S34:** o seed foi feito idempotente para **NÃO** sobrescrever os 12 legados. Eles continuam visíveis no banco mas com visual desalinhado do brand. Para migrar:

1. **Opção A (manual via painel admin):** entrar em `/admin/email-templates/<slug>`, editar cada template para usar o CSS dark, publicar nova versão. Cada template recebe versão 2 (preserva histórico).
2. **Opção B (migration script):** criar `prisma/migrations/email-templates-v2.ts` que sobrescreve apenas os templates seedados originalmente (não toca em edições manuais), criando versão 2 com tema dark.
3. **Opção C (manter status quo):** os 12 templates legados funcionam visualmente OK (apenas não seguem brand v1.2); os 2 novos (S34) já seguem.

A constante `DARK_EMAIL_STYLE` em `prisma/seed-email-templates.ts` contém o CSS dark+magenta+Inter pronto para ser reaproveitado pela opção A/B.

### Equivalência seed ↔ hardcoded

| Slug | Hardcoded (src/email/templates) | Banco (EmailTemplateVersion) |
|---|---|---|
| `welcome` | ✅ `welcome.template.ts` | ✅ v1 |
| `verification-code` | ✅ `verification-code.template.ts` | ✅ v1 |
| `validation-email` | ✅ `validation-email.template.ts` | ✅ v1 |
| `forgot-password` | ✅ `forgot-password.template.ts` | ✅ v1 |
| `new-login-alert` | ✅ `new-login-alert.template.ts` | ✅ v1 (S34) |
| `rejection-notification` | ✅ `rejection-notification.template.ts` | ✅ v1 |
| `kyc-resubmission-requested` | ✅ `kyc-resubmission-requested.template.ts` | ✅ v1 (S34) |
| `marketplace-position-launch` | ✅ `marketplace-position-launch.template.ts` | ✅ v1 |
| `repasse-*`, `parcela-*` | ❌ sem hardcoded | ✅ v1 |

**Resolução de template em runtime** ([email.service.ts:203](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/backendnode/src/email/email.service.ts)): tenta banco primeiro via `EmailTemplatesService.renderBySlug()`, fallback para hardcoded se não encontrar. Templates com `slug` não registrado em `mapDataForDbTemplate` (linha 195) usam só hardcoded.
