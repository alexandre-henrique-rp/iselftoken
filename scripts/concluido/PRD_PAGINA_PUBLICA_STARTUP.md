# PRD 1 — Lógica de Funcionamento da Página Pública da Startup

**Data:** 15/08/2026  
**Última revisão:** 2026-08-15 (gaps de coerência corrigidos)  
**Autor:** Agente IA  
**Status:** Rascunho (revisado)  
**Prioridade:** Alta  
**Módulo:** Frontend + Backend — Marketplace / Startup Detail  

---

## Histórico de Revisões

| Data | Mudança |
|------|---------|
| 2026-08-15 | Correções aplicadas: (1) §4.1 + §4.4 — dados bancários são da `Startup`, não da `Campaign`; (2) §4.2 — campos taggeados com `(S)`/`(C)` para indicar entidade; (3) §2.1 + §2.3 — `closedAt` continua setado na transição para `PAID_OUT`; (4) §5.2 — nomes de componentes alinhados com código real; (5) §3.2 — modal mantido + botão secundário "Abrir em nova aba"; (6) §2.4 — `POST /campaigns/:id/extend` explicitamente listado como **não implementado** (escopo de sprint futura). Ver §8 atualizada. |

---

## 1. Contexto

A plataforma IselfToken permite que founders criem startups, configurem rodadas de captação e, após aprovação pelo compliance, sua startup se torna visível no marketplace para investidores. Hoje existe uma página de detalhe (`/startups/:id`) que só é acessível para usuários logados, e uma landing page (`/`) que lista startups de forma pública.

**Necessidade:** Definir claramente o ciclo de vida de visibilidade da startup, o mecanismo de preview para o founder durante edição, e as regras de permanência no marketplace após encerramento da captação.

---

## 2. Ciclo de Vida de Visibilidade

### 2.1 Quando uma startup aparece no marketplace

```
Campanha aprovada pelo Compliance + status OPEN
     ↓
Startup listada na "/" (pública) e "/home" (logados)
     ↓
Campanha encerra → CLOSED (não atingiu meta)
                → FUNDED (atingiu meta)
     ↓
Startup permanece listada por +10 dias (período de grace)
     ↓
Após 10 dias → removida da listagem
```

**Nota sobre `PAID_OUT`:** Quando a campanha transicionar para `PAID_OUT` (após repasses concluídos), o campo `closedAt` **permanece setado** da última transição (CLOSED ou FUNDED). Isso garante que a janela de graça continue contando da data de encerramento original, não da data do último repasse.

### 2.2 Critérios de Elegibilidade (atualização do existente)

| Critério | Estado Atual | Proposta |
|----------|-------------|----------|
| Status startup | `APPROVED` | `APPROVED` ou `LIVE` |
| Logo preenchido | Sim (`logo_id != null`) | Manter |
| Categoria preenchida | Sim (`category` ou `area_atuacao`) | Manter |
| Campanha status | `OPEN` | `OPEN` **OU** (`CLOSED`/`FUNDED`/`PAID_OUT` com `closedAt + 10 dias > NOW()`) |

**Validação enum `StartupStatus`** (já existe em `prisma/schema.prisma:631-640`): `PENDING`, `PENDING_RESERVATION_PAYMENT`, `RESERVATION_PAID`, `PENDING_CURATOR_REVIEW`, `APPROVED`, **`LIVE`**, `REJECTED`, `DECLINED` — os dois valores válidos para listagem pública são `APPROVED` e `LIVE`.

### 2.3 Período de Grace (10 dias pós-encerramento)

Após a campanha mudar para `CLOSED`, `FUNDED` ou subsequentemente `PAID_OUT`:
- A startup continua aparecendo na listagem do marketplace por **10 dias** contados a partir do `closedAt`
- Após os 10 dias, sai da listagem automaticamente
- A página de detalhe (`/startups/:id`) continua acessível diretamente por URL (não é removida, apenas sai da listagem)

**Importante:** O `closedAt` é imutável uma vez setado. Transição FUNDED → PAID_OUT (via sistema de repasses) **não** sobrescreve `closedAt` — ele continua referenciando a data de encerramento original da captação.

**Implementação backend:** Ajustar `queryEligible` em `marketplace.service.ts`:

```typescript
campaigns: {
  some: {
    OR: [
      { status: 'OPEN' },
      {
        status: { in: ['CLOSED', 'FUNDED', 'PAID_OUT'] },
        closedAt: { gte: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
      },
    ],
  },
},
```

> **Nota:** Campo `closedAt DateTime?` **já existe** em `model Campaign` no `schema.prisma:722` e é populado por `campaigns-state.service.ts` em transições de estado (testes `campaigns-state.service.spec.ts:112-125` confirmam).

