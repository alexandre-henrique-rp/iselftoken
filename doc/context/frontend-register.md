---
Descrição: Página Pública /register
---

# Página `/register`

- Arquivo: `src/app/(public)/register/page.tsx`
- Objetivo: Cadastro público para dois perfis: investidor e startup.
- Modal inicial solicita escolha do tipo e renderiza o formulário correspondente.

## Componentes

- `InvestorForm`: `src/components/register/InvestorForm.tsx`
  - Campos: nome, cpf, telefone, cep, endereco, bairro, cidade, uf, numero, senha, confirmacaoSenha
  - Máscaras: CPF, telefone, CEP via `react-input-mask`
  - Validação: Zod no schema definido em `page.tsx` (resolver no `useForm`)
  - Limpeza: remoção de caracteres não numéricos antes do envio

- `StartupForm`: `src/components/register/StartupForm.tsx`
  - Campos: cnpj, razaoSocial, fantasia, telefone, cep, endereco, bairro, cidade, uf, numero, senha, confirmacaoSenha
  - Máscaras: CNPJ, telefone, CEP
  - Validação: Zod no schema definido em `page.tsx`
  - Limpeza: remoção de caracteres não numéricos antes do envio

## Lógica Principal

- `page.tsx` define dois schemas Zod (`investorSchema`, `startupSchema`) com `transform + pipe` para normalizar dígitos antes de validar.
- `useForm` é tipado com `InvestorFormInputs` e `StartupFormInputs` exportados pelos componentes.
- Submissão:
  - Investidor: normaliza `cpf`, `telefone`, `cep` e faz `router.push("/login")` (placeholder para integração futura).
  - Startup: normaliza `cnpj`, `telefone`, `cep` e faz `router.push("/login")`.

## Decisões de Implementação

- Componentização para isolar JSX e regras de cada formulário, evitando erros de parsing e duplicações.
- Máscaras ficam nos componentes; schema e `useForm` ficam na página, mantendo single source of truth.
- Correções de JSX e imports (ex.: `Card`, `CardContent`, `CardHeader`, `CardTitle`).
- Remoção de `any` em render props de `InputMask` usando `React.InputHTMLAttributes<HTMLInputElement>`.

## Testes Recomendados

- Unitários: validações dos schemas Zod (campos obrigatórios, tamanhos, normalização).
- Integração: interação com `react-hook-form` (erros exibidos, submissão com dados limpos).
- E2E (opcional): fluxo completo de escolha no modal e cadastro bem-sucedido.
