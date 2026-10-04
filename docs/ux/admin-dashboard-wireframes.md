# /admin/dashboard — 5 Wireframes de UX

**Data:** 2026-09-08
**Autor:** impeccable design audit (shape mode)
**Status:** Proposta para revisão — 5 direções distintas, NÃO variações

---

## Contexto

A página atual do `/admin/dashboard` segue o template SaaS padrão: 5 KPIs em card grid + 2 gráficos + 2 filas. Funcional, mas genérico — qualquer plataforma fintech tem essa tela. O admin do iSelfToken tem 3 jobs reais:

1. **Verificar saúde** da plataforma em <5 segundos (entrou pra checar 1 coisa)
2. **Triar pendências** (saques, campanhas, KYC) com 1-2 cliques
3. **Entender tendências** (volume crescendo? usuários novos? captações em risco?)

Os wireframes abaixo exploram 5 filosofias UX distintas. Cada uma resolve esses 3 jobs de forma diferente.

---

## Wireframe 1 — **WAR ROOM** (Mission Control em tempo real)

**Filosofia:** Monitorar plataforma como operador de voo. Tudo numa tela, priorização por urgência, zero scroll para o essencial.

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚡  iSelfToken Control        Live • Optimal • DB up • 0 critical     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║  PLATFORM HEALTH                                          ●LIVE║ │
│  ║  R$ 2.847.500 captados hoje        ↑ 12% vs ontem              ║ │
│  ║  8 campanhas abertas · 142 usuários ativos · 0 erros críticos║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                     │
│  ┌─ ATTENTION NEEDED ──────┐  ┌─ ACTIVITY ───────────────────┐     │
│  │                         │  │ • Novo investimento R$ 5k    │     │
│  │ ⚠ 3 saques > 7d         │  │   Acme Tech · 2 min          │     │
│  │   aguardando aprovação  │  │ • Saque aprovado: Beta Inc  │     │
│  │                         │  │   R$ 12k · 14 min            │     │
│  │ ⚠ 1 campanha stalled    │  │ • KYC aprovado: João S.     │     │
│  │   há 3 dias sem tokens  │  │   · 22 min                  │     │
│  │                         │  │ • Novo usuário cadastrado   │     │
│  │ ⚠ 5 KYC > 24h em fila   │  │   · 31 min                  │     │
│  │                         │  └─────────────────────────────┘     │
│  │ [VER FILA COMPLETA →]   │                                       │
│  └─────────────────────────┘  [Ver histórico completo]               │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  [Pulsing waveform ao vivo dos últimos 60s]                   │  │
│  │  Investimentos/s · Logins/s · Saques/s                       │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Características
- **Banner de saúde central** com 1 número hero (GMV do dia + delta vs ontem)
- **Painel "Attention Needed"** à esquerda: 3 alertas priorizados por SLA
- **Feed de atividade** à direita: últimos 4 eventos com timestamp relativo
- **Waveform live** no rodapé: métricas em tempo real (atualiza a cada 30s)
- **CTA explícito** em cada alerta → leva direto para a fila correspondente

### Vantagens
- ✅ Zero-scroll para o essencial (1ª dobra carrega tudo que importa)
- ✅ Alertas visuais imediatos — admin sabe em 2s se algo está errado
- ✅ Live waveform cria sensação de "está vivo" (reflete o systemStatus pulsante)

### Desvantagens
- ⚠️ Não mostra tendências históricas (precisa clicar para ver charts)
- ⚠️ Densidade alta — pode ser overwhelming para admin júnior
- ⚠️ Live waveform exige polling constante (custo de infra)

### Mobile
Empilha: banner → atenção → atividade → waveform. Esconde waveform em mobile (não funciona em telas pequenas).

### Persona
**Admin Sênior** que entra 5x/dia para checagem rápida. Sabe o que procurar; precisa de velocidade, não de educação.

---

## Wireframe 2 — **EDITORIAL BRIEFING** (Morning Report narrativo)

**Filosofia:** Dashboard como matéria de jornal. Conta uma história sobre o estado da plataforma. Lê-se, não escaneia-se.

