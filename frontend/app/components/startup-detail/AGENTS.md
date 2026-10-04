# AGENTS.md - app/components/startup-detail

## Propósito
Componentes da página de detalhe de uma startup específica (`/startups/:id`) — hero, vídeo de pitch, métricas, business summary, equipe, docs de risco, investidores reais, fórum e sidebar de investimento.

## Dependências
- Internas: `app/types/founder-startup`, `app/hooks/use-plan`, `use-auth-status`
- Externas: `react-router`, `sonner`

## Mapa de Arquivos
| Arquivo | Função |
|---------|--------|
| [startup-hero.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/startup-hero.tsx) | Hero (logo, nome, tagline, CTA investir) |
| [pitch-video.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/pitch-video.tsx) | Player de vídeo de pitch |
| [metrics-grid.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/metrics-grid.tsx) | KPIs da startup (ARR, usuários, ticket médio) |
| [business-summary.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/business-summary.tsx) | Resumo executivo do negócio |
| [team-section.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/team-section.tsx) | Time fundador |
| [risk-docs.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/risk-docs.tsx) | Documentos de risco/análise |
| [real-investors.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/real-investors.tsx) | Lista de investidores reais (anonimizados) |
| [investor-forum.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/investor-forum.tsx) | Fórum de perguntas/respostas |
| [investment-sidebar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/startup-detail/investment-sidebar.tsx) | Sidebar de aporte (valor, método, simular) |