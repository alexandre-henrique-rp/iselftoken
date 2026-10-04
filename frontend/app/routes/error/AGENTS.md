# AGENTS.md - app/routes/error

## Propósito
Páginas de erro HTTP — 401/404/500. Renderizadas via `<ErrorContainer>` (`app/components/error/`).

## Dependências
- Internas: `app/components/error/error-container`
- Externas: `react-router`

## Mapa de Arquivos
| Arquivo | Rota |
|---------|--------|
| [401.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/error/401.tsx) | `/401` — sessão ausente/inválida |
| [404.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/error/404.tsx) | `/404` — não encontrado |
| [500.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/error/500.tsx) | `/500` — erro interno |