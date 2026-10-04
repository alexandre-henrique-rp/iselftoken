# AGENTS.md - app/components/affiliate

## Propósito
Componentes compartilhados entre as páginas de afiliados (vitrine do afiliado em `/affiliate`, triagem do fundador em `/founder/affiliate/triagem`, admin em `/admin/affiliate`, financeiro do afiliado em `/affiliate/financeiro`).

## Dependências
- Internas: `app/lib/affiliate-types` (tipos `Candidatura`, `CandidaturaStatus`), `~/lib/utils`
- Externas: `react-router`, `lucide-react`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [affiliate-candidatura-card.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/affiliate/affiliate-candidatura-card.tsx) | Card de candidato (status PENDING_FOUNDER) — nome, email, comissão, tokens disponíveis, ações |
| [affiliate-triagem-modal.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/affiliate/affiliate-triagem-modal.tsx) | Modal de decisão (aprovar com tokens / rejeitar com motivo) — usado na triagem do fundador |
| [affiliate-history-table.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/affiliate/affiliate-history-table.tsx) | Tabela compacta de afiliações decididas (status != PENDING_FOUNDER) |
