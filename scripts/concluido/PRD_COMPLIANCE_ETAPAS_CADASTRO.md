# PRD — Compliance: Acompanhamento de Etapas de Cadastro e Campanhas

**Data:** 15/08/2026  
**Autor:** Agente IA  
**Status:** Rascunho  
**Prioridade:** Alta  
**Módulo:** Frontend + Backend — Compliance

---

## 1. Contexto e Lacunas Identificadas

O compliance officer hoje tem acesso às páginas de listagem de startups e campanhas, mas falta:

1. **Pipeline visual de etapas** — Não existe stepper mostrando em qual etapa cada startup está
2. **Checklist de documentos CVM** — Falta aba de documentos obrigatórios na revisão da campanha/startup
3. **Histórico de decisões** — Não há log de idas/vindas (revisão → re-submissão → aprovação)
4. **Stubs não implementados** — `/compliance/users` e `/compliance/seals` estão vazios
5. **Solicitação de documentos extras** — Compliance não consegue pedir documentos adicionais ao founder

---

## 2. Etapas do Ciclo de Vida da Startup

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. RESERVA     │ 2. DADOS       │ 3. DOCUMENTOS │ 4. CURADORIA   │
│ Pagamento taxa │ Identidade +   │ Upload CVM    │ Compliance     │
│ R$ (config)    │ Pitch + Time   │ obrigatórios  │ analisa e      │
│                │ + Bancário     │               │ decide         │
├────────────────┼────────────────┼───────────────┼────────────────┤
│ PENDING_       │ RESERVATION_   │ RESERVATION_  │ PENDING_       │
│ RESERVATION_   │ PAID           │ PAID          │ CURATOR_       │
│ PAYMENT        │                │               │ REVIEW         │
├────────────────┼────────────────┼───────────────┼────────────────┤
│ → Paga taxa    │ → Preenche     │ → Faz upload  │ → APPROVED     │
│   de reserva   │   formulários  │   dos PDFs    │   ou REJECTED  │
└────────────────┴────────────────┴───────────────┴────────────────┘
                                                           │
                                          ┌────────────────┤
                                          ↓                ↓
                                     APPROVED          REJECTED
                                          │                │
                                          ↓                ↓
                                     Campanha         Founder corrige
                                     disponível       e re-submete
```

---

## 3. Melhorias na Página `/compliance/startups/:id`

### 3.1 Stepper de Progresso (novo componente)

Adicionar no topo do detalhe da startup um stepper visual horizontal:

```
┌─────────────────────────────────────────────────────────────────┐
│  ●━━━━━━●━━━━━━●━━━━━━○━━━━━━○                                  │
│  Reserva  Dados   Docs   Curadoria  Aprovação                   │
│    ✓        ✓       ✓      ←atual                               │
└─────────────────────────────────────────────────────────────────┘
```

**Lógica do stepper:**

| Status | Etapa 1 (Reserva) | Etapa 2 (Dados) | Etapa 3 (Docs) | Etapa 4 (Curadoria) | Etapa 5 (Resultado) |
|--------|-------------------|-----------------|----------------|---------------------|---------------------|
| PENDING_RESERVATION_PAYMENT | ○ atual | ○ | ○ | ○ | ○ |
| RESERVATION_PAID | ✓ | ○ atual | ○ | ○ | ○ |
| PENDING_CURATOR_REVIEW | ✓ | ✓ | ✓ | ○ atual | ○ |
| APPROVED | ✓ | ✓ | ✓ | ✓ | ✓ aprovada |
| REJECTED | ✓ | ✓ | ✓ | ✓ | ✗ rejeitada |

### 3.2 Aba de Documentos CVM (nova)

Adicionar uma aba "Documentos" no detalhe da startup que mostra:

| Documento | Obrigatório | Status | Ação |
|-----------|-------------|--------|------|
| MIE (Material Informativo ao Investidor) | Sim | ✓ Enviado / ⏳ Pendente / ❌ Ausente | Download |
| Contrato Social | Sim | ✓/⏳/❌ | Download |
| Cartão CNPJ | Sim | ✓/⏳/❌ | Download |
| Balanço Atual | Sim | ✓/⏳/❌ | Download |
| Declaração de Veracidade | Sim | ✓/⏳/❌ | Download |
| Ata de Eleição | Sim | ✓/⏳/❌ | Download |
| Pitch Deck | Recomendado | ✓/⏳/❌ | Download |
| Projeções Financeiras | Recomendado | ✓/⏳/❌ | Download |

**Backend:** Endpoint `GET /admin/startups/:id/documents` já deve retornar a lista de StartupDocument por startup. Se não existir, criar.

### 3.3 Histórico de Decisões (nova seção)

Seção "Timeline" no detalhe da startup mostrando:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📋 HISTÓRICO                                                    │
│                                                                 │
│ 15/08/2026 14:30 — Carlos Compliance REJEITOU                   │
│ Motivo: "CNPJ divergente do contrato social"                    │
│                                                                 │
│ 16/08/2026 09:15 — João Founder RE-SUBMETEU                     │
│ Alterou: CNPJ (atualizado)                                      │
│                                                                 │
│ 16/08/2026 11:00 — Carlos Compliance APROVOU                    │
│ Observação: "Documentação ok após correção"                     │
└─────────────────────────────────────────────────────────────────┘
```

