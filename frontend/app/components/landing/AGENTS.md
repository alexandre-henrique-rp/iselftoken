# AGENTS.md - app/components/landing

## Propósito
Componentes da landing page pública (`/`) — hero, navbar, carousel 3D, oportunidades, how-it-works, featured rounds, depoimentos (startups/investidores), ranking early-access, recently added, footer.

## Dependências
- Internas: `app/types/landing-data`, `app/types/banner-slide`
- Externas: `react`, `sonner`

## Mapa de Arquivos

### Estrutura & navegação
| Arquivo | Função |
|---------|--------|
| [navbar.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/navbar.tsx) | Topo fixo com CTA login/cadastro |
| [footer.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/footer.tsx) | Rodapé com redes sociais + links |
| [hero.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/hero.tsx) | Hero principal (copy + CTA + ilustração) |
| [carousel-3d.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/carousel-3d.tsx) | Carousel 3D de destaques |

### Seções de produto
| Arquivo | Função |
|---------|--------|
| [opportunities.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/opportunities.tsx) | Lista de oportunidades |
| [how-it-works.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/how-it-works.tsx) | Passo-a-passo |
| [featured-rounds.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/featured-rounds.tsx) | Rodadas em destaque |
| [recently-added.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/recently-added.tsx) | Startups recém-adicionadas |
| [early-access-ranking.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/early-access-ranking.tsx) | Ranking de early-access |

### Social proof
| Arquivo | Função |
|---------|--------|
| [testimonials-startups.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/testimonials-startups.tsx) | Depoimentos de fundadores |
| [testimonials-investors.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/testimonials-investors.tsx) | Depoimentos de investidores |
| [testimonial-socials.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/testimonial-socials.tsx) | Ícones sociais do depoimento |

### Documentos legais (páginas públicas)
| Arquivo | Função |
|---------|--------|
| [privacy-policy-content.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/privacy-policy-content.tsx) | Conteúdo da Política de Privacidade (LGPD Art. 9) — `/politica-privacidade` |
| [terms-of-use-content.tsx](file:///home/kingdev/Documentos/GitHub/Iselftokenv2/frontend/app/components/landing/terms-of-use-content.tsx) | Conteúdo dos Termos de Uso (CVM 88/2022) — `/termos-de-uso` |