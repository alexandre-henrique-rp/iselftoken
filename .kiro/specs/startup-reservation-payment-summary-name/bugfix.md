# Bugfix Requirements Document

## Introduction

Corrigir a identificação exibida no resumo da tela `/checkout/payment/:id` quando o fundador conclui o fluxo `/founder/startups/new`. Hoje o wizard envia os dados da startup em `payload` para `POST /api/payment/startup-checkout`; o BFF encaminha a requisição ao backend, que cria um `Payment` `PENDING` e um `StartupDraft` na mesma transação, e retorna o identificador do pagamento. A tela de checkout então consulta o pagamento por meio de `GET /api/payment/:id`, mas o contrato normalizado para `PaymentSummary` só contempla o plano de uma assinatura e o investimento, levando a textos fixos de outro produto.

O objetivo é que a reserva mostre a origem correta dos dados: “Reserva de token — <nome fantasia ou nome da startup cadastrada>” e a identificação disponível da startup/rodada, sem expor dados pessoais ou depender de texto genérico para pagamentos originados do cadastro de startup. A correção deve preservar o fluxo de pagamento, a autorização por proprietário e os resumos dos demais propósitos.

Para a validação por condição de bug, C(X) representa um pagamento `TOKEN_RESERVATION` originado do cadastro de startup, em que o checkout precisa identificar o draft, a startup ou a rodada autorizada. A propriedade de correção é que F'(X) exiba a identidade comercial correta ou um estado neutro de indisponibilidade, nunca os textos genéricos do produto. Para qualquer entrada fora de C(X), a propriedade de preservação exige que F(X) e F'(X) mantenham o mesmo contexto de pagamento e os mesmos efeitos observáveis.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN o fundador envia um cadastro válido em `/founder/startups/new` THEN o wizard envia `nomeFantasia` e os demais dados em `payload` para `/api/payment/startup-checkout`, mas a resposta do BFF/backend usada para navegar a `/checkout/payment/:id` contém essencialmente `paymentId`, sem contexto de apresentação da startup.

1.2 WHEN `/checkout/payment/:id` carrega um pagamento cujo propósito é `TOKEN_RESERVATION` THEN o `PaymentSummary` não possui contexto normalizado da reserva, da startup pendente ou da rodada correspondente para o resumo do pedido.

1.3 WHEN o resumo encontra um pagamento de reserva sem `subscription.plan` THEN a interface exibe o nome fixo “Token Nexus AI”, mesmo quando o pagamento está vinculado ao cadastro de outra empresa.

1.4 WHEN o resumo encontra um pagamento de reserva sem `subscription.plan.description` THEN a interface exibe “Acesso à inteligência de mercado”, descrição que não representa a reserva nem a startup cadastrada.

1.5 WHEN o pagamento de reserva já estiver associado a uma campanha/startup existente ou quando o `StartupDraft` já tiver sido processado THEN o contrato atual não garante que o checkout receba a identificação sanitizada da startup e da rodada, podendo ocultar a origem real da cobrança.

### Expected Behavior (Correct)

2.1 WHEN o fundador conclui o fluxo `/founder/startups/new` THEN a correlação entre o `Payment` de propósito `TOKEN_RESERVATION` e a identidade da startup cadastrada SHALL ser preservada desde o `payload` do wizard, passando pelo BFF/API, até o `PaymentSummary` consumido pelo checkout, sem permitir que o cliente escolha ou substitua o proprietário da operação.

2.2 WHEN `/checkout/payment/:id` exibe um `Payment` `TOKEN_RESERVATION` originado de um `StartupDraft` pendente THEN o resumo SHALL exibir exatamente o conceito “Reserva de token — <nome>”, usando primeiro `nomeFantasia` e, somente se ele estiver ausente ou vazio, `razaoSocial` como `<nome>`.

2.3 WHEN a reserva possuir uma startup persistida e/ou uma campanha/rodada identificável THEN o resumo SHALL exibir o nome sanitizado da startup e a identificação da rodada disponível, como o título da campanha; quando a startup ainda estiver apenas como draft, SHALL identificar o cadastro da startup e SHALL omitir a rodada inexistente em vez de inventar uma identificação.

