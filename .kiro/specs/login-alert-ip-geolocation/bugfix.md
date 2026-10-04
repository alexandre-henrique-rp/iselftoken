# Bugfix Requirements Document

## Introduction

Esta correção trata o alerta de segurança enviado quando ocorre um novo login na conta iSelfToken. Atualmente, o alerta pode identificar o cliente como `::1`, classificar o dispositivo como `node`, omitir a geolocalização, não persistir os dados necessários para auditoria e reconhecimento pelo usuário, usar uma apresentação fora do padrão visual da marca e gerar links incompatíveis com o ambiente em execução. O objetivo é que o usuário receba um alerta confiável, compreensível e acionável, sem coleta ou exposição de dados pessoais além do necessário e com preservação das ações “Sim, fui eu” e “Não fui eu”.

A condição do bug é definida para um evento de novo login `X` quando o alerta produzido contém IP local ou incorreto em vez do IP público verificável, quando o dispositivo fica genérico apesar de existir informação de cliente, quando a geolocalização consentida ou obtida por enriquecimento não é apresentada/persistida, quando os dados não ficam disponíveis para o fluxo de reconhecimento, ou quando o email e seus links não correspondem ao branding e ao ambiente válidos.

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type NewLoginAlertEvent
  OUTPUT: boolean

  RETURN X.generatesNewLoginAlert AND (
    X.alert.ipIsLoopbackOrIncorrectForEnvironment
    OR X.alert.deviceIsGenericDespiteAvailableClientInformation
    OR X.consentedLocationIsAvailable AND X.alert.locationIsMissingOrNotPersisted
    OR X.ipLocationIsResolvable AND X.alert.locationIsMissingOrNotPersisted
    OR X.requiredSecurityDataIsNotPersisted
    OR X.emailIsOffBrand
    OR X.linksAreInvalidForEnvironment
  )
END FUNCTION

// Property: Fix Checking
FOR ALL X WHERE isBugCondition(X) DO
  result <- F'(X)
  ASSERT result represents the best trusted client context available,
         persists the minimum required security data,
         respects consent and LGPD limits,
         renders a branded alert,
         and provides valid environment-aware recognition links
END FOR

// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT F(X) = F'(X)
END FOR
```

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN um novo login é realizado através de proxy ou reverse proxy em produção THEN o alerta pode persistir e exibir `::1`, outro endereço local ou um endereço que não representa de forma confiável o cliente real, em vez do IP público identificável com segurança para aquele ambiente.

1.2 WHEN o login ocorre com informações de cliente disponíveis no request/browser THEN o alerta pode exibir um dispositivo genérico como `node`, sem permitir que o usuário reconheça o navegador ou dispositivo utilizado.

1.3 WHEN o usuário fornece geolocalização consentida ou quando a localização pode ser obtida por enriquecimento do IP THEN a localização pode não ser consultada, não ser apresentada no alerta e/ou não ser persistida junto ao evento de login.

1.4 WHEN o endereço recebido é localhost, reservado, inválido, ausente ou não pode ser associado com segurança a uma origem pública THEN o sistema não diferencia adequadamente o contexto de desenvolvimento de uma falha de identificação em produção e pode apresentar o valor local como se fosse a localização real do cliente.

1.5 WHEN um alerta de novo login é gerado THEN os dados necessários para que o usuário reconheça a sessão — origem de rede, data/hora, dispositivo e localização disponível — podem não ser salvos de forma suficiente para auditoria, consulta posterior e execução das ações de confirmação ou recusa.

1.6 WHEN o email de alerta é enviado THEN ele pode usar layout, tipografia, cores, hierarquia, textos e componentes visuais que não seguem o padrão de branding e de comunicação do iSelfToken.

1.7 WHEN o email é gerado em um ambiente local, de homologação ou de produção THEN os links de confirmação e recusa podem apontar para `localhost`, para uma origem incorreta ou para uma URL/token que não pode ser consumida validamente no ambiente do destinatário.

1.8 WHEN o usuário recebe o alerta atual THEN a informação incompleta ou incorreta reduz sua capacidade de distinguir um login legítimo de um acesso indevido, embora o fluxo de “Sim, fui eu” e “Não fui eu” deva continuar existindo.

### Expected Behavior (Correct)

2.1 WHEN um novo login é realizado THEN o sistema SHALL determinar o endereço de cliente com uma cadeia de confiança adequada ao ambiente, considerando a conexão direta e os proxies conhecidos sem aceitar cegamente headers enviados pelo cliente, e SHALL usar o IP público real quando ele puder ser identificado com segurança.

2.2 WHEN o endereço de conexão for loopback, reservado, ausente, inválido ou próprio de desenvolvimento THEN o sistema SHALL classificá-lo explicitamente como contexto local/não público, sem apresentá-lo como IP público real; em produção, SHALL evitar que um valor local seja tratado como identificação válida do cliente.

2.3 WHEN houver informação confiável sobre navegador, sistema operacional, tipo de dispositivo ou user-agent THEN o sistema SHALL normalizar essa informação para uma descrição reconhecível pelo usuário, sem expor dados desnecessários; quando não houver informação suficiente, SHALL indicar a indisponibilidade de forma clara em vez de inventar uma identificação.

2.4 WHEN o usuário tiver consentido com a disponibilização de sua geolocalização para o alerta e houver uma localização válida THEN o sistema SHALL associar essa informação ao evento de login, SHALL apresentá-la de modo compreensível no alerta e SHALL respeitar o escopo do consentimento, sem coletar localização precisa além do necessário.

2.5 WHEN não houver geolocalização consentida, quando o consentimento não se aplicar ou quando a geolocalização do usuário não estiver disponível THEN o sistema SHALL poder enriquecer o evento com uma localização aproximada derivada do IP por fonte confiável, deixando claro que se trata de estimativa; se o enriquecimento não for possível, SHALL indicar “localização indisponível” sem bloquear o login nem fabricar dados.

2.6 WHEN a localização consentida e a localização aproximada por IP estiverem disponíveis ao mesmo tempo THEN o sistema SHALL preservar a origem de cada informação e SHALL aplicar uma precedência explícita que não substitua silenciosamente a localização consentida por uma estimativa menos precisa.

2.7 WHEN o evento de novo login for concluído THEN o sistema SHALL persistir somente os dados necessários para segurança, reconhecimento, auditoria e execução do fluxo, incluindo o contexto de IP resolvido, indicação de desenvolvimento/não público quando aplicável, dispositivo normalizado, localização e sua origem/precisão quando disponível, data/hora do evento, estado de entrega e referências das ações do alerta.

2.8 WHEN dados de IP, localização, user-agent ou dispositivo forem processados THEN o sistema SHALL aplicar minimização e proteção compatíveis com a LGPD, SHALL evitar CPF, email, telefone, coordenadas precisas ou outros dados pessoais em logs livres, SHALL limitar a exposição no email e SHALL manter os registros de auditoria pelo período exigido pelas regras do projeto.

2.9 WHEN o alerta for enviado THEN o sistema SHALL usar o padrão visual e textual oficial do iSelfToken, incluindo identidade de marca, hierarquia, acessibilidade, linguagem PT-BR e mensagem clara para reconhecimento do acesso, sem alterar o destinatário legítimo nem revelar PII desnecessária.

2.10 WHEN o alerta for gerado em qualquer ambiente suportado THEN o sistema SHALL construir links de “Sim, fui eu” e “Não fui eu” a partir da origem válida daquele ambiente, SHALL impedir apontamentos acidentais para localhost em produção, SHALL preservar a proteção do token e SHALL permitir que cada ação chegue ao fluxo correspondente sem depender de URLs inválidas ou fragmentos inseguros.

2.11 WHEN o usuário escolher “Sim, fui eu” THEN o sistema SHALL preservar a confirmação da sessão/login e exibir o resultado esperado ao usuário, de forma idempotente e sem criar uma nova sessão indevida.

2.12 WHEN o usuário escolher “Não fui eu” THEN o sistema SHALL preservar a recusa/dismissal da sessão suspeita e as medidas de proteção já previstas pelo fluxo, de forma idempotente, sem expor o token ou dados da sessão a terceiros.

2.13 WHEN a identificação pública, a localização ou o serviço de enriquecimento estiver indisponível THEN o sistema SHALL continuar o fluxo de autenticação sem transformar a indisponibilidade de metadados em falha de login, SHALL registrar apenas o estado mínimo necessário e SHALL informar a limitação no alerta quando isso for relevante para o usuário.

2.14 WHEN a correção for validada THEN testes automatizados SHALL cobrir, no mínimo, resolução segura de IP direto e atrás de proxy, tratamento de localhost/desenvolvimento, normalização de dispositivo, geolocalização consentida, enriquecimento por IP, indisponibilidade de localização, persistência, proteção LGPD, template/branding do email, construção de URLs por ambiente e os fluxos “Sim, fui eu” e “Não fui eu”.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN um login não gerar um novo alerta ou não estiver sujeito ao defeito descrito THEN o sistema SHALL CONTINUE TO autenticar o usuário conforme o fluxo vigente, incluindo cookies HTTP-only, sessão e etapas de segurança já existentes.

3.2 WHEN o cliente acessar diretamente o backend sem proxy confiável e o endereço de conexão for público e válido THEN o sistema SHALL CONTINUE TO identificar e utilizar esse endereço sem substituí-lo por um valor local ou por uma estimativa de geolocalização indevida.

3.3 WHEN a aplicação estiver em desenvolvimento ou testes e a origem for loopback THEN o sistema SHALL CONTINUE TO funcionar com `localhost`/`::1` como contexto técnico local claramente distinguido, sem exigir que um IP público fictício seja produzido.

3.4 WHEN não houver consentimento de geolocalização THEN o sistema SHALL CONTINUE TO não coletar ou apresentar localização precisa como se tivesse sido autorizada; qualquer localização aproximada derivada do IP SHALL CONTINUE TO ser tratada como estimativa e opcional.

3.5 WHEN não houver IP público ou fonte de localização disponível THEN o sistema SHALL CONTINUE TO permitir o login e o envio/registro do alerta com campos de localização indisponíveis, sem bloquear a autenticação nem fabricar coordenadas, cidade ou país.

3.6 WHEN o usuário receber um alerta de novo login válido THEN o sistema SHALL CONTINUE TO enviar o alerta ao endereço associado à conta e SHALL CONTINUE TO oferecer as ações “Sim, fui eu” e “Não fui eu”.

3.7 WHEN uma ação de confirmação ou recusa for executada a partir do alerta THEN o sistema SHALL CONTINUE TO aplicar a mesma proteção contra repetição, expiração e uso por terceiros prevista para o fluxo de segurança existente.

3.8 WHEN informações de login forem persistidas ou consultadas para auditoria THEN o sistema SHALL CONTINUE TO impedir acesso por outra conta autenticada e SHALL CONTINUE TO não registrar CPF, email, telefone ou outros dados pessoais em texto livre desnecessário.

3.9 WHEN o provedor de email Amazon SES estiver configurado corretamente THEN o sistema SHALL CONTINUE TO entregar o alerta por esse canal, mantendo o remetente autorizado e a capacidade de rastrear falhas de entrega sem expor dados pessoais em logs.

3.10 WHEN o alerta for renderizado em clientes de email suportados THEN o sistema SHALL CONTINUE TO apresentar uma mensagem legível, responsiva e acessível, agora alinhada ao branding oficial, sem remover as informações essenciais do evento nem as ações de segurança.
