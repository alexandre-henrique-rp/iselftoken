# PRD — Páginas Pública e Privada da Startup

**ID:** STARTUP-DETAIL-01  
**Versão:** 1.1  
**Data:** 2026-09-14  
**Status:** Rascunho para aprovação  
**Prioridade:** Alta  
**Módulo:** Marketplace / Investidor / Captação

## 1. Resumo executivo

A iSelfToken terá duas experiências do detalhe de uma startup e de sua campanha ativa:

1. **Página pública de divulgação** — acessível sem autenticação, fora do componente `layout`, com informações suficientes para despertar interesse, sem expor o conteúdo completo nem permitir compra direta.
2. **Página privada do investidor** — acessível dentro do `layout` autenticado, com os dados completos autorizados da startup e da campanha ativa, além do fluxo de reserva de tokens e pagamento.

A página pública não deve ser uma versão parcialmente autenticada da página privada. Ela deve possuir contrato de dados próprio, menor e seguro por padrão. O CTA público leva o visitante para login ou cadastro e, após a autenticação exigida pelo sistema, retorna ao detalhe privado.

## 2. Problema e objetivo

### Problema

O projeto já registra as duas intenções de navegação, mas os contratos não estão coerentes:

| Experiência | Estado encontrado | Impacto |
|---|---|---|
| Pública | `/s/:slugOrId` existe fora do layout, mas o loader chama `/marketplace/public/:slugOrId`, endpoint não localizado | A página pode sempre cair em “Startup não encontrada” |
| Privada | `/startups/:id` existe dentro do layout e possui UI de detalhe, mas o BFF chama `/marketplace/startup/:id`, endpoint não localizado | A página pode falhar e ainda faz waterfall no cliente |
| Privada | Componentes de equipe, risco, fórum e resumo existem, mas o payload atual tipado cobre principalmente hero, métricas, campanha e investimento | Conteúdo pode ficar estático, vazio ou desconectado da campanha real |
| Compra | `POST /investments` e checkout por `paymentId` existem | Deve ser preservado como fluxo canônico |

### Objetivos

- Separar explicitamente conteúdo público e privado por rota, layout, contrato e autorização.
- Permitir que links compartilhados e buscadores acessem a página pública sem sessão.
- Impedir que um visitante compre tokens sem passar por autenticação, 2FA e as regras de elegibilidade vigentes.
- Entregar a página privada já com startup e campanha ativa carregadas no SSR, sem waterfall inicial no navegador.
- Exibir na página privada as informações necessárias para uma decisão de investimento e iniciar a compra com dados atuais.
- Reutilizar a linguagem visual e os componentes existentes sem duplicar regras de negócio.

### Fora de escopo

- Alterar o schema financeiro da campanha sem aprovação.
- Criar nova regra de ranking, score, pinning ou grace period.
- Criar uma nova forma de pagamento fora do checkout existente.
- Expor documentos privados por URL pública.
- Transformar a página pública em uma página de compra.
- Criar uma página de edição para founders.

## 3. Usuários e jornadas

### 3.1 Visitante não autenticado

```text
Landing / card / link compartilhado
        ↓
/s/:slugOrId  (página pública, sem layout autenticado)
        ↓ CTA “Ver detalhes e investir”
Visitante: /login?redirect=/startups/:id ou /register?redirect=/startups/:id
Usuário autenticado: /startups/:id diretamente
        ↓ login + 2FA / cadastro, quando necessário
/startups/:id  (página privada dentro do layout)
        ↓ CTA “Investir”
Modal de aporte → POST /api/investments → /checkout/payment/:paymentId
```

O parâmetro `redirect` deve aceitar apenas caminhos internos da aplicação. URLs externas ou valores malformados devem ser descartados para evitar open redirect.

### 3.2 Investidor autenticado

```text
Marketplace / link interno
        ↓
/startups/:id  (layout + sessão SSR)
        ↓
Dados da startup + campanha OPEN
        ↓
Leitura completa autorizada
        ↓
InvestmentSidebar / CTA de compra
        ↓
Validação de mínimo, token disponível, KYC e regras do backend
        ↓
Checkout por paymentId
```

A autenticação do layout continua sendo a fonte de verdade para sessão. A página não deve buscar `users/me` ou `auth/status` novamente.

## 4. Rotas e comportamento de acesso

| Rota | Público | Layout | Conteúdo | Ação de investimento |
|---|---|---|---|---|
| `/s/:slugOrId` | Visitante e usuário autenticado | Não | Resumo de divulgação de campanha `OPEN` | Não. Visitante vai para login/cadastro; usuário autenticado vai diretamente para `/startups/:id` |
| `/startups/:id` | Usuário autorizado | Sim | Detalhe completo da campanha `OPEN` | Sim, somente para campanha `OPEN` |
| `/checkout/payment/:paymentId` | Usuário autenticado conforme exceção atual do layout | Sim/exceção de checkout atual | Pagamento PIX/cartão | Continua sendo o checkout canônico |

A página pública deve continuar registrada antes das rotas privadas e nunca ser filha do `routes/layout/index.tsx`. A página privada deve permanecer filha do layout.

## 5. Wireframe do estado atual

Os wireframes abaixo documentam o que a implementação atual tenta entregar, não o desenho final aprovado.

### 5.1 Página pública atual — `/s/:slugOrId`

