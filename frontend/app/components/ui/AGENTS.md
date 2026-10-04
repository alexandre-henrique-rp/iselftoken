# AGENTS.md - app/components/ui

## Propósito
Primitivos UI reutilizáveis — building blocks atômicos usados por toda a aplicação. Padrão shadcn-style (CVA + tailwind-merge).

## Dependências
- Externas: `react`, `sonner`, `tailwind-merge`, `clsx`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [toast.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/ui/toast.tsx) | Wrapper de toast (compat com ToastContext) |
| [sonner.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/ui/sonner.tsx) | Renderização do Toaster do Sonner |
| [select-pais.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/ui/select-pais.tsx) | Select de países (consome `countriesQueryOptions`) |
| [upload-zone.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/ui/upload-zone.tsx) | Drop zone para upload de arquivos |
| [global-loading.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/ui/global-loading.tsx) | Spinner global de loading |