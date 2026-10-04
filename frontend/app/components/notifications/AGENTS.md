# AGENTS.md - app/components/notifications

## Propósito
Centro de notificações — header + card individual. Consumidos por `routes/private/notifications.tsx` (Fase 3B.4).

## Dependências
- Internas: `app/lib/queries.ts` (`notificationsPageQueryOptions`, `notificationsUnreadCountQueryOptions`)
- Externas: `react`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [notification-header.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/notifications/notification-header.tsx) | Header com contadores (lidas/não lidas) |
| [notification-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/notifications/notification-card.tsx) | Card de notificação + ação "marcar como lida" |