```text
┌─────────────────────────────────────────────────────────────┐
│ Navbar pública: logo iSelfToken                              │
├─────────────────────────────────────────────────────────────┤
│ [LOGO]  Nome da startup                    [Categoria]      │
│         Estágio                                             │
│         Descrição truncada em até 300 caracteres             │
├─────────────────────────────────────────────────────────────┤
│ ▶ Vídeo de apresentação (YouTube, quando existir)           │
├─────────────────────────────────────────────────────────────┤
│ RODADA DE CAPTAÇÃO                                          │
│ Meta | Captado | Equity | Progresso                       │
│ R$ ... | R$ ... | ...% | ███████████░░░░░░░░              │
├─────────────────────────────────────────────────────────────┤
│ O PROBLEMA                                                  │
│ A SOLUÇÃO                                                   │
├─────────────────────────────────────────────────────────────┤
│ 🔒 Para ver mais e investir                                 │
│ Equipe · Pitch deck · Risco · Fórum · Pagamento              │
│ [CRIAR CONTA E INVESTIR]                                    │
│ Já tem conta? Fazer login                                   │
├─────────────────────────────────────────────────────────────┤
│ Footer                                                       │
└─────────────────────────────────────────────────────────────┘
```

**Estilo encontrado:** fundo escuro, cards translúcidos, bordas discretas, labels em caixa alta, tipografia pesada, destaque `primary`, Navbar/Footer públicos e layout vertical centralizado. O vídeo usa proporção 16:9 e lazy loading.

### 5.2 Página privada atual — `/startups/:id`

```text
┌──────────────┬──────────────────────────────────────────────┐
│ Sidebar       │ Top navbar / sessão                          │
├──────────────┴──────────────────────────────────────────────┤
│ Referral banner (quando ?ref= válido)                        │
│                                                              │
│ Conteúdo principal                         Sidebar sticky    │
│ StartupHero                                Arrecadado         │
│ PitchVideo                                 Meta               │
│ MetricsGrid                                Progresso          │
│ BusinessSummary                            Equity             │
│ TeamSection                                Mínimo             │
│ RiskDocs                                   [Investir]         │
│ RealInvestors                                                 │
│ InvestorForum                                                  │
└─────────────────────────────────────────────────────────────┘
```

**Limitação atual:** o shell e vários componentes existem, mas o loader da rota só registra referral; o detalhe é carregado depois no cliente por `useStartupDetailQuery`. Além disso, o contrato atual não garante que todas as seções recebam dados reais da startup/campanha.

## 6. Wireframe da proposta de melhoria

### 6.1 Nova página pública — divulgação e conversão

```text
┌──────────────────────────────────────────────────────────────┐
│ Navbar pública                                                │
│ iSelfToken                         Entrar   Criar conta       │
├──────────────────────────────────────────────────────────────┤
│ Breadcrumb: Oportunidades / Startup                           │
│                                                              │
│ ┌───────────────┐  Nome da startup             [Selo/status] │
│ │ Logo/capa     │  Categoria · Estágio · Localidade pública  │
│ │               │  Proposta de valor em 1–2 linhas           │
│ └───────────────┘                                           │
├──────────────────────────────────────────────────────────────┤
│ Prova visual                                                   │
│ ┌──────────────────────────────┐  Sobre a oportunidade       │
│ │ Vídeo ou capa 16:9           │  Problema                   │
│ │ ▶ assistir apresentação      │  Solução                   │
│ └──────────────────────────────┘  Mercado/categoria          │
├──────────────────────────────────────────────────────────────┤
│ CAMPANHA ATIVA                                                 │
│ Meta                Captado              Equity              │
│ R$ ...              R$ ...               ...%                 │
│ █████████████████████░░░░░░░  progresso                       │
├──────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────────────────┐  │
│ │ Quer analisar a oportunidade completa?                    │  │
│ │ Crie sua conta ou faça login para acessar os detalhes      │  │
│ │ e iniciar um investimento com segurança.                   │  │
│ │ [CRIAR CONTA]                 [JÁ TENHO CONTA]             │  │
│ └──────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ Oportunidades relacionadas / Footer                            │
└──────────────────────────────────────────────────────────────┘
```

**Melhoria principal:** separar a apresentação pública em blocos de leitura rápida, usar capa/vídeo como âncora visual, mostrar claramente o estado da campanha e colocar um CTA único de conversão. Nenhuma informação privada deve ser apenas “escondida por CSS”; ela deve ausentar-se do DTO público.

### 6.2 Nova página privada — decisão e compra

```text
┌──────────────┬────────────────────────────────────────────────┐
│ Sidebar      │ Topbar                                         │
├──────────────┴────────────────────────────────────────────────┤
│ Breadcrumb / indicação                                        │
│                                                              │
│ ┌──────────────────────────────────────┐ ┌─────────────────┐ │
│ │ Hero da startup                      │ │ INVESTIR        │ │
│ │ Logo + nome + tese de investimento   │ │ Campanha OPEN   │ │
│ │ Capa/vídeo                            │ │ Arrecadado/meta │ │
│ └──────────────────────────────────────┘ │ Progresso       │ │
│                                          │ Equity          │ │
│ ┌──────────────────────────────────────┐ │ Preço venda     │ │
│ │ Resumo da campanha                   │ │ R$ 240 (config) │ │
│ │ Problema · solução · mercado         │ │ Preço base:     │ │
│ └──────────────────────────────────────┘ │ R$ 200 · Res.   │ │
│                                          │ R$ 1 (interno)  │ │
│ ┌──────────────────────────────────────┐ │ Tokens rest.    │ │
│ │ ALOCAÇÃO DE RECURSOS (100%)          │ │ Mínimo          │ │
│ │ 🍩 rosca + input numérico sincron.  │ │ [INVESTIR]      │ │
│ │                                      │ │ ⚠ KYC pendente │ │
│ │  Fund 40%  Dev 25%                 │ │ ou campanha     │ │
│ │  Comercial 15%  Marketing 10%       │ │ bloqueado       │ │
│ │  Nuvem 5%  Jurídico 3%  Caixa 2%   │ │ [ver condições] │ │
│ └──────────────────────────────────────┘ └─────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ Métricas financeiras e operacionais                       │ │
│ │ Valuation · Preço token · Investidores · Captação          │ │
│ └───────────────────────────────────────────────────────────┘ │
│ ┌───────────────────────────────────────────────────────────┐ │
│ │ 🔗 Afiliação: [5% ✓ selecionada] → R$ X de comissão      │ │
│ │    sobre captado (opções: 3%, 5%, 10% — Admin config.)    │ │
│ └───────────────────────────────────────────────────────────┘ │
│ Termo de Adesão: ✅ Assinado 2026-08-15 (v1.1)  |  ⏳ Pendente │
│ Tabs/seções: Tese | Time | Documentos | Riscos | Fórum       │
│                                                              │
│ Mobile: CTA de investimento fixo no rodapé, com safe area    │
│           e indicador de bloqueio inline                     │
└──────────────────────────────────────────────────────────────┘
```