```
┌─────────────────────────────────────────────────────────────────────┐
│  iSelfToken                                                          │
│  Quinta-feira, 8 de setembro · Edição 09:14                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ╔═══════════════════════════════════════════════════════════════╗ │
│  ║                                                               ║ │
│  ║  HOJE                                                          ║ │
│  ║                                                               ║ │
│  ║  R$ 47.300                                                    ║ │
│  ║                                                               ║ │
│  ║  captados em 4 investimentos                                  ║ │
│  ║                                                               ║ │
│  ║  — terça melhor dia da semana (+38% vs segunda)              ║ │
│  ║                                                               ║ │
│  ╚═══════════════════════════════════════════════════════════════╝ │
│                                                                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐          │
│  │  USUÁRIOS   │  STARTUPS   │ CAMPANHAS   │ TOKENS      │          │
│  │    142      │    25       │     8       │  32.5k      │          │
│  │  +3 hoje    │  +0 hoje    │  +1 hoje    │  +800 hoje  │          │
│  └─────────────┴─────────────┴─────────────┴─────────────┘          │
│                                                                     │
│  ── A SEMANA EM CURVAS ──                                            │
│                                                                     │
│  Investimentos ▲▲▲  │  Usuários ▲▲     │  Saques ▲                │
│                                                                     │
│  ── AGORA NA PLATAFORMA ──                                           │
│                                                                     │
│  3 saques pendentes desde 2 de setembro · há 6 dias                  │
│  1 campanha com deadline em 14 dias · 73% captada                    │
│  5 aprovações de KYC aguardando sua revisão desde ontem              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Características
- **Hero narrativo**: 1 número + 1 frase de contexto. Sem "biggest metric wins" — copy explica.
- **Data contextualizada**: +3 hoje, +0 hoje, etc. — sempre com delta humano
- **Séries como linhas do tempo**: "A semana em curvas" — conta história, não mostra dado
- **Seção "Agora na plataforma"**: copy em vez de tabela. "3 saques pendentes desde 2 de setembro" — prioriza o que precisa de ação, com prazo humanizado

### Vantagens
- ✅ Acolhe admin novo (lê como matéria, não como planilha)
- ✅ "Agora na plataforma" prioriza pendências com prazo humano, não timestamp técnico
- ✅ Editorial branding consistente com o resto do iSelfToken (mesma linguagem da Wallet)

### Desvantagens
- ⚠️ Copy precisa ser mantido/cuidado (não é "render puro de dados")
- ⚠️ Usuário power pode achar verboso
- ⚠️ Fila de saques/campanhas fica em segundo plano (não é 1-click action)

### Mobile
Hero stack → KPIs viram stack vertical → "Agora na plataforma" vira accordion. Copy completo no mobile.

### Persona
**Admin novo ou júnior** + **Admin que prefere contexto a números**. Tom narrativo reduz ansiedade de "não saber interpretar".

---

## Wireframe 3 — **COMMAND PALETTE** (Power user denso, keyboard-first)

**Filosofia:** Tudo é busca e atalho. ⌘K abre command palette. Tela principal é uma tabela densa que serve como hub de ação.

```
┌─────────────────────────────────────────────────────────────────────┐
│  ⌘K Buscar startup, usuário, saque…           Updated 12s ago ●     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  FILTROS: [Tudo] [Saques] [KYC] [Campanhas] [Users]      [+ Nova]    │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ TIPO     │ ENTIDADE           │ VALOR    │ STATUS   │ AÇÃO    ││
│  ├─────────────────────────────────────────────────────────────────┤│
│  │ Saque    │ Acme Tech          │ R$ 5.000 │ 7d fila  │ ✓ ✗    ││
│  │ Saque    │ Beta Inc           │ R$ 12.000│ 3d fila  │ ✓ ✗    ││
│  │ Saque    │ Gamma Labs         │ R$ 2.500 │ 1d fila  │ ✓ ✗    ││
│  │ KYC      │ João Silva         │   —      │ 24h fila │ →      ││
│  │ KYC      │ Maria Santos       │   —      │ 18h fila │ →      ││
│  │ Camp.    │ Acme Seed Round    │ R$ 850k  │ 73%      │ →      ││
│  │ Camp.    │ Beta Series A     │ R$ 1.2M  │ 45%      │ →      ││
│  │ User     │ carlos@…           │   —      │ Active   │ →      ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  7 itens pendentes · 1 crítico (7d) · 5 KYC · 2 campanhas ativas    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Características
- **Command palette sticky** no topo (⌘K) com busca fuzzy
- **Filtros horizontais** (chips) — toggles que combinam (Tudo + Saques = só saques)
- **Tabela densa**: 7 colunas, 1 linha por item de ação
- **Inline action**: ✓ ✗ ou → direto na linha, sem modal
- **Status footer**: 1 linha com totais agregados

### Vantagens
- ✅ **Mais eficiente por ação**: admin processa 10 saques em 30s (vs 2 min na tabela paginada atual)
- ✅ Keyboard-first: 80% das ações ficam a 2-3 keystrokes
- ✅ Visão unificada: tudo pendente numa tela — não pula entre /admin/kyc, /admin/startups, etc