**Fonte:** `AuditLog` filtrado por entity=startup, entityId=startupId.

---

## 4. Implementar `/compliance/users` (stub → funcional)

### 4.1 Comportamento

Lista paginada de todos os usuários com:
- Filtros: role (USER/ADMIN/FINANCEIRO/COMPLIANCE), status KYC (pendente/aprovado/rejeitado), busca por nome/email
- Colunas: Avatar, Nome, Email, Role, Status KYC, Plano ativo, Data cadastro
- Ação: Clicar leva ao detalhe `/compliance/users/:id` (já funcional)

### 4.2 Backend

Endpoint já existe: `GET /admin/users` (usado pela tela admin). Basta consumir.

---

## 5. Implementar `/compliance/seals` (stub → funcional)

### 5.1 Comportamento

Gestão do catálogo de selos:
- Lista todos os selos com: imagem, nome, slug, categoria, status (ativo/inativo)
- Ações: Ativar/Desativar selo, Editar nome/descrição
- Atribuição manual: Selecionar startup → atribuir selo

### 5.2 Backend

Endpoints necessários (se não existirem):
- `GET /admin/seals` — Lista todos os selos
- `PATCH /admin/seals/:id` — Editar selo
- `POST /admin/seals/:id/assign` — Atribuir a uma startup
- `DELETE /admin/seals/:id/unassign/:startupId` — Remover de startup

---

## 6. Solicitação de Documentos Extras

### 6.1 Fluxo

```
Compliance visualiza detalhe da startup/campanha
     ↓
Clica "Solicitar documento adicional"
     ↓
Preenche: tipo (select ou texto livre), prazo, observação
     ↓
Notificação enviada ao founder (email + in-app)
     ↓
Founder faz upload do documento solicitado
     ↓
Compliance recebe notificação de que foi enviado
```

### 6.2 Backend (novo modelo sugerido)

```prisma
model DocumentRequest {
  id              Int      @id @default(autoincrement())
  startupId       Int
  startup         Startup  @relation(...)
  requestedById   Int      // Compliance user
  requestedBy     User     @relation(...)
  type            String   // Categoria ou texto livre
  description     String   @db.Text
  deadline        DateTime?
  status          DocumentRequestStatus @default(PENDING)
  fulfilledDocId  Int?     // StartupDocument.id quando atendido
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum DocumentRequestStatus {
  PENDING
  FULFILLED
  EXPIRED
  CANCELED
}
```

---

## 7. Critérios de Aceite

- [ ] **AC-01:** Stepper visual no `/compliance/startups/:id` mostrando etapa atual
- [ ] **AC-02:** Aba "Documentos" com checklist CVM (status + download)
- [ ] **AC-03:** Timeline de histórico de decisões (approve/reject/resubmit)
- [ ] **AC-04:** `/compliance/users` funcional com filtros e paginação
- [ ] **AC-05:** `/compliance/seals` funcional com CRUD de selos
- [ ] **AC-06:** Atribuição manual de selo a startup
- [ ] **AC-07:** Solicitação de documento extra com notificação ao founder
- [ ] **AC-08:** Tab "Documentos" na revisão de campanha (complementar ao existente)

---

## 8. Impacto Técnico

| Arquivo | Alteração |
|---------|-----------|
| `compliance-startup-detail.tsx` | Adicionar stepper, aba documentos, timeline |
| `compliance-users.tsx` | Reescrever (stub → funcional) |
| `compliance-seals.tsx` | Reescrever (stub → funcional) |
| `compliance-campaign-detail.tsx` | Adicionar aba "Documentos" |
| Backend (novo) | Endpoint `GET /admin/startups/:id/documents` |
| Backend (novo) | Endpoints CRUD de selos admin |
| Backend (novo) | Model `DocumentRequest` + endpoints |
| Schema Prisma | Novo model `DocumentRequest` (se aprovado) |
