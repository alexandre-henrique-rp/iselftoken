# auth af2

## **rota:** /auth
## **path:** app/routes/public/auth/af2/index.tsx
## **component únicos:** app/routes/public/auth/af2/components/index.tsx
## **api route:** 
## **Type:** public

## **funcionalidade:**
- layout split-screen (2 colunas no desktop)
  - **coluna esquerda (verificação)**
    - logo "iSelfToken" no topo esquerdo
    - título central: "Verificação em dois fatores"
    - texto auxiliar informando envio de código por e-mail
    - indicador de expiração do código (contador regressivo)
    - 6 campos (ou input único segmentado) para digitar o código de 6 dígitos
    - botão principal **Verificar código**
    - botão secundário **Reenviar código**
    - botão secundário **Voltar**
  - **coluna direita (imagem hero)**
    - imagem de fundo em tela cheia
    - overlay escuro com texto central
    - título: "Invista em startups promissoras via tokenização de equity"
    - subtítulo explicando a proposta da plataforma
    - badges inferiores: "Plataforma regulada" e "Investimento acessível"

## **possíveis funcionalidades:**
- auto-focus no próximo campo ao digitar
- permitir colar código completo (preenche todos os campos)
- validar apenas números
- botão **Verificar código** habilita quando 6 dígitos estiverem preenchidos
- contador expira e habilita **Reenviar código**
- ao validar com sucesso, redireciona para `/home`
- ao falhar, exibir mensagem de erro e permitir nova tentativa


## **componente shadcn:**
- login: `npx shadcn@latest add login-02`(use ele como base de tela)
