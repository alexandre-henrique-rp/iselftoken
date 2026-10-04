# AGENTS.md - app/types

## Propósito
Definições de tipos TypeScript compartilhadas — tipos de domínio que vêm do backend NestJS e tipos de view da landing. Consumidos por hooks, BFFs e componentes.

## Dependências
- Externas: `typescript` (apenas); sem deps runtime

## Mapa de Arquivos

### Auth / sessão
| Arquivo | Função |
|---------|--------|
| [auth.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/auth.ts) | `UserData`, `AuthResponse`, contratos de login/register/2FA |

### Landing / marketplace público
| Arquivo | Função |
|---------|--------|
| [landing-data.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/landing-data.ts) | Tipos agregados da home |
| [banner-slide.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/banner-slide.ts) | Slide do carousel/banner principal |
| [startup-featured.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/startup-featured.ts) | Cards em destaque |
| [startup-opportunity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/startup-opportunity.ts) | Oportunidade da seção "Featured Rounds" |
| [early-access-ranking.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/early-access-ranking.ts) | Ranking de early-access |
| [early-access-opportunity.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/early-access-opportunity.ts) | Card de early-access |
| [curated-pick.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/curated-pick.ts) | Picks curados |
| [category-item.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/category-item.ts) | Item de categoria (grid de marketplace) |
| [marketplace-data.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/marketplace-data.ts) | Agregado de marketplace |
| [paginated-catalog.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/paginated-catalog.ts) | Wrapper de paginação genérico |
| [testimonial.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/testimonial.ts) | Depoimentos de startups/investidores |

### Founder dashboard
| Arquivo | Função |
|---------|--------|
| [founder-startup.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/founder-startup.ts) | Startup enriched (badge, valorCaptado, metaCaptacao) |
| [dashboard.ts](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/types/dashboard.ts) | `DashboardOverview`, `Summary`, `TabsCount`, `Badge`, `NextAction` (M5-S12) |