**Melhoria principal:** a ação de investimento fica visível junto do contexto financeiro, a sidebar é sticky no desktop e vira CTA inferior no mobile. O conteúdo completo é organizado em seções/tabs sem remover a leitura vertical e todos os valores financeiros vêm da campanha ativa. O CTA exibe **condições de bloqueio inline** (KYC pendente, campanha não OPEN, subscription inativa) em vez de apenas desabilitar. A sidebar inclui **preço de venda configurável**, **alocação com input numérico**, **afiliação transparente** e **status do Termo de Adesão**.

## 7. Conteúdo por experiência

| Conteúdo | Público | Privado | Observação |
|---|---:|---:|---|
| Nome, logo, capa, categoria, estágio | Sim | Sim | Dados de divulgação |
| Descrição curta / proposta de valor | Sim | Sim | Limitar texto público conforme contrato |
| Vídeo de apresentação | Sim, se aprovado para divulgação | Sim | URL segura e lazy loading |
| Problema e solução | Sim, versão resumida | Sim, completa | Não duplicar segredo comercial |
| Meta, captado, progresso, equity | Sim | Sim | Somente campanha `OPEN`; são os dados financeiros públicos aprovados |
| Prazo e deadline | Não | Sim | Não fazem parte do resumo público aprovado |
| Valuation | Não por padrão | Sim | Financeiro sensível |
| Preço do token (venda) | Não | Sim | Valor de venda configurado via `token.salePrice` por Admin/Financeiro |
| Preço base / Reserva | Não | Não | Internos (`token.basePrice`, `token.reservePrice`) — não expostos |
| Alocação de recursos | Não | Sim | Gráfico de rosca 100% + input numérico sincronizado (§3A do fluxo_startup) |
| Comissão de afiliação | Não | Sim | Badge com % escolhida (Admin configura opções via `affiliate.commissionOptions`) + valor estimado sobre captado |
| Status do Termo de Adesão Digital | Não | Sim | Indicador: assinado/pendente (assunção é pré-requisito de elegibilidade) |
| Condições de investimento | Não | Sim | CTA exibe bloqueios inline: KYC pendente, subscription inativa, campanha não OPEN |
| Tokens disponíveis | Não | Sim | Atualizado pelo backend |
| Investidores / contagem | Não por padrão | Agregado, sem PII | Nunca listar nomes/emails/CPF |
| Time/sócios | Não | Sim | Exibir no privado com dados autorizados |
| Pitch deck e documentos | Não | Somente se autorizado | Nunca fazem parte da página pública |
| Análise de risco | Não | Sim | Conteúdo privado do investidor |
| Fórum | Não | Sim | Requer sessão |
| Dados bancários | Nunca | Não | Não são necessários para o investidor |
| CTA de investimento | Não | Sim | Público apenas redireciona |

## 8. Requisitos funcionais

### Público

- **RF-PUB-01:** A rota pública deve funcionar sem sessão e fora do layout autenticado.
- **RF-PUB-02:** O carregamento deve usar um DTO público dedicado, sem depender do DTO privado ou de `GET /startup/:id` genérico.
- **RF-PUB-03:** O detalhe deve aceitar slug e fallback por ID, conforme a URL já definida.
- **RF-PUB-04:** O CTA público nunca cria investimento; visitantes devem ir para login/cadastro com redirect interno e usuários já autenticados devem ir diretamente ao detalhe privado.
- **RF-PUB-05:** A página deve gerar title, description, canonical e Open Graph a partir do payload público.
- **RF-PUB-06:** Somente campanhas com status `OPEN` podem ser exibidas no detalhe público. Para qualquer outro status, o backend deve responder como indisponível/404 sem vazar detalhes internos.
- **RF-PUB-07:** Informações privadas devem ser removidas da resposta do backend, não apenas ocultadas no React.

### Privada

- **RF-PRI-01:** A rota deve permanecer sob o layout autenticado e respeitar o gating atual de sessão/2FA/plano, salvo decisão posterior aprovada.
- **RF-PRI-02:** O loader deve buscar o detalhe no servidor, propagar cookie, popular TanStack Query e hidratar o cliente.
- **RF-PRI-03:** O payload deve incluir startup, campanha ativa e somente os agregados autorizados ao investidor.
- **RF-PRI-04:** Se não houver campanha `OPEN`, a startup não deve ser exibida como oportunidade de investimento e o CTA não pode ser habilitado.
- **RF-PRI-05:** A compra deve preservar o fluxo existente: modal → `POST /api/investments` → `payment.id` → `/checkout/payment/:paymentId`.
- **RF-PRI-06:** O frontend pode antecipar validações de UX, mas o backend continua autoridade para campanha, assinatura, mínimo e disponibilidade.
- **RF-PRI-07:** KYC pendente/reprovado deve gerar orientação clara sem expor documentos ou dados pessoais.
- **RF-PRI-08:** Dados relacionados e fórum são secundários; falhas nesses blocos não podem impedir a leitura da campanha ou o CTA.

