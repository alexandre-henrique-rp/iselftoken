# AGENTS.md - app/components/profile

## Propósito
Perfil do usuário e fluxo KYC — hero, address/identity/cards, KYC stepper (uploads, ação), plano banner, country-select, liveness modal.

## Dependências
- Internas: `app/hooks/use-upload`, `use-user`, `app/lib/queries` (countries)
- Externas: `react`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [profile-hero.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/profile-hero.tsx) | Hero do perfil com avatar/dados básicos |
| [profile-page.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/profile-page.tsx) | Página consolidada (PATCH via useMutation, Fase 3B.3) |
| [profile-plan-banner.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/profile-plan-banner.tsx) | Banner com plano atual + CTA upgrade |
| [profile-identity-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/profile-identity-card.tsx) | Card de identidade (CPF, RG, data nasc.) |
| [profile-address-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/profile-address-card.tsx) | Card de endereço |
| [profile-documents.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/profile-documents.tsx) | Container dos documentos enviados |
| [profile-document-tile.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/profile-document-tile.tsx) | Tile individual de documento (preview/status) |
| [country-select.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/country-select.tsx) | Select de país (`countriesQueryOptions`, Fase 3B.3) |
| [liveness-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/profile/liveness-modal.tsx) | Modal de captura liveness |