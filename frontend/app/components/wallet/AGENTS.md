# AGENTS.md - app/components/wallet

## Propósito

Componentes compartilhados do layout **editorial** das carteiras (investidor + afiliado). Wrappers de secao (Bento stats, Asset list, Transaction statement) usados pelas paginas `/wallet` e `/affiliate/financeiro` para garantir identidade visual consistente entre os dois perfis.

## Dependências

- Internas: `app/components/ui/pagination` (paginacao numerada reutilizavel)
- Externas: `react`

## Mapa de Arquivos

| Arquivo | Funcao |
|---------|--------|
| `editorial-wallet-shell.tsx` | Wrapper da pagina: header editorial + watermark de fundo. Aceita `eyebrow`, `title`, `description`, `watermark`, `children`. |
| `wallet-bento-stats.tsx` | Layout Bento 3-cols: hero card (2 ou 1 cols) + summary grid (3 cards). Configuravel via `layout: hero-left \| hero-right`. |
| `wallet-asset-list-editorial.tsx` | Wrapper generico de lista editorial (header + rows + paginacao). Recebe `columns` + `renderItem` + `keyOf`. Estado vazio/loading tratado. |
| `editorial-asset-row.tsx` | Linha glass-panel + avatar (48x48 ou 56x56) + colunas + acoes. Responsiva (stack vertical em mobile, 12-cols em desktop). |
| `wallet-transaction-statement.tsx` | Tabela editorial glass-panel: header uppercase + rows + paginacao. Recebe `columns: StatementColumn[]` com `render` customizado por coluna. |
| `withdraw-header.tsx` | Header do fluxo de saque |
| `withdraw-summary.tsx` | Resumo do saque (valor + taxa + destino) |
| `withdraw-form.tsx` | Form de saque (valor, dados bancarios) |

## Convencoes

- Todos os wrappers aceitam `isLoading` para esqueleto shimmer durante fetches SSR ou TanStack.
- Paginacao sempre usa o componente `<Pagination>` em `app/components/ui/pagination.tsx` (mesmo padrao das Central de Cupons).
- Mensagens em PT-BR; datas/horas formatadas com `toLocaleDateString("pt-BR")` ou `dataPtBr(iso)`.
- Glass panels e cores vem de `app/styles/theme.css` (tokens `glass-panel`, `glass-card`, `glass-strong`, `btn-accent`, pills).

## Anti-padroes

- ❌ NUNCA criar markup inline em routes — extrair para um componente deste diretorio.
- ❌ NUNCA duplicar o layout editorial dentro de uma route — reusar `EditorialWalletShell` + `WalletBentoStats` + `WalletAssetListEditorial`/`WalletTransactionStatement`.
- ❌ NUNCA misturar tokens de carteiras diferentes (investidor vs afiliado) sem deixar explicito no nome (ex: `affiliate-wallet-card.tsx`).