## 9. Estados de UX

Toda seção carregada da API deve possuir:

- **Loading:** skeleton preservando dimensões do hero, vídeo, métricas e CTA.
- **Empty:** mensagem contextual quando vídeo, time, documentos ou fórum não existirem.
- **Error:** erro recuperável com retry quando o bloco for opcional; erro de página para startup inválida.
- **Data:** valores formatados em PT-BR, BRL e datas locais.
- **Indisponível:** campanha fechada/pausada mostra motivo amigável e CTA de voltar ao marketplace, sem oferecer compra.

## 10. Responsividade e acessibilidade

- Desktop: conteúdo em duas colunas na página privada, com card de investimento sticky.
- Tablet: duas colunas apenas quando houver largura segura; caso contrário, empilhar CTA após o resumo.
- Mobile: conteúdo em uma coluna, CTA de investimento fixo inferior somente em campanha elegível; respeitar `env(safe-area-inset-bottom)`.
- Imagens com `alt`, vídeo com título, foco visível, botões com estados disabled/loading e modais com foco controlado.
- Não usar cor como único indicador de risco, KYC ou estado da campanha.

## 11. Métricas de sucesso

- Taxa de clique da página pública para login/cadastro.
- Percentual de visitantes que retornam ao detalhe privado após autenticação.
- Taxa de início de investimento a partir da página privada.
- Erros de detalhe público/privado por endpoint.
- LCP e CLS da página pública.
- Ausência de exposição de campos proibidos em respostas públicas e logs.

## 12. Decisões aprovadas e pontos remanescentes

### Decisões aprovadas

1. A página pública exibirá **meta, valor captado, progresso e equity**.
2. A página pública não exibirá preço do token, mínimo de investimento, prazo, valuation, tokens disponíveis, equipe, sócios, documentos, riscos ou fórum.
3. Somente campanhas com status `OPEN` aparecerão na home, na rota `/` e nos detalhes públicos/privados de oportunidade. Campanhas `DRAFT`, `PAUSED`, `CLOSED`, `FUNDED` e `PAID_OUT` ficam fora da vitrine.
4. O preço de **venda** do token será o valor oficial da campanha, configurado via `token.salePrice` por Admin/Financeiro/Compliance. Ele será exibido somente na página privada e validado pelo backend no momento do investimento. Os preços de **base** (`token.basePrice`) e **reserva** (`token.reservePrice`) são internos, não expostos ao investidor, mas configuráveis pelos mesmos atores.
5. Equipe e sócios aparecerão na página privada, usando somente dados autorizados e sem expor documentos pessoais.
6. Documentos da startup não serão exibidos na página pública. Na página privada, só poderão aparecer se houver uma política de acesso aprovada; não fazem parte do primeiro escopo desta feature.

### Recomendação profissional de URL

- Usar `/s/:slug` como URL pública canônica e indexável, por ser legível, compartilhável e adequada para SEO.
- Aceitar `/s/:id` apenas como fallback de compatibilidade.
- Quando o ID numérico for recebido e a startup possuir slug, responder com redirecionamento permanente `301` para `/s/:slug`.
- Gerar `canonical` sempre apontando para `/s/:slug`.
- Não indexar a URL numérica (`noindex, follow`) e não criar duas páginas equivalentes para o mesmo conteúdo.
- Manter o slug único e estável; caso precise ser alterado, preservar um redirect do slug anterior.
- Usar `/startups/:id` apenas como rota privada funcional, sem finalidade de SEO.

### Ponto remanescente — RESOLVIDO

- Toda e qualquer startup só aparece na home (`/`) ou na página inicial (`/`) se, e somente se, tiver **pelo menos uma campanha com status `OPEN`**. Campanhas `DRAFT`, `PAUSED`, `CLOSED`, `FUNDED` e `PAID_OUT` não são visíveis em nenhuma superfície pública. A página privada (`/startups/:id`) também só é acessível quando há campanha `OPEN` ativa.

## 13. Critérios de aceite do produto

- **AC-01:** Visitante acessa `/s/:slugOrId` sem sessão e sem sidebar/topbar do layout privado.
- **AC-02:** A resposta pública contém apenas identidade, meta, valor captado, progresso e equity da campanha `OPEN`; não contém token price, mínimo, prazo, tokens disponíveis, dados bancários, documentos privados, equipe/sócios ou PII de investidores.
- **AC-03:** O CTA público não cria investimento e envia o visitante para login/cadastro — ou diretamente ao privado se já houver sessão — com retorno seguro a `/startups/:id`.
- **AC-04:** Após autenticação válida, o usuário chega ao detalhe privado correspondente.
- **AC-05:** `/startups/:id` é protegido server-side pelo layout, sem flash de conteúdo para visitante não autenticado.
- **AC-06:** A página privada mostra dados da startup e da campanha ativa, incluindo valores necessários para compra.
- **AC-07:** Campanha diferente de `OPEN` não aparece na home, na rota `/` ou nos detalhes de oportunidade, e não permite iniciar compra.
- **AC-08:** O preço exibido no privado corresponde ao valor oficial configurado por Admin/Financeiro e a compra bem-sucedida navega para o checkout por `paymentId` existente.
- **AC-09:** Loading, erro, vazio e estado indisponível são tratados nos dois contextos.
- **AC-10:** A página pública possui metadados SEO coerentes, usa `/s/:slug` como canonical e não indexa uma startup que o backend declara não elegível.

## 14. Referências do projeto

