# SPEC — Autenticação 2FA (06-auth-af2)

## 1. Objetivo
- Padronizar a implementação da verificação 2FA.

## 2. Referências
- PRD: `../PRD/06-auth-af2.md`
- Descritivo: `../descritivo/06-auth_af2.md`
- Style: `../style/06-auth_af2.md`
- Exemplo: `../style/06-auth_af2.jsx`
- CSS padrão: `../css_padrão.md`

## 3. Rotas e Caminhos
- **Rota:** `/auth`
- **Path:** `app/routes/public/auth/af2/index.tsx`
- **Componentes únicos:** `app/routes/public/auth/af2/components/*`

## 4. APIs
- `ApiAuth.verify2FA()`
- `ApiAuth.resendCode()`

## 5. Fluxo Principal
1. Renderizar formulário com 6 dígitos.
2. Capturar código e validar envio.
3. Habilitar reenviar após expiração.
4. Sucesso → redirecionar `/home`.

## 6. Estados
- `otpCode`, `isLoading`, `timer`, `canResend`, `errorMessage`.

## 7. Validações
- Aceitar apenas números.
- Habilitar submit somente com 6 dígitos.

## 8. Componentes
- `OtpInput`, `TimerDisplay`.

## 9. Regras de UI
- Base visual: shadcn `login-02`.
- Inputs com foco visível e borda stone.

## 10. Acessibilidade
- Inputs com aria-label.
- Navegação por teclado sequencial.

## 11. Exemplo JSX
```jsx
<OtpInput
  length={6}
  value={otpCode}
  onChange={setOtpCode}
  onComplete={handleVerify}
/>
```
