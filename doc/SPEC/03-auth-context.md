# SPEC — Contexto de Autenticação (03-auth-context)

## 1. Objetivo
- Padronizar o contexto de autenticação, sessão e armazenamento de tokens.

## 2. Referências
- PRD: `../PRD/03-auth-context.md`
- Descritivo: `../descritivo/03-contexto_de_Auth.md`
- CSS padrão: `../css_padrão.md`

## 3. Escopo Técnico
- Contexto com funções: `login`, `logout`, `isAuthenticated`, `token`, `isAuthAfterLogin`, `user`, `loading`.
- Persistência via cookies e localStorage.

## 4. APIs
- `ApiPage.login()`
- `ApiPage.newToken()`
- `UserApi.me()`

## 5. Fluxo Principal
1. `login` valida cookie `AF2_AUTHENTICATED`.
2. Se ausente, gerar código e redirecionar `/auth`.
3. Se presente, finalizar login e redirecionar `/home`.
4. `token` tenta renovar via `ApiPage.newToken()` quando necessário.

## 6. Estados
- `loading`, `isAuthenticated`, `user`, `token`, `refreshToken`.

## 7. Validações
- Tokens devem respeitar expiração.
- Redirecionar para `/plans` quando usuário `role === 'USER'` sem plano.

## 8. Regras de Armazenamento
- `token`: cookie criptografado (exp 30 min).
- `user`: cookie criptografado (exp do payload).
- `refreshToken`: localStorage.

## 9. Dependências
- `jose` para JWT.
- Cookies/sessions do React Router v7.

## 10. Exemplo JSX
```jsx
const { login, loading } = useAuth();

return (
  <form onSubmit={handleSubmit(login)}>
    <Input name="email" />
    <Input name="password" type="password" />
    <Button disabled={loading}>Entrar</Button>
  </form>
);
```
