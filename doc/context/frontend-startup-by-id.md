---
Descrição: Página Pública-Privada /startup/:id
---

# Página `/startup/:id`

- uma parte da pagina vai ser publica e exibir as informações da startup
- outra parte ficar bloqueado caso não esteja logado, deixando o conteúdo embaça do não deixando ver o conteúdo, exibindo um modal flutuante independente da posição da rolagem ele ficara exibindo, mas caso a parte publica apareça o modal deve desparecera, na parte privada vão vai ser possível clicar e nem fechar o modal

**inspiração:**
https://eqseed.com/investir/jetbov2025#novidades

## Padrão de css 
[padrão base css](doc/context/05-padroes-e-css.md) se não estiver nessa padrão ele deve utilizar o padrão do shadcn ja estabelecido
[shadcn](https://ui.shadcn.com/) temtar usar os componente ja baixados ne ão tiver baixar os componentes
- caso queira imprimações utilizar o [dribbble](https://dribbble.com/) ou [pinterest](https://br.pinterest.com/) mantendo o padrão ja estabelecido 

## Lógica

**descrição:** Página de detalhes de uma startup, exibindo informações como nome, descrição, investidores, etc.

**funcionalidades:**

- session 1 apresentação da startup
  - vai conter o logo da startup
  - ao lado vai conter o nome da startup
  - abaixo vai conter o subtitulo da startup
- session 2 informações da startup
  - vai conter o objetivo financeiro da startup
  - abaixo vai conter a barra de progresso de investimento
  - abaixo vai conter o valor total de investimento e a porcentagem de investimento
- session 3 informações de equity 1 card
  - vai conter o valor total de equity
  - vai conter a quantidade de tokens restantes
  - vai conter o valor total de equity investido
  - vai conter o o total de investidores
- session 4 informações de equity 2 card
  - vai conter o link de compartilhamento (somente para role afiliado)
  - vai conter o botão comprar token (se na url tiver o token do afiliado ex: /startup/:id?token=token, vai exibir o botão comprar token e linkar a compar com afiliado, se nao tiver o token do afiliado, vai aparecer o botão comprar token, porem se nãi tiver logado redireciona para a pagina de login, se tiver logado redireciona para a pagina de compra de token)
- session 5 pitch de vendas
  - vai conter o pitch de vendas, video do youtube
- session 6 analise sobre a startup
  - vai conter o analise sobre a startup, imagem da tumbai do video
  - ao clicar na imagem abre o modal com o video do youtube

- **sessão bloqueada**
- session 7 informações resumo da startup
  - vai conter o resumo da startup( vai receber um markdown da api e converter para html)
  