### Desvantagens
- ⚠️ Não mostra "estado da plataforma" (KPIs, charts) — admin que entra para olhar, não para agir, não gosta
- ⚠️ Não escalável: 100 saques pendentes = 100 linhas = scroll infinito
- ⚠️ Requer implementação de command palette + keyboard shortcuts (custo de dev)

### Mobile
Tabela vira cards empilhados. Command palette vira bottom sheet. Actions inline viram swipe-to-approve.

### Persona
**Admin power user** que processa 50+ itens/dia. Conhece a plataforma. Quer velocidade, não navegação.

---

## Wireframe 4 — **ACTIVITY STREAM** (Event-driven feed)

**Filosofia:** O dashboard conta a história do que aconteceu. Eventos humanos primeiro, métricas depois.

```
┌─────────────────────────────────────────────────────────────────────┐
│  iSelfToken · Platform Feed                  Hoje · 8 set 2026      │
├──────────────────────────────┬──────────────────────────────────────┤
│                              │  ┌──────────────────────────────┐ │
│  ÚLTIMAS 24 HORAS            │  │ GMV (24h)                    │ │
│                              │  │ R$ 47.300  ↑ 12%            │ │
│  ⏱ há 2 min                  │  └──────────────────────────────┘ │
│  João Silva investiu         │  ┌──────────────────────────────┐ │
│  R$ 5.000 em Acme Tech       │  │ Usuários ativos               │ │
│                              │  │ 142  ↑ 3%                    │ │
│  ⏱ há 14 min                 │  └──────────────────────────────┘ │
│  Beta Inc solicitou saque    │  ┌──────────────────────────────┐ │
│  de R$ 12.000                │  │ Campanhas abertas             │ │
│                              │  │ 8                            │ │
│  ⏱ há 22 min                 │  └──────────────────────────────┘ │
│  ✓ KYC aprovado: Maria S.    │                                      │
│                              │  ⚠ ITENS QUE PRECISAM DE VOCÊ      │
│  ⏱ há 1h                     │  ─────────────────────────────     │
│  Nova startup cadastrada:     │                                      │
│  Delta Health                │  • 3 saques > 5 dias    [Revisar]  │
│                              │  • 5 KYC > 24h          [Revisar]  │
│  ⏱ há 2h                     │  • 1 campanha stalled    [Ver]      │
│  Acme Tech atingiu 75%       │                                      │
│  da meta de captação          │                                      │
│                              │                                      │
│  [Carregar mais ↓]            │                                      │
└──────────────────────────────┴──────────────────────────────────────┘
```

### Características
- **Feed cronológico** (estilo Twitter/GitHub) na coluna principal — eventos com timestamp relativo
- **KPIs fixos na sidebar** direita: 3 números essenciais, sempre visíveis enquanto scrolla
- **CTA "Itens que precisam de você"**: prioriza o que requer ação humana, com prazo humanizado
- **Semantic events**: "investiu", "solicitou saque", "KYC aprovado" — ações humanas, não técnicas

### Vantagens
- ✅ Conta história da plataforma (audit trail natural)
- ✅ KPIs sempre visíveis (sticky sidebar)
- ✅ Diferencia signal de action: feed é "o que aconteceu", CTA é "o que precisa de você"
- ✅ Mobile-first natural (1 coluna = feed)

### Desvantagens
- ⚠️ Pode virar info-overload se muitos eventos (precisa paginação/filtros)
- ⚠️ Sem gráficos de tendência (não responde "estamos crescendo?")
- ⚠️ Requer classificação de eventos (investment vs saque vs KYC)

### Mobile
1 coluna. Sidebar KPIs vira sticky bar no topo. Feed empilha naturalmente.

### Persona
**Admin operacional** que gosta de contexto histórico. Antes de agir, quer saber "o que aconteceu antes desse pedido?".

---

## Wireframe 5 — **TILE MOSAIC** (Bento hierárquico)

**Filosofia:** Scanability máximo. Hierarquia clara: 1 hero, 3 secondary, 4 quick-glance. Como painel de carro.

