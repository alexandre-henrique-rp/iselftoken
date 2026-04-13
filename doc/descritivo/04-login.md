# page login

## **rota:** /login
## **path:** /app/routes/page/login/index.tsx
## **component únicos:** /app/routes/page/login/components/index.tsx
## **api route:** ApiPage.LoginPublic()
## **Type:** public

## **funcionalidade:**
- layout split-screen (2 colunas no desktop)
  - **coluna esquerda (formulário)**
    - logo "iSelfToken" no topo esquerdo
    - título central: "Bem-vindo de volta"
    - campo **E-mail** com placeholder
    - campo **Senha** com placeholder
    - link **Esqueceu a senha?**
    - botão principal **Entrar**
    - divisor com texto "Não tem conta?"
    - botão secundário **Crie sua conta**
    - texto de termos com link **Termos de Uso**
  - **coluna direita (imagem hero)**
    - imagem de fundo em tela cheia
    - overlay escuro com texto central
    - título: "Invista em startups promissoras via tokenização de equity"
    - subtítulo explicando a proposta da plataforma
    - badges inferiores: "Plataforma regulada" e "Investimento acessível"

## **componentes utilizados (não shadcn/ui):**
- `AuthLayoutPremium`
- `LoginForm`
- `ButtonPremium`
- `InputPremium`

## **componente shadcn:**
- login: `npx shadcn@latest add login-02`(use ele como base de tela)
