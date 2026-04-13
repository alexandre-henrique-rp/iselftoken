# SPEC — Editar Startup (13-update-startup)

## 1. Objetivo
- Padronizar a edição de startups com abas internas.

## 2. Referências
- PRD: `../PRD/13-update-startup.md`
- Descritivo: `../descritivo/13-update_statup.md`
- Style: `../style/13-update_statup.md`
- Exemplo: `../style/13-update_statup.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/dashboard/startups/:id/edit`
- **Path:** `app/routes/private/dashboard/startups/[id]/edit/index.tsx`
- **Componentes únicos:** `app/routes/private/dashboard/startups/[id]/edit/components/*`

## 4. APIs
- `StartupApi.getById()`
- `StartupApi.update()`
- `StartupApi.uploadLogo()`
- `StartupApi.uploadPitchDeck()`
- `StartupApi.addTeamMember()`
- `StartupApi.removeTeamMember()`

## 5. Fluxo Principal
1. Carregar dados da startup.
2. Renderizar tabs (Dados Gerais, Localização, Financeiro, Time, Config).
3. Validar alterações.
4. Salvar alterações.

## 6. Estados
- `activeTab`, `isSaving`, `errors`, `formData`.

## 7. Validações
- Soma de alocação financeira deve ser 100%.
- Campos obrigatórios por aba.

## 8. Componentes
- Tabs internas, cards de formulário, barra de ações.

## 9. Regras de UI
- Barra fixa com **Cancelar** e **Salvar**.
- Bloquear salvar com erro de validação.

## 10. Acessibilidade
- Foco visível nos botões.

## 11. Exemplo JSX
```jsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="general">Dados Gerais</TabsTrigger>
    <TabsTrigger value="finance">Financeiro</TabsTrigger>
  </TabsList>
  <TabsContent value="finance">
    <FinanceForm data={formData.finance} />
  </TabsContent>
</Tabs>
```
