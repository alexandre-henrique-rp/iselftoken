# SPEC — Funções Especiais (15-special-functions)

## 1. Objetivo
- Padronizar utilitários de criptografia e validação de planos.

## 2. Referências
- PRD: `../PRD/15-special-functions.md`
- Descritivo: `../descritivo/15-funçoesespeciais.md`
- CSS padrão: `../css_padrão.md`

## 3. Escopo Técnico
- JWT para transações.
- Validações de plano (existência e fundador).

## 4. APIs
- `CryptoService.encrypt()`
- `UserApi.me()`

## 5. Fluxo Principal
1. Receber payload de transação.
2. Assinar e retornar JWT.
3. Validar se usuário possui plano válido.

## 6. Estados
- `hasPlan`, `hasFounderPlan`.

## 7. Validações
- Plano fundador deve estar ativo e não expirado.

## 8. Funções
- `encryptTransactionPayload(payload)`
- `validateExistePlan(user)`
- `validateFundadorPlan(user)`

## 9. Exemplo JSX
```jsx
const token = await encryptTransactionPayload(payload);
const hasPlan = await validateExistePlan(user);
```
