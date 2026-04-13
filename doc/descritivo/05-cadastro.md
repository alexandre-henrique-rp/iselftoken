# page cadastro

## **rota:** /cadastro
## **path:** /app/routes/page/cadastro/index.tsx
## **component únicos:** /app/routes/page/cadastro/components/index.tsx
## **api route:** ApiPage.register()
## **Type:** public

## **funcionalidade:**
- layout split-screen (2 colunas no desktop)
  - **coluna esquerda (formulário)**
    - logo "iSelfToken" no topo esquerdo
    - título central: "Criar conta"
    - campo **Nome completo**
    - campo **E-mail**
    - campo **Telefone**
    - campo **Senha** com regra mínima (ex: 12 caracteres)
    - indicador de força de senha
    - campo **Confirmar senha**
    - checkbox **Termos de Uso** com link
    - checkbox **Política de Privacidade** com link
    - botão principal **Criar conta**
    - link inferior: "Já tem conta? Entrar"
  - **coluna direita (imagem hero)**
    - imagem de fundo em tela cheia
    - overlay escuro com texto central
    - título: "Invista em startups promissoras via tokenização de equity"
    - subtítulo explicando a proposta da plataforma
    - badges inferiores: "Plataforma regulada" e "Investimento acessível"
- funções:
  - a senha tem que ser igual a confirmar senha
  - a senha tem que ter pelo menos 12 caracteres
  - a senha tem que ter pelo menos 1 letra maiúscula
  - a senha tem que ter pelo menos 1 letra minúscula
  - a senha tem que ter pelo menos 1 número
  - a senha tem que ter pelo menos 1 caractere especial
  - o email tem que ser válido
  - o telefone tem que ser válido
  - o telefone tem que conter o ddi ddd e o telefone ex 55 11 9 9999-999
  - o telefone tem que conter a mascara de telefone (ex: 55 11 9999-9999 ou 55 11 9 9999-9999)
  - o email tem ser lowercase


## **componente shadcn:**
- login: `npx shadcn@latest add login-02`(use ele como base de tela)