```
┌─────────────────────────────────────────────────────────────────────┐
│  iSelfToken · Dashboard           System Optimal · ●                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────┐  ┌──────────────┬──────────────┐  │
│  │                             │  │             │              │  │
│  │   GMV HOJE                  │  │ USUÁRIOS    │ STARTUPS     │  │
│  │   R$ 47.300                 │  │    142      │     25       │  │
│  │                             │  │  ↑ 3 hoje   │  — sem nov   │  │
│  │   ↑ 12% vs ontem            │  │             │              │  │
│  │                             │  │  [sparkline]│  [sparkline] │  │
│  │   ▁▂▃▄▅▆▇  última hora     │  ├──────────────┼──────────────┤  │
│  │                             │  │ CAMPANHAS   │ TOKENS       │  │
│  │                             │  │     8       │  32.500      │  │
│  │                             │  │  2 stalled  │  +800 hoje   │  │
│  │                             │  │             │              │  │
│  └─────────────────────────────┘  └──────────────┴──────────────┘  │
│                                                                     │
│  ┌──────────────────────┬──────────────────────┬──────────────────┐ │
│  │ SAQUES PENDENTES  3  │ CAMPANHAS ATIVAS  8  │ KYC EM FILA   5  │ │
│  │ R$ 19.500 total      │ 73% média captada   │ 24h mais antigo  │ │
│  │ [Revisar →]          │ [Ver →]             │ [Revisar →]      │ │
│  └──────────────────────┴──────────────────────┴──────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Características
- **1 hero tile** (60% largura): GMV do dia + delta + sparkline de última hora
- **4 secondary tiles** (2x2): 4 KPIs com sparklines individuais
- **3 action tiles** (rodapé): filas com 1 número + 1 ação
- **Hierarquia visual clara**: olho vai naturalmente do hero (60%) → secundários (20%) → ações (10%)
- **Tamanhos diferentes** (não é card grid uniforme) — anti-pattern SaaS

### Vantagens
- ✅ **Scanability máximo**: 1 hero + 4 visíveis = 5 KPIs em 5 segundos
- ✅ Hierarquia clara (sem ambiguity sobre o que importa)
- ✅ Ações visíveis (não escondem atrás de clique)
- ✅ Mobile-friendly natural (tiles empilham em 1 coluna)

### Desvantagens
- ⚠️ Não mostra séries temporais longas (só sparklines)
- ⚠️ Cada tile tem pouco espaço (precisa copy ultra-curto)
- ⚠️ Pode parecer "dashboard genérico" se não tiver personalidade visual forte

### Mobile
Hero → 4 secondary empilhados (2 colunas em tablet, 1 em phone) → 3 ações full-width.

### Persona
**Admin que entra 1x/dia para "ver se está tudo ok"**. Quer panorama geral, não detalhamento.

---

## Tabela Comparativa

| Critério | 1. War Room | 2. Briefing | 3. Command | 4. Activity | 5. Mosaic |
|----------|:-----------:|:----------:|:----------:|:-----------:|:---------:|
| Scanability (5s) | ★★★★ | ★★★ | ★★ | ★★★ | ★★★★★ |
| Ações inline | ★★★ | ★★ | ★★★★★ | ★★★ | ★★★★ |
| Tendências históricas | ★★ | ★★★★ | ★ | ★★ | ★★ |
| Adequado a mobile | ★★ | ★★★ | ★★ | ★★★★ | ★★★★★ |
| Conta história | ★★ | ★★★★★ | ★ | ★★★★★ | ★★ |
| Custo de implementação | Alto | Médio | Alto | Médio | Médio |
| Diferencia do template SaaS | ★★★★ | ★★★★★ | ★★★★ | ★★★★ | ★★★ |
| Curva de aprendizado | Baixa | Baixa | Alta | Baixa | Baixa |

---

## Recomendação

**Wireframe 5 (Tile Mosaic)** é a evolução natural da página atual — mantém a mesma estrutura de KPI grid, mas adiciona hierarquia clara, ações visíveis e layout responsivo honesto. É o caminho de menor risco.

**Wireframe 4 (Activity Stream)** é a melhor escolha se o admin do iSelfToken é operacional (processa muitos itens/dia) e o produto prioriza contexto histórico. É mais disruptivo, mas tem mais valor agregado ao longo do tempo.

**Wireframe 1 (War Room)** vale considerar se a plataforma quer transmitir sensação "premium / fintech séria" (similar a Bloomberg Terminal). Exigiria refactor profundo.

**Wireframes 2 e 3** são nichos: editorial para branding-focused, command para power user. Não recomendo como padrão mas podem coexistir como views alternativas.

### Híbrido viável
**Wireframe 5 (Mosaic) como base + elementos do Wireframe 1 (War Room)**:
- Tile hero "Platform Health" com GMV + delta + sparkline live (War Room)
- 4 secondary tiles (Mosaic)
- 3 action tiles (Mosaic, mas com indicador de urgency como War Room)
- Watermark de marca mantido

Isso dá scanability do Mosaic + sensação "live" do War Room sem o custo de waveform real-time.

---

## Próximos passos

1. **Decisão**: aprovar 1 wireframe (ou híbrido) → implementar
2. **Validação**: wireframe aprovado ganha protótipo com dados reais (não lorem)
3. **Teste**: smoke test com admin real do iSelfToken (admin@iselftoken.com)
4. **Refinamento**: ajustes baseados em feedback

Aguardando decisão.