2.4 WHEN o BFF de `GET /api/payment/:id` receber do backend o contexto de uma reserva THEN ele SHALL repassar ou normalizar um contrato de `PaymentSummary` que diferencie explicitamente `purpose`, estado do pagamento e contexto de reserva/startup/rodada, com campos ausentes representados de forma estável como `null` ou equivalente, sem reinterpretar uma reserva como assinatura.

2.5 WHEN o pagamento de reserva vier do fluxo de cadastro de startup e não houver nome elegível no contexto autorizado THEN o checkout SHALL exibir um estado neutro de identificação indisponível e SHALL bloquear o uso dos textos “Token Nexus AI” e “Acesso à inteligência de mercado” como fallback dessa reserva.

2.6 WHEN um pagamento não for originado do cadastro de startup, especialmente uma assinatura com `subscription.plan` válido THEN o checkout SHALL continuar usando o contexto específico desse propósito; um fallback genérico de propósito só poderá ser usado fora do fluxo de cadastro de startup e não poderá atribuir à cobrança uma startup ou rodada que não conste no contrato.

2.7 WHEN o checkout consultar o pagamento por `GET /api/payment/:id` THEN a API SHALL continuar restringindo o resultado ao usuário proprietário ou ao papel administrativo autorizado, SHALL retornar apenas campos necessários à identificação comercial da cobrança e SHALL omitir CPF, email, telefone, CNPJ completo, dados bancários, documentos, payload integral do draft e outros dados pessoais ou sensíveis.

2.8 WHEN os testes validarem a correção THEN SHALL existir cobertura para: (a) cadastro com `nomeFantasia`; (b) cadastro sem `nomeFantasia` usando `razaoSocial`; (c) reserva pendente sem rodada criada; (d) reserva processada com startup/rodada; (e) ausência de identidade sem os dois fallbacks genéricos; (f) assinatura preservando nome/descrição do plano; (g) tentativa de consultar pagamento de outro usuário; e (h) fluxo E2E `/founder/startups/new` → criação do draft/pagamento → `/checkout/payment/:id` mostrando a empresa correta.

2.9 WHEN o pagamento for criado, pago, cancelado, expirado ou tiver seus efeitos de domínio processados THEN a correção SHALL alterar somente a identificação e a apresentação do resumo, SHALL preservar amount, method, purpose, status, expiração, geração/consulta de PIX, cartão, confirmação idempotente e redirecionamentos existentes.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN o pagamento tiver propósito `SUBSCRIPTION` e um plano válido THEN o sistema SHALL CONTINUE TO exibir o nome e a descrição do plano retornados pelo backend, sem substituí-los por dados de startup.

3.2 WHEN o pagamento tiver propósito `INVESTMENT` e uma campanha/startup autorizada THEN o sistema SHALL CONTINUE TO exibir o contexto de investimento permitido, sem exigir a existência de `StartupDraft` e sem usar o texto de reserva de token como descrição.

3.3 WHEN o pagamento não for uma reserva originada do cadastro de startup e não possuir contexto comercial específico THEN o sistema SHALL CONTINUE TO aplicar apenas o fallback genérico de propósito já permitido para esse caso, sem alterar os fluxos de assinatura, investimento ou outros pagamentos.

3.4 WHEN o usuário autenticado consultar um pagamento próprio THEN o sistema SHALL CONTINUE TO propagar a sessão pelo BFF, retornar os mesmos códigos de erro para pagamento ausente/não autorizado e impedir acesso cruzado por alteração do `id` na URL.

3.5 WHEN o usuário finalizar o wizard com dados válidos THEN o sistema SHALL CONTINUE TO enviar o valor calculado da taxa, o método escolhido e o payload validado ao endpoint de checkout, sem gerar identidade, nome de startup ou status de pagamento artificialmente no navegador.

3.6 WHEN a tela for renderizada no servidor e hidratada no cliente THEN o sistema SHALL CONTINUE TO obter o pagamento pelo loader/BFF autenticado e SHALL evitar uma consulta adicional independente apenas para buscar o nome da startup, mantendo a origem do dado no contrato do pagamento.

3.7 WHEN a correção for validada em testes unitários, de integração BFF/API e E2E THEN o sistema SHALL CONTINUE A aprovar os cenários existentes de PIX, cartão, polling de status, confirmação de pagamento e resumos de assinatura que não fazem parte da condição do bug.
