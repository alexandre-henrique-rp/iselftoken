# PRD — Funções Especiais (15-funçoesespeciais)

## 1. Visão Geral
- **Objetivo:** definir funções utilitárias críticas relacionadas a criptografia e planos.
- **Tipo:** private

## 2. Requisitos Funcionais (Ponto a Ponto)
1. **Criptografia de payload de transação**
   - Função recebe payload.
   - Criptografa com JWT.
   - Retorna hash.

2. **validateExistePlan(user)**
   - Recebe dados do usuário.
   - Verifica se existem assinaturas com plano.
   - Retorna `true` ou `false`.

3. **validateFundadorPlan(user)**
   - Verifica assinaturas com plano fundador.
   - Valida se a assinatura está ativa e não expirada.
   - Retorna `true` ou `false`.

## 3. Observações Técnicas
- Usar `jose` para JWT.
- Não expor dados sensíveis no payload.