- `CASE.md` — regras de negócio.
- `scripts/concluido/PRD_PAGINA_PUBLICA_STARTUP.md` — ciclo de visibilidade e preview.
- `scripts/concluido/PRD_PAGINA_PUBLICA_NAO_LOGADO.md` — wireframe e conteúdo público anterior.
- `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` — regras de catálogo, ainda com decisões pendentes.
- `frontend/app/routes.ts` — fonte única das rotas.
- `frontend/app/routes/public/startup-public.tsx` — implementação pública atual.
- `frontend/app/routes/private/startup-detail.tsx` — implementação privada atual.
- `frontend/app/components/startup-detail/*` — componentes de detalhe.
- `backendnode/src/api/marketplace/*` — catálogo atual, sem endpoint de detalhe encontrado.
- `scripts/PRD_RECEBIMENTO_CAPTACAO.md` — processamento, prorrogação e parcelas da captação.
- `scripts/startups/fluxo_startup.md` — fluxo completo de startup (9 etapas), referência para proveniência de dados e estados.
- `scripts/startups/PRD_CONFIG_TAXAS_VALORES.md` — configuração de taxas, valores e parâmetros financeiros (preços de token, equity, affiliate commission, SLA).


## 15. Checkout, confirmação e expiração da ordem de investimento

### 15.1 Jornada aprovada

```text
Página privada da startup
        ↓ clicar em “Investir”
Criar ordem de investimento
        ↓
Checkout /checkout/payment/:paymentId
        ↓ escolher PIX ou cartão
Pagamento confirmado
        ↓ efeitos assíncronos concluídos
Página /investments/:investmentId/success
        ↓
Resumo: startup + valor pago + total de tokens comprados
Mensagem de confirmação
Botão “Acessar transparência da startup”
```

A confirmação visual definitiva só deve aparecer quando o backend confirmar que os efeitos do pagamento foram aplicados e que os tokens foram emitidos. Enquanto o pagamento estiver `PAID`, mas os efeitos ainda estiverem em processamento, a tela deve informar: **“Pagamento recebido. Estamos finalizando a emissão dos seus tokens.”**

### 15.2 Resumo pós-compra

A página de sucesso deve mostrar:

- nome e logo da startup;
- campanha/rodada;
- valor total pago;
- preço oficial do token no momento da compra;
- total de tokens comprados;
- status do pagamento;
- status da emissão dos tokens;
- data/hora da confirmação;
- identificador público da operação, sem expor ID interno quando houver `publicId` disponível;
- mensagem: **“Compra de tokens concluída com sucesso.”**;
- botão **“Acessar transparência da startup”**, visível quando o usuário já possuir token confirmado;
- link secundário para carteira/investimentos.

A rota atual de transparência `/founder/startups/:id/transparencia` deve ser reutilizada inicialmente porque o `TokenGateGuard` já permite acesso ao investidor que possui token. Uma futura URL `/startups/:id/transparencia` pode ser criada como alias profissional, sem quebrar links existentes.

### 15.3 Abandono do checkout

Quando o usuário abandonar o checkout antes do pagamento:

1. O botão **“Cancelar pagamento e sair”** deve cancelar imediatamente a ordem.
2. A aplicação pode enviar uma requisição best-effort durante `pagehide`/navegação, sem depender exclusivamente dela.
3. O backend deve possuir um TTL/cron como autoridade final, pois o navegador pode ser fechado, perder conexão ou impedir `beforeunload`.
4. Uma ordem cancelada não pode ser retomada. O usuário deve voltar à página privada da startup e criar uma nova ordem.
5. O checkout não deve cancelar a ordem somente por troca de aba; a expiração é controlada pelo `expiresAt` do backend.

A exclusão deve ser **lógica**, não física:

- `Payment.status = CANCELED`;
- `Investment.status = CANCELED`;
- `TokenReservation.status = DISCARDED`, quando existir;
- auditoria com motivo `USER_ABANDONED` ou `CHECKOUT_EXPIRED`;
- retenção dos registros para rastreabilidade financeira, suporte e LGPD.

### 15.4 Expiração do pagamento

O backend fornece `expiresAt` e esse valor é a única fonte de verdade do countdown. O prazo recomendado para investimento é **24 horas**, configurável por ambiente/Financeiro, com o mesmo prazo propagado para a cobrança EFI.

Quando `now >= expiresAt` e o pagamento ainda não foi confirmado:

- o backend consulta/reconcilia o gateway antes de cancelar, para evitar cancelar um pagamento confirmado tardiamente;
- se continuar não pago, cancela a ordem de forma atômica;
- a interface aplica blur no conteúdo do checkout;
- exibe modal/overlay central com o título **“Pagamento expirado”**;
- informa que a ordem foi encerrada e que é necessário iniciar novamente;
- oferece o botão **“Refazer investimento”**, que retorna para `/startups/:id`;
- não permite regenerar PIX ou trocar método na ordem expirada.

### 15.5 Estados de UX

| Estado | Comportamento |
|---|---|
| `PENDING` dentro do prazo | Checkout normal, countdown visível |
| `PENDING` próximo do prazo | Aviso visual de expiração próxima |
| `PAID` com efeitos pendentes | Bloqueia novo pagamento e mostra processamento de tokens |
| `PAID` + `CONFIRMED` + tokens emitidos | Redireciona para página de sucesso |
| `CANCELED` por abandono | Blur/estado encerrado e botão para refazer |
| `CANCELED` por expiração | Blur/overlay “Pagamento expirado” e botão para refazer |
| `REFUNDED` | Estado de estorno, sem acesso à confirmação como compra concluída |
| erro de gateway | Mensagem recuperável, sem criar nova ordem automaticamente |

## 16. Critérios de aceite adicionais do checkout