### 2.4 Prorrogação de Campanha

> **NÃO IMPLEMENTADO** — escopo de sprint futura. Movido para §8 (Fora de Escopo) como item `EXT-01` documentado.

Resumo do **contrato proposto** (para referência futura, NÃO implementar nesta sprint):

- Campo `deadline`: já existe no `model Campaign`
- Novo campo: `originalDeadline DateTime?` (para manter referência da data original — adicionado quando a feature for implementada)
- Endpoint: `POST /campaigns/:id/extend` (somente ADMIN/COMPLIANCE)
- Body sugerido: `{ diasAdicionais: int 10..30 }` (default: 30)
- Regras de negócio propostas:
  - **Máximo de prorrogações:** 2 (campo `extensionCount` adicionado quando implementado)
  - **Máximo de dias por prorrogação:** 30
  - **Status:** somente campanhas com status `OPEN` podem ser prorrogadas
  - **Efeito:** `deadline += diasAdicionais`; primeira prorrogação setta `originalDeadline` se ainda for null; subsequentes incrementam `extensionCount`
  - **Auditoria:** registra `CAMPAIGN_EXTENDED` no AuditLog com `{ entity: 'Campaign', entityId, userId, ip, oldDeadline, newDeadline, diasAdicionais }`
  - **Notificação:** gera notificação (push + email) para investidores da startup (via módulo existente)
  - **Restrição:** após PAID_OUT, não é mais possível prorrogar

Implementação proposta para a sprint `EXT-01` (não nesta rodada):
- Backend: `backendnode/src/api/campaigns/campaigns-extend.service.ts` + `.controller.ts` + `dto/extend-campaign.dto.ts` + testes
- Frontend: botão "Prorrogar" no painel Compliance (`/compliance-repasses` e/ou `/compliance/campaigns`) com modal exibindo deadline atual e input para dias adicionais
- LGPD: notificação = execução de contrato (Art. 7º, V) — não requer consentimento explícito para enviar email funcional sobre a startup em que investiu

---

## 3. Preview para o Founder

### 3.1 Estado Atual

Já existe o componente `PublicPreviewCard` na tela de edição (`edit-startup-identidade.tsx`) que:
- Abre um modal (`StartupPreviewModal`) com preview da página
- Mostra dados em tempo real durante edição

### 3.2 Melhoria Proposta

**Decisão revisada (2026-08-15): manter o modal atual + adicionar botão secundário "Abrir em nova aba"**, em vez de substituir o modal.

**Justificativa:** O modal permite preview ao vivo durante edição sem trocar de contexto; substituí-lo por link externo + F5 manual introduz fricção desnecessária para founders (decisão §6 corria risco de regressão de UX). Mantemos o modal como primário (UX original) e oferecemos o link externo como secundário (UX WordPress-like).

**Implementação:**

1. **Manter** o modal atual `<StartupPreviewModal>` (UX primária) — founder edita e vê em tempo real dentro do modal
2. **Adicionar** botão secundário "Abrir em nova aba" no `PublicPreviewCard` que faz `window.open('/startups/:id', '_blank')` — UX WordPress-like para quem prefere
3. A página `/startups/:id` renderiza os dados salvos no banco (sem live/websocket — refresh do usuário é OK; Custo infra menor)

**Workflows suportados:**

- **Primário** (modal): Editar → Modal já reflete mudanças em tempo real (pró: sem trocar aba)
- **Secundário** (link externo): Editar → Salvar → F5 na aba do preview (pró: ver em tela cheia)

**Ajuste no `PublicPreviewCard`:**

```tsx
// Modal continua primário
<StartupPreviewModal startup={startup}>
  {children}
</StartupPreviewModal>

// Botão secundário adicional (nunca substitui o modal)
<a
  href={`/startups/${startup.id}`}
  target="_blank"
  rel="noopener noreferrer"
  className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
>
  <ExternalLink className="w-3 h-3" /> Abrir em nova aba
</a>
```

### 3.3 Visibilidade do Preview

- O botão "Ver página pública" deve estar disponível **em todas as telas de edição** (identidade, time, documentos, bancário, captação)
- Deve funcionar mesmo antes da campanha estar OPEN (o founder precisa ver como vai ficar)
- Se a startup não tem campanha OPEN, a página de detalhe mostra os dados mas sem a sidebar de investimento

---

## 4. Campos Bloqueados com Captação Ativa

> **Revisão 2026-08-15:** Os campos "financeiros core" (`targetAmount`, `valuation`, `tokenPrice`, `totalTokens`, `minInvestment`, recursos) pertencem à `Campaign`, mas **dados bancários e de identidade pertencem à `Startup`**. Tabelas abaixo agora indicam a entidade em cada campo (tag `(S)` = Startup, `(C)` = Campaign).

