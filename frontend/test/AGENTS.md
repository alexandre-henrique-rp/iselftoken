# AGENTS.md - test/

## Propósito
Testes E2E (Playwright) + setup Vitest + reporter custom. Cobertura: fluxos UX reais (registro → compra, founder-dashboard, S17 compliance hard-delete).

## Dependências
- Externas: `@playwright/test`, `vitest`, `@vitest/coverage-v8`

## Mapa de Arquivos

### Configuração base
| Arquivo | Função |
|---------|--------|
| [vitest.config.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/vitest.config.ts) | Config Vitest |
| [vitest.setup.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/vitest.setup.ts) | Setup global (mocks, polyfills) |
| [e2e/README.md](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/e2e/README.md) | Instruções E2E |

### Flows E2E (Playwright)
| Arquivo | Função |
|---------|--------|
| [flows/user-registration-to-plan-purchase.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/e2e/flows/user-registration-to-plan-purchase.spec.ts) | Fluxo completo: cadastro → checkout → plano |
| [flows/founder-dashboard-integration.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/e2e/flows/founder-dashboard-integration.spec.ts) | Founder dashboard + form inline S04 T023 |
| [flows/s17-compliance-hard-delete.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/e2e/flows/s17-compliance-hard-delete.spec.ts) | Compliance hard-delete startup (S17) |
| [flows/admin-dashboard-hydration.spec.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/e2e/flows/admin-dashboard-hydration.spec.ts) | Admin dashboard SSR hydration — KPIs, charts, filas (dados reais do banco) |

### Helpers
| Arquivo | Função |
|---------|--------|
| [flows/setup/test-helpers.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/e2e/flows/setup/test-helpers.ts) | Helper `createFounderUser()` para setup |

### Reporter custom
| Arquivo | Função |
|---------|--------|
| [reporters/per-test-html-reporter.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/test/e2e/reporters/per-test-html-reporter.ts) | Reporter HTML 1 pasta por teste (video.webm + report.html + final.png) |

> Comando: `npm run test:e2e:playwright` (headless) ou `:ui` (debug interativo).