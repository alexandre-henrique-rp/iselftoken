# SPEC — Cadastro (05-cadastro)

## 1. Objetivo
- Padronizar a implementação da página de cadastro pública.

## 2. Referências
- PRD: `../PRD/05-cadastro.md`
- Descritivo: `../descritivo/05-cadastro.md`
- Style: `../style/05-cadastro.md`
- Exemplo: `../style/05-cadastro.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/cadastro`
- **Path:** `app/routes/public/auth/cadastro/index.tsx`
- **Componentes únicos:** `app/routes/public/auth/cadastro/components/*`

## 4. APIs
- `ApiPage.register()`

## 5. Fluxo Principal
1. Renderizar layout split-screen.
2. Validar campos e regras de senha.
3. Submeter cadastro.
4. Redirecionar após sucesso.

## 6. Estados
- `isLoading`, `passwordScore`, `errors`.

## 7. Validações
- Email válido e lowercase.
- Telefone com máscara DDI/DDD.
- Senha: 12+ chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial.
- Confirmar senha igual.
- Checkboxes obrigatórios.

## 8. Componentes
- `PasswordRequirement`, `CheckboxPremium`.

## 9. Regras de UI
- Base visual: shadcn `login-02`.
- Tema stone e contraste mínimo 4.5:1.

## 10. Acessibilidade
- Labels vinculados aos inputs.
- Foco visível nos botões.

## 11. Exemplo JSX
```jsx
<section className="grid lg:grid-cols-2">
  <RegisterForm onSubmit={handleRegister} />
  <AuthHero />
</section>
```