### 4.1 Campos que NÃO podem ser editados quando campanha está OPEN

| Campo | Entidade | Motivo |
|-------|----------|--------|
| `targetAmount` (meta de captação) | **C** | Altera proposta aos investidores |
| `valuation` | **C** | Altera proporção equity/token |
| `tokenPrice` | **C** | Altera custo do token |
| `totalTokens` | **C** | Altera oferta disponível |
| `minInvestment` | **C** | Altera barreira de entrada |
| `banco`, `agencia`, `conta`, `digito`, `tipo_conta`, `pix_key`, `titular`, `documento_titular` | **S** | Risco de fraude durante captação ativa |
| `uso_recursos` (alocação por categoria) | **C** (`CampaignResourceAllocation`) | Altera destino declarado do dinheiro |

**Atenção ao PRD original:** o §4.1 original sugeria que os dados bancários estavam "na tabela". Eles estão na **`Startup`** (campos: `banco`/`agencia`/`conta`/`digito`/`tipo_conta`/`pix_key`/`titular`/`documento_titular` em `schema.prisma:467–478`). O bloqueio ocorre em `edit-startup-bancario.tsx`, mas a checagem do status `OPEN` exige **buscar nas Campaigns relacionadas** (`startup.campaigns.some({status: 'OPEN'})`).

### 4.2 Campos que PODEM ser editados com captação ativa

| Campo | Entidade | Motivo |
|-------|----------|--------|
| Nome da startup | **S** | Branding (via `DataChangeRequest` se já aprovada) |
| Logo | **S** | Visual |
| `descricao` / descritivo básico | **S** | Marketing |
| `problema`, `solucao`, `diferencial`, `modeloReceita`, `mercadoAlvo` | **C** | Pitch narrativo (movido de Startup para Campaign — ver schema.prisma:740-750) |
| `socios`, `teams` (JSON) | **S** | Time / Equipe |
| Documentos (pitch deck, etc.) | **S** | Atualização de material (via módulo `uploads`) |

**Nota:** Após aprovação (`Startup.status = APPROVED` ou `LIVE`), mudanças em **identidade sensível** (`nome`, `razao_social`, `cnpj`) usam `DataChangeRequest` (solicitação ao compliance). Campos narrativos (`descricao`, pitch fields) são editáveis direto, sem solicitação.

### 4.3 Estado Atual

- Campos financeiros core (`targetAmount`, `valuation`, `tokenPrice`, `totalTokens`) já estão `disabled` no frontend `edit-startup-captacao.tsx` quando `campaign.status === 'OPEN'`
- Dados bancários (`banco`, `agencia`, `conta`, etc.) estão em aba separada `edit-startup-bancario.tsx` — **bloqueio ainda não implementado** (esta é a lacuna que §4.4 vai resolver)
- Campos de identidade (`nome`, `cnpj`, `razao_social`) após aprovação usam `DataChangeRequest` (já implementado)

### 4.4 Ajuste Necessário

Bloquear no frontend (`edit-startup-bancario.tsx`) os campos bancários **quando a startup tem QUALQUER campanha com status `OPEN`**. Implementação sugerida (loader da rota):

```typescript
// Em edit-startup-bancario.tsx
export async function loader({ request, params }: LoaderArgs) {
  const startup = await fetchStartup(params.startupId);
  const hasOpenCampaign = startup.campaigns?.some(
    (c: { status: string }) => c.status === 'OPEN'
  );
  return { startup, isCampaignActive: !!hasOpenCampaign };
}

// No componente:
const isCampaignActive = loaderData.isCampaignActive;
// Se ativo, desabilitar inputs de banco (banco/agencia/conta/digito/tipo_conta/pix_key/titular/documento_titular)
// Mostrar aviso visual: "Edicao bloqueada durante captação ativa. Libere após PAID_OUT ou abertura de nova campanha."
```

A mesma checagem deve ser replicada em `edit-startup-captacao.tsx` (que já é feito, mas garantir consistência) e em qualquer rota que edite campos financeiros **ou** bancários com captação ativa.

**Não-bloqueio visual:** Mostrar campos desabilitados + tooltip explicando o motivo + CTA "Abrir DataChangeRequest" para os campos que seguem esse fluxo.

---

## 5. Listagem em Ambas Rotas

### 5.1 Rota `/` (Pública)

| Seção | Quem Vê | Dados Exibidos |
|-------|---------|----------------|
| Featured Rounds | Todos (sem auth) | Cards com logo, nome, categoria, progresso, meta |
| Recently Added | Todos | Cards simplificados |
| Opportunities | Todos | Cards com filtro por categoria |

