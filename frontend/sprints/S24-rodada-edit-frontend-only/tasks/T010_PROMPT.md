---
id: "T010"
status: "pending"
type: "frontend"
sprint: "S24-rodada-edit-frontend-only"
milestone: "M4"
owner: "frontend"
estimatedEffort: 0.5
complexity: "simple"
dependencies: ["T005", "T006", "T007", "T008", "T009"]
---

# Task T010 — Verificação visual + screenshot

## Contexto

Smoke test manual para validar que a feature funciona end-to-end após todas as outras tasks. Requer `npm run dev` rodando, navegação real no browser, e captura de screenshot via DevTools/Chrome.

## Descrição

### Passo 1 — Iniciar dev server

```bash
cd frontend
npm run dev
```

Aguardar o output `Local: http://localhost:5173/` (ou similar).

### Passo 2 — Login + navegação

1. Login em `/login` com credenciais de founder (sugestão: usar `createFounderUser()` de `test/e2e/flows/setup/test-helpers.ts` se disponível, OU criar manualmente via DB).
2. Navegar até `/founder/startups/:id/edit` (substituir `:id` por um ID real de startup do founder).
3. Verificar que o nav lateral mostra **5 itens**: Identidade | **Rodada** (entre Identidade e Time, ícone Coins) | Time | Documentos | Bancário.

### Passo 3 — Smoke test visual da aba Rodada

1. Clicar em "Rodada" no nav.
2. Verificar que carrega `/founder/startups/:id/edit/rodada` (sem 404).
3. Verificar que a tab **Captação** é default e mostra: `ReservationStatusCard` (status PAGO verde), `RoundTerms`, `RoundSchedule`, `TokenEconomicsCalculator`.
4. Clicar em "Distribuição" no segmented control.
5. Verificar que mostra **7 inputs nomeados** (Fundador, Desenvolvimento, Comercial, Marketing, Nuvem, Jurídico, Reserva de Caixa) com sufixo `%`.
6. Verificar que a pill no header está **verde** mostrando "100.00/100".
7. Alterar um input (ex: Fundador de 30 para 50) → pill vira **vermelho** mostrando "100.00/100 ⚠️" (ou valor similar).
8. Voltar para 30 → pill volta a verde.

### Passo 4 — Testar action bar global

1. Voltar para tab Captação.
2. Alterar qualquer campo (ex: meta de captação).
3. Clicar em **Salvar Alterações** no action bar (rodapé da página).
4. Verificar toast "**Alterações salvas (mock)**" aparece no canto superior direito.
5. Verificar que NÃO há requests ao backend (DevTools Network tab).

### Passo 5 — Capturar screenshot

1. Posicionar na rota `/founder/startups/:id/edit/rodada`, tab **Distribuição** ativa, soma=100 (pill verde).
2. Capturar screenshot full-page via DevTools (Ctrl+Shift+P → "Capture full size screenshot") OU usar Playwright MCP:
   ```bash
   # Alternativa Playwright (se instalado):
   npx playwright screenshot http://localhost:5173/founder/startups/:id/edit/rodada doc/screenshots/rodada-edit.png --full-page
   ```
3. Salvar em `doc/screenshots/rodada-edit.png`.

### Passo 6 — Verificar console

1. Abrir DevTools Console.
2. Verificar que **NÃO há warnings novos** relacionados a S24 (pode haver warnings pré-existentes de S01/S02 que são tolerados).
3. Se houver warning novo (ex: prop não-usado, key missing), reportar e reabrir a task correspondente.

## Escopo Cirúrgico

### Paths allowlist (CRIAÇÃO)

- `doc/screenshots/rodada-edit.png` (novo — artefato de validação)

### Paths proibidos

- Qualquer código de aplicação (NÃO modificar — apenas verificar)
- `app/**` (outras tasks)

## Acceptance Criteria

- [ ] Screenshot capturado em `doc/screenshots/rodada-edit.png` (full-page, tab Distribuição ativa, pill verde)
- [ ] Nav lateral mostra 5 itens com Rodada entre Identidade e Time (verificado visualmente)
- [ ] Tab Captação é default e mostra 4 seções (verificado)
- [ ] Tab Distribuição mostra 7 inputs nomeados + pill verde "100/100" (verificado)
- [ ] Alterar input quebra soma → pill vira vermelho (verificado)
- [ ] Toast "Alterações salvas (mock)" aparece ao clicar Salvar (verificado)
- [ ] Sem requests ao backend no Network tab (verificado — é mock puro)
- [ ] Sem warnings novos no Console (verificado)

## Ponteiros de Contexto

- **Plano de teste detalhado:** `sprints/PLANO_ACAO_EDICAO_RODADA_FRONTEND_ONLY.md §6 T10` + §7 (Critérios de aceite)
- **AGENTS.md:** `frontend/AGENTS.md` (seção TESTING — E2E Playwright opcional)
- **Playwright:** se preferir automação ao invés de manual, usar `playwright-runner` MCP com `sprintId="S24-rodada-edit-frontend-only"`
- **Reference screenshot:** o plano §5 mostra wireframes ASCII da Tab Captação e Tab Distribuição — comparar com o resultado

## Dependências

- **Bloqueia:** nenhuma (task final de smoke)
- **Bloqueada por:** T005 + T006 + T007 + T008 + T009 (todas as outras)

## Notas de Implementação

- **Manual vs automatizado:** aceito ambos. Manual é mais rápido (0.5h) e suficiente para 1 screenshot. Automação (Playwright) é mais robusta mas adiciona LOC.
- **Screenshot full-page:** captura TODA a página incluindo o aside, ideal para validação visual.
- **Validação de pill:** importante capturar o screenshot com `soma = 100` (pill verde) para demonstrar o happy path. Capturas adicionais (pill vermelho) são opcionais.

## Status Final Esperado

`doc/screenshots/rodada-edit.png` (~50-200 KB) capturado e validado visualmente conforme os 8 critérios de aceite acima. Feature S24 funcional end-to-end em modo mock.