- **AC-11:** Clicar em “Investir” cria uma ordem e leva ao checkout por `paymentId`.
- **AC-12:** O checkout mostra countdown baseado em `expiresAt` retornado pelo backend, sem prazo hardcoded no navegador.
- **AC-13:** O usuário consegue cancelar explicitamente a ordem antes do pagamento.
- **AC-14:** Abandono/fechamento do navegador é tratado por tentativa best-effort e sempre coberto pelo TTL/cron do backend.
- **AC-15:** Ordem expirada/cancelada fica inutilizável, é logicamente encerrada e não é excluída fisicamente.
- **AC-16:** Ao expirar, o checkout recebe estado terminal e exibe blur + overlay “Pagamento expirado”.
- **AC-17:** Pagamento recebido não é declarado como compra concluída antes de `effectsAppliedAt` e da confirmação/emissão dos tokens.
- **AC-18:** A página de sucesso mostra startup, valor pago, total de tokens, status e mensagem de confirmação.
- **AC-19:** O botão de transparência só aparece quando o usuário possui token confirmado e respeita o `TokenGateGuard`.
- **AC-20:** Um pagamento confirmado tardiamente não é cancelado pelo cron sem reconciliação com o gateway.

## 17. Página de Captação do Investidor — dados das Etapas 1, 2 e 3

**Descrição:** depois da Etapa 3 (detalhes de captação) e da **aprovação do Compliance** (gate final do fluxo founder), a startup entra na **fase de captação** e é **gerada a página de visualização** que expõe os dados necessários para um investidor **decidir investir**. Ela é construída automaticamente com base nos dados **salvos e pagos** nas Etapas 1, 2 e 3 do `fluxo_startup.md`, e corresponde às duas experiências do presente PRD: divulgação pública (`/s/:slugOrId`) e decisão/compra privada (`/startups/:id`).

### 17.1 Dados por etapa (proveniência)

| Bloco exibido na página | Fonte (Etapa 1/2/3 no fluxo) | Público | Privado | Observação |
|---|---|---|---|---|
| Nome, logo/capa, categoria, estágio | Etapa 1 (wizard) + Etapa 2 (identidade) | Sim | Sim | Dados de divulgação |
| Descrição pública / proposta de valor | Etapa 2 (descrição pública) | Sim (limitado ao contrato) | Sim (completa) | Limitar texto público conforme contrato |
| Vídeo de apresentação | Etapa 2 (upload) | Sim, se aprovado | Sim | URL segura e lazy loading |
| Problema e solução | Etapa 3 (tese) | Sim, versão resumida | Sim, completa | Não duplicar segredo comercial |
| Meta de captação, equity, progresso | Etapa 1 (meta) + Etapa 3 (equity) | Sim | Sim | Somente campanha `OPEN` |
| Valuation pré/pós-money (read-only) | Etapa 3 — cálculo automático (`Meta/Equity × 100`) | Não | Sim | Financeiro sensível |
| Preço do token (venda) | Etapa 1 (token base) + config Admin | Não | Sim | `token.salePrice` configurável |
| Preço base / Reserva | Etapa 1 + config Admin | Não | Não | Internos — não expostos |
| Quantidade de tokens | Etapa 1 (meta + token base) | Não | Sim | Atualizado pelo backend |
| Alocação de recursos (rosca + input numérico) | Etapa 3 (tópico 3A) | Não | Sim | Soma 100% — validação estrita |
| Dividendos/lucros e benefícios | Etapa 3 (form dividendos e benefícios) | Não | Sim | Com justificativas |
| Afiliação (opções configuráveis + escolha do founder) | Etapa 3 (form afiliação) | Não | Sim | Admin configura opções; founder escolhe; aplica sobre valor captado |
| Time/sócios (autorizados) | Etapa 2 (opcional) | Não | Sim | Sem documentos pessoais |
| Localidade pública | Etapa 2 (endereço) | Sim (cidade/UF) | Sim | |
| Termo de Adesão Digital | Etapa 2 (assinatura) | Não exibido | Indisponível público | Requisito de elegibilidade |
| Investidores agregados / contagem | Geração da campanha (`OPEN`) | Não por padrão | Agregado, sem PII | |
| Status do Termo de Adesão | Etapa 2 | Não | Sim | Indicador: assinado/pendente |
| Condições de investimento | Configuração + backend | Não | Sim | KYC, subscription, campanha OPEN |

**Regra de Affiliate Commission (detalhada):**
- O **Admin/Financeiro/Compliance** configura na página de configuração (`/admin/config`) as **porcentagens disponíveis** para comissão de afiliado (ex.: 3%, 5%, 10%), via chave `affiliate.commissionOptions`.
- O **Founder**, ao configurar a captação na Etapa 3, escolhe **uma única porcentagem** entre as opções definidas pelo Admin. O founder não pode definir uma porcentagem livre — apenas selecionar entre as opções configuradas.
- O valor repassado ao afiliado é calculado sobre o **valor total captado** na campanha: `valorRepassado = valorCaptado × Campaign.affiliateCommissionPct` (campanha field, escolhido pelo founder entre as `affiliate.commissionOptions` do Admin).
- A comissão é descontada dos recursos da startup antes do repasse para o founder (ver `PRD_RECEBIMENTO_CAPTACAO.md` §7 — parcelas calculadas sobre o valor captado líquido de comissões).
- A porcentagem escolhida e o valor estimado da comissão são exibidos na página privada do investidor como informação transparente.

### 17.2 Termo de Adesão Digital — Referência ao Fluxo

O Termo de Adesão Digital segue o fluxo completo descrito em `fluxo_startup.md` §2 (Edição e Finalização do Cadastro), incluindo:
- Leitura obrigatória com registro antes do aceite
- Geração dinâmica de PDF com variáveis (`{{usuario.nome}}`, `{{startup.cnpj}}`, etc.)
- Assinatura digital com certificado individual (gerado após aprovação Compliance)
- Selo visível (Nome, Documento, Data, Hora, Hash)
- Versionamento do modelo no painel Admin (ex.: v1.1 → v1.2)
- Imutabilidade dos termos já assinados (vinculados à versão em que foram assinados)