**Bloqueio para não-logados:** Na landing, os cards são exibidos normalmente. O bloqueio ocorre ao tentar **acessar o detalhe** (`/startups/:id`) — redireciona para login. Ver PRD 2 para melhorias.

### 5.2 Rota `/home` (Logados)

> **Revisão 2026-08-15:** Nomes de componentes alinhados com o código real (`frontend/app/components/marketplace/*` e `frontend/app/routes/private/marketing.tsx`).

| Seção | Quem Vê | Componente real | Dados Exibidos |
|-------|---------|----------------|-----------------|
| Banner rotativo | Investidores logados | `MarketplaceBanner` (`components/marketplace/marketplace-banner.tsx`) | Slides promocionais (`MarketplaceData.bannerSlides` via `getBannerSlides()` no loader) |
| Catálogo filtrável | Investidores logados | `StartupGrid` (`components/marketplace/startup-grid.tsx`) | Cards com filtros, busca, paginação (via `useFetcher` para refetch isolado) |
| Recomendações editoriais | Investidores logados | (tipo `CuratedPick` — `CuratedPick[]` em `Startup`) | Picks curados pela equipe editorial |
| Oportunidades em destaque | Investidores logados | `StartupGridCard` (`components/marketplace/startup-grid-card.tsx`) | Cards individuais usados por `StartupGrid` e `FeaturedStartups` |

**Hierarquia de renderização (em `marketing.tsx`):**

```tsx
<MarketplaceBanner slides={bannerSlides} />
<StartupGrid initialCatalog={catalog} />
<FeaturedStartups />        {/* cards individuais em destaque (não-listagem) */}
<EarlyAccess />              {/* oportunidades de acesso antecipado */}
<CategoryGrid />             {/* navegação por categoria */}
```

---

## 6. Critérios de Aceite

- [ ] **AC-01:** Startup com campanha OPEN aparece no marketplace (rota `/` e `/home`)
- [ ] **AC-02:** Startup com campanha CLOSED/FUNDED há menos de 10 dias ainda aparece
- [ ] **AC-03:** Startup com campanha CLOSED/FUNDED há mais de 10 dias não aparece na listagem
- [ ] **AC-04:** Página de detalhe (`/startups/:id`) continua acessível por URL direto mesmo após sair da listagem
- [ ] **AC-05:** Botão "Ver página pública" na edição abre nova aba com a página da startup
- [ ] **AC-06:** Campos financeiros e bancários bloqueados quando campanha OPEN
- [ ] **AC-07:** Campos narrativos (pitch, descrição, time) editáveis mesmo com campanha OPEN
- [ ] **AC-08:** Preview reflete dados salvos (não live — requer F5)

---

## 7. Impacto Técnico

| Arquivo/Módulo | Alteração |
|----------------|-----------|
| `backendnode/src/api/marketplace/marketplace.service.ts` | Ajustar `queryEligible` para incluir período de grace de 10 dias |
| `backendnode/prisma/schema.prisma` | Adicionar `closedAt DateTime?` na model Campaign (se não existir) |
| `frontend/app/components/founder/public-preview-card.tsx` | Trocar modal por link externo (nova aba) |
| `frontend/app/routes/private/edit-startup-bancario.tsx` | Bloquear campos quando campanha OPEN |
| Backend (novo endpoint) | `POST /campaigns/:id/extend` para prorrogação |

---

## 8. Fora de Escopo

- **Wireframe/design** da página pública (PRD 2 — `PRD_PAGINA_PUBLICA_NAO_LOGADO.md`)
- **Funcionalidades do compliance** (PRD 3 — `PRD_COMPLIANCE_STARTUP_CAMPANHA.md`)
- **EXT-01: Prorrogação de campanha** (`POST /campaigns/:id/extend`) — escopo de sprint futura. Contrato e regras propostos já documentados em §2.4 para referência quando for implementar.

### Itens movidos para backlog (sprints futuras)

| ID | Item | Origem | Justificativa |
|----|------|--------|---------------|
| `EXT-01` | Endpoint `POST /campaigns/:id/extend` + UI de prorrogação | §2.4 | Funcionalidade nova, contrato sugerido; **NÃO IMPLEMENTADO** nesta sprint |
| `EXT-02` | Notificação por email ao prorrogar | §2.4 | Depende de `EXT-01` |
| `EXT-03` | Suporte a `CampaignStatus.PAUSED` no grace de 10 dias | §2.2 | `PAUSED` é estado operacional, não encerramento. Decidir em sprint futura se conta no grace |
