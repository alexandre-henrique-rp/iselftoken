# UX Spec: /admin/marketplace (Pinar/Despinear Startups)

**Data:** 22/08/2026  
**Referência:** `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §5.2 RF-13  
**Tarefa:** MKT-05

---

## 1. Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  MARKETPLACE · GERENCIAMENTO                                     │
│  Gerencie os destaques manuais do marketplace.                   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STARTUPS PINADAS ({count}/3)                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ [logo] NeuralForge · AI · Tração                         │    │
│  │ Pinada por: Alex (ADMIN) em 15/08/2026                   │    │
│  │ Motivo: "Parceria estratégica com aceleradora AWS..."    │    │
│  │                                    [ Despinar ]          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ [logo] PaySwift · Fintech · Operação                     │    │
│  │ Pinada por: Renata (COMPLIANCE) em 10/08/2026            │    │
│  │ Motivo: "Early-access concluído com 100% vendido..."     │    │
│  │                                    [ Despinar ]          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ [slot vazio]                                             │    │
│  │             [ + Pinar uma startup ]                      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  BUSCAR STARTUP PARA PINAR                                       │
│  ┌─────────────────────────────────────────────────────┐         │
│  │ 🔍  Digite o nome da startup...                     │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                  │
│  Resultados:                                                     │
│  • CloudPilot · SaaS · score 72       [ Pinar ]                  │
│  • BioGenix · Biotech · score 78      [ Pinar ]                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Modal "Pinar Startup"

```
┌──────────────────────────────────────────────────────┐
│  PINAR STARTUP: {nome}                           [X] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Categoria do destaque:                              │
│  ┌────────────────────────────────────────────┐      │
│  │  ▼ Selecione...                            │      │
│  │    • Parceria com aceleradora              │      │
│  │    • Early-access concluído                │      │
│  │    • Estratégica comercial                 │      │
│  │    • Outra (justificar)                    │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  Justificativa (min. 20 caracteres):                 │
│  ┌────────────────────────────────────────────┐      │
│  │                                            │      │
│  │                                            │      │
│  └────────────────────────────────────────────┘      │
│  {count}/200 caracteres                              │
│                                                      │
│  ⚠️ Máximo 3 startups pinadas simultaneamente.       │
│     Esta ação fica registrada no log de auditoria.   │
│                                                      │
│              [ Cancelar ]    [ Confirmar Pin ]        │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Categorias de Pin

```typescript
type PinCategory =
  | 'parceria-aceleradora'
  | 'early-access'
  | 'estrategica-comercial'
  | 'outra';
```

### Validações

- Categoria: obrigatória (select)
- Justificativa: min 20 chars, max 200 chars (textarea)
- Se já há 3 pinadas: botão "Pinar" desabilitado + tooltip "Máximo atingido. Despine uma para pinar outra."

---

## 3. Modal "Despinar"

```
┌──────────────────────────────────────────────────────┐
│  REMOVER DESTAQUE: {nome}                        [X] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Tem certeza que deseja remover {nome} dos           │
│  destaques manuais do marketplace?                   │
│                                                      │
│  Pinada em: {data} por {autor}                       │
│  Motivo original: "{reason}"                         │
│                                                      │
│  Esta ação fica registrada no log de auditoria.      │
│                                                      │
│              [ Cancelar ]    [ Confirmar Remoção ]    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 4. Componentes

| Componente | Responsabilidade |
|-----------|-----------------|
| `AdminMarketplacePage` | Shell — lista pinadas + busca |
| `PinnedStartupCard` | Card de startup pinada (logo, info, motivo, botão despinar) |
| `PinStartupModal` | Modal com select de categoria + textarea justificativa |
| `UnpinConfirmModal` | Modal de confirmação de remoção |
| `StartupSearchForPin` | Campo de busca com resultados + botão pinar por item |

---

## 5. Estimativa: ~4h
