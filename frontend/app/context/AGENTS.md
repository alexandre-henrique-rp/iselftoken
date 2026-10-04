# AGENTS.md - app/context

## Propósito
Contextos React remanescentes. Apenas ToastContext — AuthContext foi eliminado na Fase 3C em favor de TanStack Query.

## Dependências
- Externas: `react`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [ToastContext.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/context/ToastContext.tsx) | Provider de toasts (wrapper do Sonner); expõe `useToast()` |

> Anti-pattern: NÃO criar novos Context para estado de servidor — use TanStack Query via `app/hooks/`.