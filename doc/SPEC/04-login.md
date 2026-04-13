# SPEC — Login (04-login)

## 1. Objetivo
- Padronizar a implementação da página de login pública.

## 2. Referências
- PRD: `../PRD/04-login.md`
- Descritivo: `../descritivo/04-login.md`
- Style: `../style/04-login.md`
- Exemplo: `../style/04-login.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/login`
- **Path:** `app/routes/public/auth/login/index.tsx`
- **Componentes únicos:** `app/routes/public/auth/login/components/*`

## 4. APIs
- `ApiPage.login()`

## 5. Fluxo Principal
1. Renderizar layout split-screen.
2. Submeter credenciais no formulário.
3. Redirecionar conforme estado de autenticação.

## 6. Estados
- `isLoading`, `errorMessage`, `isPasswordVisible`.

## 7. Validações
- Campos obrigatórios: e-mail e senha.

## 8. Componentes
- `AuthLayoutPremium`, `LoginForm`, `ButtonPremium`, `InputPremium`.

## 9. Regras de UI
- Base visual: shadcn `login-02`.
- Tema stone e contraste mínimo 4.5:1.

## 10. Acessibilidade
- Labels vinculados aos inputs.
- Foco visível nos botões.

## 11. Exemplo JSX
```jsx
<section className="grid lg:grid-cols-2">
  <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
  <AuthHero />
</section>
```
