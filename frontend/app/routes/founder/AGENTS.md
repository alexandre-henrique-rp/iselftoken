# AGENTS.md - app/routes/founder

## Propósito
Rotas públicas do Fundador (auth-gated) que não cabem em `private/` — ex: leitura integral do termo de adesão.

## Dependências
- Internas: `app/hooks/use-termo-adesao-status`, `app/components/founder/termo-adesao-{content,legal-banner,actions}`, `app/components/wallet/editorial-wallet-shell`, `app/lib/termo-adesao-text`
- Externas: `react-router`

## Mapa de Arquivos
| Arquivo | Rota |
|---------|--------|
| [termo-adesao/texto.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/routes/founder/termo-adesao/texto.tsx) | `/founder/termo-adesao/texto` — texto integral do termo (S18.4); shell editorial + banner legal + body do termo (HTML dark via `getTermoAdesaoBody`); abre via `<Link target="_blank">` em `termo-adesao-section.tsx` |

## Convenções
- Esta rota é shell fino (≤40 linhas): meta + loader + componente que apenas orquestra os componentes do `app/components/founder/`.
- Conteúdo HTML do termo vive em `app/lib/termo-adesao-text.ts` (fonte única); `getTermoAdesaoBody()` extrai o body e reescreve o CSS inline para os tokens dark da casa.
- Estilos prose do termo (h1/h2/h3/p/ul/highlight) ficam em `app/styles/theme.css` sob a classe `.termo-adesao-prose`.