### 17.3 Regras

- A página só é gerada/exibida quando a campanha está **`OPEN`** (fase de captação iniciada após aprovação do Compliance — seção 6 do fluxo); `DRAFT`, `PAUSED`, `CLOSED`, `FUNDED` e `PAID_OUT` ficam fora da vitrine (AC-07).
- Os valores financeiros vêm da **campanha ativa** e do **cálculo read-only** da Etapa 3 (valuation pré/pós) — sem reescrita manual do founder, evitando divergências analisadas pelo Compliance.
- A **alocação de recursos** exibida reflete fielmente a validação de 100% da Etapa 3 (tópico 3A — sliders + gráfico), nunca dados editados à parte.
- Conteúdo privado nunca é apenas "escondido por CSS"; ele **ausenta-se do DTO público** (RF-PUB-07).
- O **Termo de Adesão Digital** não é legível no público: é um requisito de elegibilidade (assinatura vinculada à versão do modelo, com segurança jurídica) e não um ativo de divulgação.

### 17.4 Relação com o fluxo founder

- `fluxo_startup.md` — seções 1 (reserva/meta/token), 2 (cadastro + termo + certificados) e 3 (captação/tese/alocação/afiliação), merge de gateway da seção 6 e as notificações de conclusão por etapa (padrão da seção 2).

### 17.5 Wireframe da página de captação do investidor

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sidebar  │ Topbar (sessão)                                                      │
├──────────┴──────────────────────────────────────────────────────────────────────┤
│ Breadcrumb: Oportunidades / <Startup>       [Selo: Status]                     │
│                                                                              │
│ ┌───────────────────────────────────────────┐ ┌──────────────────────────────┐ │
│ │ [LOGO/CAPA]  Nome da startup              │ │ INVESTIR                    │ │
│ │              Categoria · Estágio          │ │ Campanha: OPEN              │ │
│ │              Cidade/UF pública            │ │ ████████████░░░░ 58%         │ │
│ │              Proposta de valor (1–2 linhas)│ │ Arrecadado  R$ 290.000      │ │
│ │ ┌───────────────────────────────────────┐ │ │ Meta        R$ 500.000      │ │
│ │ │ ▶ Vídeo de apresentação (16:9, lazy)  │ │ │ Equity      8%              │ │
│ │ └───────────────────────────────────────┘ │ │ Preço/token R$ 40,00        │ │
│ │                                            │ │ Tokens rest. 5.250          │ │
│ │ Alguns dados vem da Etapa 1/2 →            │ │ Mínimo      R$ 100,00       │ │
│ │ (metadados + identidade + localidade)      │ │ ┌────────────────────────┐  │ │
│ └───────────────────────────────────────────┘ │ │ [INVESTIR]              │  │ │
│                                                │ └────────────────────────┘  │ │
│ ┌───────────────────────────────────────────┐ │                              │ │
│ │ PITCH DECK (Etapa 2, autorizado)          │ │                              │ │
│ │ ┌───┬───┬───┬───┬───┬───┬───┬───┬───┐    │ │                              │ │
│ │ │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │ 8 │ 9 │    │ │                              │ │
│ │ └───┴───┴───┴───┴───┴───┴───┴───┴───┘    │ │                              │ │
│ │ [<< Anterior] Página 3/9  [Próximo >>]    │ │                              │ │
│ │ [Baixar PDF]                              │ │                              │ │
│ └───────────────────────────────────────────┘ │                              │ │
│ ┌───────────────────────────────────────────┐ │ ┌────────────────────────┐  │ │
│ │ MÉTRICAS DA RODADA (Etapa 1 + Etapa 3)    │ │ │ Valuation encontr.     │  │ │
│ │ Valuation pré-money  R$ 5.750.000         │ │ │ (read-only Etapa 3)    │  │ │
│ │ Valuation post-money R$ 6.250.000         │ │ └────────────────────────┘  │ │
│ │ (Meta ÷ Equity × 100 ; post − meta)       │ │                              │ │
│ └───────────────────────────────────────────┘ │                              │ │
│ ┌───────────────────────────────────────────┐ │                              │ │
│ │ TESE DE NEGÓCIO (Etapa 3)                 │ │                              │ │
│ │ Problema  Solução  Diferencial            │ │                              │ │
│ │ Modelo de receita  Mercado-alvo           │ │                              │ │
│ │ Compradores  Concorrência                 │ │                              │ │
│ └───────────────────────────────────────────┘ │                              │ │
│ ┌───────────────────────────────────────────┐ │                              │ │
│ │ ALOCAÇÃO DE RECURSOS — 100% (Etapa 3)     │ │                              │ │
│ │  🍩 rosca  [Fund 40%] [Dev 25%]          │ │                              │ │
│ │  [Comercial 15%] [Marketing 10%]         │ │                              │ │
│ │  [Nuvem 5%] [Jurídico 3%] [Caixa 2%]     │ │                              │ │
│ └───────────────────────────────────────────┘ │                              │ │
│ ┌───────────────────────────────────────────┐ │                              │ │
│ │ DIVIDENDOS E BENEFÍCIOS (Etapa 3)         │ │                              │ │
│ │ Lucros? Sim — política com justificativa  │ │                              │ │
│ │ Benefícios? Sim — lista autorizada        │ │                              │ │
│ │ Afiliação: sim, comissão 5% (do admin)    │ │                              │ │
│ └───────────────────────────────────────────┘ │                              │ │
│ ┌───────────────────────────────────────────┐ │                              │ │
│ │ TIME / SÓCIOS (Etapa 2, autorizado)       │ │                              │ │
│ │ [Avatar] Nome · Cargo   [Avatar] Nome     │ │                              │ │
│ └───────────────────────────────────────────┘ │                              │ │
│ │ Tabs: Tese | Time | Documentos | Riscos | Fórum                            │ │
│ │                                                                          │ │
│ │ Mobile: CTA "Investir" fixo no rodapé (safe area)                          │ │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Fundo escuro**, cards translúcidos, bordas discretas, destaque `primary` (magenta brand `#d500f9`) para o CTA e progresso.
- Financial core (valuation, preço do token, tokens) só no **privado**; público mostra apenas Meta/Captado/Progresso/Equity (+ proposta de valor resumida).
- O **pitch deck** (Etapa 2) fica entre o vídeo e as métricas, com **visualizador de páginas** (thumbnails, "Anterior/Próximo", contador 3/9) e **download em PDF condicionado** à autorização/política de acesso (o PDF do pitch nunca é público).
- Todos os números financeiros vêm da **campanha ativa** + **cálculo read-only** da Etapa 3 — nada é digitado na página.

### 17.6 Ciclo de visibilidade da página (preview → ativa)

| Fase | Quem vê | O que vê |
|---|---|---|
| **Preview (Etapas 2 e 3, fluxo founder)** | **Somente o founder** (rota autenticada com ownership, ex.: `/founder/startups/:id/captacao-preview`) | Prévia da página conforme dados das Etapas 1–3; blocos ainda sem dados mostram **empty state/placeholder**. Nenhum outro usuário logado, Admin ou visitante acessa |
| **Revisão (cadastro enviado, antes do gate final)** | Founder (preview) + Compliance/Admin (revisão read-only da seção 4B/5 — visão interna, **não** é a página pública) | Igual ao preview; sem URL pública |
| **Ativa (captação `OPEN`, após aprovação)** | **Toda a plataforma logada** + **visitantes não logados (parcial)** | Logados: página **privada completa** (decidir e investir). Não logados: página **pública parcial** (meta, captado, progresso, equity, proposta resumida) — jamais valuation, preço do token, tokens, alocação, dividendos/afiliação, time ou pitch/documents sem política aprovada |

**Regras de visibilidade:**
- O preview é **governado por ownership/rota autenticada**, nunca por "esconder por CSS".
- A URL pública (`/s/:slugOrId`) **só passa a existir quando a campanha fica `OPEN`**; antes disso responde 404/indisponível sem vazar detalhes.
- As Etapas 2 e 3 liberam o **botão "Visualizar página de captação"** no preview do fluxo founder; o botão só mostra para o próprio founder (seções 2 e 3 do `fluxo_startup.md`).
- A página privada completa (`/startups/:id`) obedece ao gating de autenticação/2FA/plano vigente (RF-PRI-01).

### 17.7 Variantes de status na página (nova alteração — ciclo de conclusão/prorrogação)

A página de captação reflete os estados do novo ciclo (ver `PRD_RECEBIMENTO_CAPTACAO.md`):

```text
① Durante a captação (OPEN original)              ③ Prorrogação aceita + reserva paga (REATIVADA)
┌──────────────────────────────────────┐          ┌──────────────────────────────────────────────┐
│ [SELO] CAPTAÇÃO EM ANDAMENTO         │          │ [SELO] CAPTAÇÃO PRORROGADA 🡅                  │
│ Arrecadado  R$ 500.000               │          │ Arrecadado  R$ 500.000 + R$ 200.000 = 700k    │
│ Meta        R$ 500.000 · 100% sold   │          │ Meta        R$ 700.000 · período novo          │
│ INVESTIR: [aberto]                   │          │ INVESTIR: 5.000 tokens novos (reserva paga)    │
└──────────────────────────────────────┘          └──────────────────────────────────────────────┘

② Conclusão em processamento (OFFLINE p/ novos)   ④ Finalização definitiva (parcelas liberadas)
┌──────────────────────────────────────┐          ┌──────────────────────────────────────────────┐
│ [SELO] CAPTAÇÃO CONCLUÍDA — PROCESSO │          │ [SELO] CAPTAÇÃO ENCERRADA ✓                  │
│ Arrecadado  R$ 300.000 (60%)         │          │ Arrecadado  R$ 500.000 · 100%                │
│ INVESTIR: [bloqueado — processamento]│          │ INVESTIR: [encerrado — parcelas em repasse    │
│ Fundador/Admin: "valores em análise · │          │  (transparência: relatórios + comprovantes)] │
│  ∼7 dias, prorrogável"               │          └──────────────────────────────────────────────┘
└──────────────────────────────────────┘
```

**Regras das variantes:**
- **① `OPEN`:** SAFE normal (wireframe 17.4).
- **② `AWAITING_PAYOUT_DECISION`:** os selos "FUNDED/tempo expirado" e CTA `INVESTIR` **desabilitado** com aviso de processamento (∼7 dias, prorrogável); a página segue visível (leitura), mas sem novas compras.
- **③ Prorrogação:** exibe **arrecadação somada** (ex.: R$ 700k), selo "CAPTAÇÃO PRORROGADA" e os **tokens adicionais** da nova reserva após o pagamento; meta e token counts refletem a extensão (dados da campanha ativa). A arrecadação = valor captado antigo + adicional da extensão.
- **④ Parcelas (`PAID_OUT`):** CTA `INVESTIR` encerrado; badge leva à **transparência** (relatórios + comprovantes) para founder e investidores.
- O **valuation read-only** (Etapa 3) e o **pitch deck** continuam conforme 17.4, agora também refletindo a meta somada quando a rodada foi prorrogada.
