# Login Alert IP Geolocation Bugfix Design

## Overview

Esta correção estabiliza o alerta de segurança enviado após um novo login na iSelfToken. O problema atual não é apenas visual: o contexto de rede pode ser resolvido como `::1`/proxy, o user-agent é exibido como um valor técnico (`node`), a localização consentida e o enriquecimento por IP não possuem contrato único nem persistência própria, o botão “Sim, fui eu” não executa uma confirmação do evento e os links podem cair em `localhost`.

O design mantém o fluxo de autenticação baseado em cookie HTTP-only, sessão Redis, 2FA por email e `AuthGuard`. O alerta continua sendo best-effort e nunca bloqueia o login por falha de metadata, GeoIP, Redis ou SES. A mudança central é separar o evento de login do contexto confiável e persistir um registro mínimo de `LoginAlert`, com ações tokenizadas e idempotentes.

A implementação deverá:

1. resolver o IP somente a partir de `req.ip`/socket após a política `TRUST_PROXY`, nunca a partir de `clientIp` ou de headers crus enviados pelo cliente;
2. classificar explicitamente IP público, privado, loopback, inválido, ausente e ambiente local;
3. reutilizar o `GeoIpService` MaxMind/GeoLite2 self-hosted como fonte aproximada, sem enviar IP a provedor externo;
4. tratar `clientGeo` apenas como localização consentida fornecida pelo navegador, reduzida antes de persistir e sem usá-la para decidir autenticidade do login;
5. normalizar navegador, sistema operacional e tipo de dispositivo para uma descrição reconhecível;
6. persistir o mínimo necessário para auditoria, reconhecimento e execução das ações;
7. renderizar o email pelo sistema de templates versionados, com fallback seguro e branding `#d500f9`/preto;
8. construir URLs a partir de uma origem configurada e validada para o ambiente;
9. oferecer confirmação e recusa públicas, protegidas por token de uso único, sem token em query string ou logs de servidor.

O documento é de design; não altera código, migration ou dependências nesta fase.

## Glossary

- **Bug_Condition (C)**: condição em que um alerta de novo login possui metadata incorreta/incompleta, não é persistido de forma suficiente, é renderizado fora do branding, contém links inválidos ou não executa corretamente uma ação.
- **Property (P)**: comportamento esperado de `F'`, o sistema corrigido, para qualquer entrada em `C`: contexto confiável, metadata minimizada, persistência mínima, email válido e ação segura.
- **Preservation**: qualquer comportamento fora de `C` que deve continuar igual, especialmente autenticação, cookies, 2FA, sessão Redis, login com metadata indisponível e ações existentes de segurança.
- **F**: implementação atual, antes da correção.
- **F'**: implementação após a correção.
- **TrustedClientContext**: objeto produzido no backend a partir de `req.ip`, socket e configuração de proxies confiáveis. É a única fonte de IP para fingerprint, auditoria e alerta.
- **Public IP**: endereço globalmente roteável e válido, depois da normalização IPv4/IPv6 e sem pertencer a faixas reservadas.
- **Local/non-public context**: loopback, privado, link-local, CGNAT, documentação/teste, inválido, ausente ou valor obtido em ambiente local; nunca deve ser apresentado como IP público.
- **ConsentLocation**: posição enviada pelo navegador somente quando o usuário já concedeu permissão. É uma pista fornecida pelo cliente, não prova de origem de rede.
- **IpApproximation**: país/região/cidade aproximados derivados do IP público pelo `GeoIpService`; não representa endereço preciso.
- **LoginAlert**: registro persistido do evento e de sua entrega/ação, identificado por UUID público opaco.
- **Action token**: JWT curto com `purpose`, `userId`, `alertId` e `jti`; transportado no fragmento da URL e consumido pelo backend via POST.
- **DeviceLabel**: descrição normalizada como “Chrome no macOS”, “Safari no iPhone” ou “Dispositivo não identificado”, sem exibir o user-agent cru.
- **Public application origin**: origem absoluta (`https://...` ou `http://localhost:...` em desenvolvimento) usada para links de email, validada por ambiente.
- **SES**: canal AWS SES acessado pelo transporte SMTP existente em `EmailService`.

## Bug Details

### Bug Condition

O alerta é considerado defeituoso quando um evento de novo login é produzido e qualquer parte do contexto, persistência, email ou ação não representa de forma confiável o evento. O alerta atual é iniciado em `AuthService` no caminho de login, chama `LoginAlertService`, consulta `GeoIpService` e envia HTML inline por `EmailService`.

**Formal Specification:**

```text
FUNCTION isBugCondition(X)
  INPUT: X of type NewLoginAlertEvent
  OUTPUT: boolean

  RETURN X.generatesNewLoginAlert AND (
    X.alert.ipIsLoopbackOrIncorrectForEnvironment
    OR X.alert.deviceIsGenericDespiteAvailableClientInformation
    OR (X.consentedLocationIsAvailable AND
        X.alert.locationIsMissingOrNotPersisted)
    OR (X.ipLocationIsResolvable AND
        X.alert.locationIsMissingOrNotPersisted)
    OR X.requiredSecurityDataIsNotPersisted
    OR X.emailIsOffBrand
    OR X.linksAreInvalidForEnvironment
    OR X.confirmActionDoesNotConfirmTheAlert
    OR X.dismissActionIsNotIdempotent
  )
END FUNCTION

FUNCTION expectedBehavior(X)
  INPUT: X of type NewLoginAlertEvent
  OUTPUT: boolean

  RETURN X.fixedAlert.usesTrustedClientContext
         AND X.fixedAlert.classifiesNonPublicIpExplicitly
         AND X.fixedAlert.deviceLabelIsNormalized
         AND X.fixedAlert.locationHasExplicitSourceAndPrecision
         AND X.fixedAlert.persistsMinimumSecurityContext
         AND X.fixedAlert.emailUsesApprovedBrandAndEnvironmentOrigin
         AND X.fixedAlert.actionsAreSingleUseAndIdempotent
         AND X.fixedAlert.neverBlocksAuthenticationForMetadataFailure
END FUNCTION
```

### Current implementation relevant to the bug

- `backendnode/src/main.ts` configura `trust proxy` a partir de `TRUST_PROXY`, com fallback seguro para `loopback`. Contudo, não existe um objeto de contexto que valide/classifique o resultado para cada ambiente.
- `AuthService.extractIpUa()` usa `req.ip`, o que é correto como origem, mas reduz a ausência a `null` e encaminha `unknown`; não diferencia “localhost em desenvolvimento” de “proxy não identificado em produção”. O DTO `LoginAuthDto` ainda descreve `clientIp` como possível preferência, embora o serviço atual não deva confiar nele.
- `frontend/app/hooks/use-login-mutation.ts` consulta `api.ipify.org` e envia `clientIp`. Essa chamada é desnecessária para segurança, cria uma dependência externa e pode induzir a interpretação errada de que o navegador informa o IP confiável.
- `LoginAlertService` usa hash de IP + user-agent em Redis, com TTL/debounce, e consulta `GeoIpService`. A decisão não cria um registro persistido do evento.
- `GeoIpService` já usa MaxMind/GeoLite2 local, cache Redis de 30 dias e retorna `null` para IPs privados/loopback. Ele fornece `country`, `city`, coordenadas aproximadas e ISP, mas o alerta atual não define uma política única de origem, precisão e persistência.
- `AuthService.fireLoginAlert()` grava parte da informação no `AuditLog`, incluindo país e coordenada de `clientGeo` arredondada, mas não persiste o ciclo de vida do alerta, estado da entrega ou referência robusta das ações.
- O disparo atual ocorre logo após a criação da sessão e antes da conclusão do 2FA. O design recomenda que o evento de alerta seja criado após a verificação de 2FA; se o fluxo existente precisar manter o disparo antecipado, ele deve ser tratado como `LOGIN_ATTEMPT` e não como novo login concluído.
- `EmailService.sendNewLoginAlertEmail()` monta HTML inline, exibe user-agent cru, inclui ISP, usa fallback de `FRONTEND_URL` para `http://localhost:5173` e envia “Sim, fui eu” para `/home`, sem token/endpoint de confirmação.
- `DismissSessionController` já valida JWT com `purpose=dismiss_session`, expiração de 15 minutos, `jti` único em Redis, invalida sessões, marca `requirePasswordReset` e limpa devices/debounce. Porém, o estado da ação não é associado a um alerta persistido e uma repetição retorna erro em vez de uma resposta idempotente.
- `AuditLog` possui `userId`, ação, entidade, `entityId`, snapshots JSON, IP e `createdAt`; `AccessLog` possui IP/user-agent e tipo de acesso. Nenhum dos dois representa delivery/action state de um alerta.
- O frontend possui a rota pública `/auth/dismiss-session`, BFF `POST /api/auth/dismiss-session` e transporte de token no fragmento, padrão que deve ser preservado e estendido para confirmação.

### Exemplos

1. **Proxy em produção sem cadeia configurada**: o request chega por Nginx/ALB, `req.ip` é `::1` ou o endereço do proxy e o email mostra esse valor como se fosse o cliente. O resultado correto é classificar `LOCAL_OR_NON_PUBLIC` e, se não houver IP público confiável, exibir “IP público indisponível”, sem fabricar outro IP.
2. **IP privado em desenvolvimento**: login em `localhost` resulta em `127.0.0.1`/`::1`. O alerta deve continuar funcionando, registrar `environment=development`, `ipClassification=LOOPBACK` e não rotular o valor como IP público real.
3. **User-agent disponível**: `Mozilla/5.0 ... Chrome/` hoje pode chegar ao email como string técnica ou `node`. O resultado correto é “Chrome no Windows” ou “Navegador não identificado”, sem user-agent cru.
4. **Geolocalização consentida**: `clientGeo` existe no body, mas hoje só é guardado em um snapshot de auditoria e não aparece no email. O resultado correto é persistir a origem `CONSENTED_CLIENT`, usar uma forma reduzida e exibir apenas região/localização compreensível, sem coordenadas exatas.
5. **GeoIP disponível sem consentimento**: MaxMind resolve país/cidade para o IP público. O resultado correto é `IP_APPROXIMATION`, marcado como estimativa, sem alegar que o usuário autorizou geolocalização precisa.
6. **Nenhuma localização disponível**: DB GeoLite2 ausente, IP local ou Redis indisponível. O login e o envio do alerta continuam; o email mostra “Localização indisponível” e o registro contém `source=UNAVAILABLE`.
7. **Ação positiva atual**: clicar “Sim, fui eu” leva apenas a `/home` e não grava confirmação. O resultado correto é um link de fragmento para uma página pública que envia POST tokenizado e marca o `LoginAlert` como `CONFIRMED`, sem criar nova sessão.
8. **Ação negativa repetida**: clicar duas vezes em “Não fui eu” deve manter o mesmo resultado de segurança, sem executar nova rotação/limpeza e sem revelar dados. A resposta deve ser idempotente para o mesmo token/alerta.
9. **Ambiente inválido**: `FRONTEND_URL` ausente em produção faz o email apontar para localhost. O bootstrap/configuração deve rejeitar origem local em produção ou impedir o envio com URL de ação, registrando falha operacional sem bloquear autenticação.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- Login continua validando email e senha, respeitando lockout, mensagens anti-enumeração e rate limits.
- A autenticação continua usando sessão Redis e cookie `session_id` HTTP-only, `SameSite=Strict`, com 2FA obrigatório e sem token em `localStorage`.
- O alerta continua sendo best-effort: falha de Redis, GeoIP, parser de user-agent, SES ou persistência do metadata não transforma login válido em erro.
- IP público direto, sem proxy confiável, continua sendo usado como origem de rede quando `req.ip` for válido e público.
- Loopback em desenvolvimento continua permitido como contexto técnico local; não será criado IP público falso.
- Ausência de consentimento continua significando ausência de geolocalização precisa. O browser não deve abrir um novo prompt de permissão durante o login.
- A coleta de `clientGeo` permanece opcional, limitada ao consentimento já obtido e nunca substitui `req.ip` nem o lookup GeoIP para controles de segurança.
- “Não fui eu” continua invalidando as sessões ativas, marcando `requirePasswordReset` e limpando devices/debounce/país conhecido.
- O segundo uso do token não pode criar sessão, reativar conta, desfazer reset, revelar o usuário ou repetir efeitos destrutivos.
- Alertas continuam sendo enviados ao email associado à conta, via remetente autorizado no SES, com rastreamento de sucesso/falha sem PII em texto livre.
- A auditoria continua usando IDs opacos, `AuditLog` com retenção mínima de cinco anos conforme as regras do projeto e sem CPF, email, telefone ou coordenadas precisas em mensagem de log.
- Clientes de email suportados continuam recebendo uma mensagem legível, responsiva, acessível e com data/hora, dispositivo, contexto de rede/localização disponível e as duas ações.

**Escopo de não regressão (`¬C(X)`):**

Todos os logins sem novo alerta e todas as entradas que não dependem da metadata defeituosa devem produzir o mesmo resultado observável de `F`, salvo a adição transparente de um registro mínimo de auditoria. Isso inclui mouse/navegação normal no frontend, troca de conta, login sem IP público, falha de provider GeoIP, erro de SES e uso de sessões/cookies já existentes.

### Contratos de dados

O contrato interno do evento deve ser independente do DTO HTTP:

```text
TrustedClientContext {
  address: string | null
  normalizedAddress: string | null
  classification: PUBLIC | LOOPBACK | PRIVATE | RESERVED | INVALID | MISSING
  source: REQUEST_IP | SOCKET_ADDRESS | NONE
  environment: DEVELOPMENT | TEST | HOMOLOGATION | PRODUCTION
  proxyChainTrusted: boolean
}

NormalizedDevice {
  label: string
  browser: string | null
  operatingSystem: string | null
  deviceType: DESKTOP | MOBILE | TABLET | BOT | UNKNOWN
  rawUserAgentHash: string | null
}

ResolvedLocation {
  source: CONSENTED_CLIENT | IP_APPROXIMATION | UNAVAILABLE
  precision: REDUCED_CLIENT | APPROXIMATE_IP | NONE
  countryCode: string | null
  countryName: string | null
  regionOrCity: string | null
  coordinates: { lat: number; lng: number } | null // somente reduzidas, nunca precisas
  accuracyBucketMeters: number | null
  estimated: boolean
}

NewLoginAlertEvent {
  alertId: string
  userId: number
  occurredAt: Date
  trustedClient: TrustedClientContext
  device: NormalizedDevice
  location: ResolvedLocation
  reason: NEW_DEVICE | GEO_ANOMALY | NEW_DEVICE_AND_GEO_ANOMALY
  actionToken: internal-only
}
```

Regras de precedência da localização:

1. `clientGeo` válido, consentido e recente pode ser associado como `CONSENTED_CLIENT`, com coordenadas reduzidas e `estimated=false` apenas no sentido de origem informada pelo usuário; ele não é evidência de autenticidade de rede.
2. Se não houver localização consentida, `GeoIpService.lookup(trustedPublicIp)` pode produzir `IP_APPROXIMATION`, sempre com `estimated=true`.
3. Se ambos existirem, os dois fatos não devem ser sobrescritos silenciosamente: o alerta persiste a origem escolhida para exibição (consentida reduzida), registra a disponibilidade de `IP_APPROXIMATION` apenas quando necessário para anomalia/auditoria e mantém a precedência explícita.
4. Se nenhum existir, `source=UNAVAILABLE`; não há bloqueio.

### Persistência e migration

**Migration é necessária.** O `AuditLog` e o `AccessLog` existentes não possuem estado suficiente para consulta do alerta, rastreamento de entrega, expiração/idempotência das ações e origem/precisão da localização. A alteração deve ser feita em `backendnode/prisma/schema.sqlite.prisma` e em uma migration manual sob `backendnode/prisma/migrations-sqlite/`.

Modelo lógico proposto, sem persistir token bruto ou user-agent bruto:

```text
LoginAlert {
  id: String UUID público
  userId: Int
  eventKey: String UNIQUE
  fingerprintHash: String
  trustedIp: String?
  ipClassification: String
  environment: String
  deviceLabel: String
  deviceType: String
  browser: String?
  operatingSystem: String?
  rawUserAgentHash: String?
  location: Json?
  locationSource: String
  locationPrecision: String
  reason: String
  occurredAt: DateTime
  deliveryStatus: PENDING | SENT | FAILED
  deliveredAt: DateTime?
  deliveryMessageId: String?
  actionStatus: PENDING | CONFIRMED | DISMISSED | EXPIRED
  actionAt: DateTime?
  actionTokenJtiHash: String? UNIQUE
  actionTokenExpiresAt: DateTime?
  createdAt: DateTime
  updatedAt: DateTime
}
```

Índices: `(userId, occurredAt)`, `(userId, actionStatus)`, `eventKey` unique e `actionTokenJtiHash` unique quando preenchido. A relação com `User` usa `onDelete: SetNull` somente se a política do schema permitir manter histórico sem usuário; caso contrário, o alerta deve ser redatado antes de remoção. A decisão deve preservar o requisito de auditoria mínima de cinco anos.

A migration deve:

- criar a tabela e índices sem alterar dados de `User`, `AuditLog`, `AccessLog` ou sessões Redis existentes;
- permitir campos de metadata nulos para registros legados e indisponibilidade de provider;
- não copiar tokens, email, CPF ou user-agent bruto para a nova tabela;
- adicionar seed/backfill somente se necessário para testes, sem inventar alertas históricos;
- registrar o novo modelo no Prisma SQLite e regenerar o client durante a implementação;
- ser aplicada com o procedimento manual de SQLite documentado em `backendnode/prisma/AGENTS.md`.

Redis continua sendo cache/coordenação, não fonte de verdade:

- `known_device:{userId}:{fingerprintHash}` mantém compatibilidade com TTL de 30 dias;
- `alert_debounce:{userId}:{fingerprintHash}` mantém debounce de 5 minutos;
- `login_alert_action:{jtiHash}` ou equivalente garante consumo atômico curto;
- o registro `LoginAlert` conserva o estado final e permite idempotência após expiração do Redis.

## Hypothesized Root Cause

1. **Confiança de proxy sem classificação de contexto**: `main.ts` tem suporte a `TRUST_PROXY`, mas a camada de domínio usa apenas a string retornada por `req.ip`. Sem uma política validada por ambiente, `::1`, socket local ou IP do proxy pode chegar ao email como se fosse origem pública.
2. **Contrato ambíguo de IP do cliente**: o frontend chama ipify e envia `clientIp`; o DTO descreve preferência, enquanto as regras de segurança exigem que o backend nunca confie nesse valor. Essa duplicidade aumenta risco de regressão e dependência externa.
3. **Fingerprint e metadata acoplados ao valor cru**: `LoginAlertService` usa o IP e user-agent diretamente para hash/alerta, sem um objeto de contexto que normalize endereço, UA, classificação e ambiente.
4. **GeoIP sem contrato de apresentação/persistência**: `GeoIpService` é reutilizável e self-hosted, mas o resultado é usado apenas na decisão e no HTML inline. `clientGeo` é reduzido em `AuditLog`, porém não compõe o evento persistido nem é refletido com origem/precisão no email.
5. **Ausência de entidade de alerta**: `AuditLog` registra eventos genéricos e `AccessLog` registra acessos, mas não existe vínculo entre o login, o email enviado, o token de ação, sua expiração e o estado confirmado/recusado.
6. **Ações assimétricas e incompletas**: o link positivo vai para `/home`; o negativo tem endpoint tokenizado, mas o estado é somente JWT + Redis e o replay retorna erro. Isso não implementa confirmação nem idempotência de domínio.
7. **Template fora do sistema de branding**: o alerta é HTML inline em `EmailService`, com cores antigas (`#10b981`, `#0a0a0a`), user-agent cru, ISP e fallback de URL em `process.env`, embora exista base de template e `EmailTemplatesService` versionado.
8. **Momento do disparo**: o alerta é iniciado após a criação da sessão mas antes da conclusão do 2FA. Isso pode gerar alerta para uma tentativa que não se tornou login autenticado e dificulta associar o evento a um login concluído.
9. **Configuração de origem permissiva**: `FRONTEND_URL` possui fallback localhost e não é validada contra o ambiente; links de ação podem ser incorretos em homologação/produção.

## Correctness Properties

Property 1: Bug Condition - Contexto confiável e alerta acionável

_For any_ evento `X` em que `isBugCondition(X)` retorna true, o sistema corrigido SHALL produzir um `LoginAlert` com IP derivado exclusivamente do contexto confiável do request e classificação explícita de não público quando aplicável, dispositivo normalizado, localização com origem/precisão explícitas, persistência mínima LGPD-safe, email renderizado pelo branding aprovado e links environment-aware que executem exatamente uma ação segura.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 2: Preservation - Autenticação e metadata indisponível

_For any_ entrada `X` em que `isBugCondition(X)` retorna false, o sistema corrigido SHALL produzir o mesmo resultado funcional de `F`, preservando login, 2FA, cookie HTTP-only, sessão Redis, login direto por IP público, contexto local de desenvolvimento, ausência de consentimento, fallback de localização indisponível, envio SES e ações de segurança já válidas, sem bloquear a autenticação por falha de metadata.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10**

Property 3: Ações de reconhecimento single-use e idempotentes

_For any_ `LoginAlert` com token válido, a primeira confirmação SHALL marcar o alerta como `CONFIRMED`, tornar o fingerprint conhecido e não criar uma sessão adicional; a repetição do mesmo token SHALL retornar o estado já confirmado sem repetir efeitos. Analogamente, a primeira recusa SHALL preservar a invalidação de sessões e reset obrigatório, e a repetição SHALL ser segura e sem novos efeitos destrutivos.

**Validates: Requirements 2.11, 2.12, 3.7**

Property 4: Degradação segura de metadata

_For any_ falha de IP público, proxy não reconhecido, GeoIP, consentimento, parser de dispositivo, Redis ou SES que não seja falha de credencial, o sistema SHALL continuar o fluxo de autenticação e registrar somente o estado mínimo disponível, exibindo “indisponível” ou contexto local quando necessário, sem fabricar localização/IP nem bloquear o usuário.

**Validates: Requirements 2.2, 2.5, 2.7, 2.8, 2.13**

## Fix Implementation

### Changes Required

#### 1. Resolver e classificar o contexto de rede

**Arquivos/áreas:** `backendnode/src/main.ts`, `backendnode/src/auth/auth.service.ts`, novo serviço em `backendnode/src/common/request-context/` ou `backendnode/src/auth/services/`.

- Criar uma abstração `TrustedClientContextResolver` que receba `Request` e devolva `TrustedClientContext`.
- Usar `req.ip` depois da configuração de `trust proxy`; usar socket apenas como fallback técnico quando `req.ip` não existir.
- Nunca ler `X-Forwarded-For`, `Forwarded` ou `clientIp` diretamente no domínio. O header só pode ser interpretado pelo Express quando o hop remetente estiver na allowlist `TRUST_PROXY`.
- Normalizar IPv4-mapped IPv6 e validar com utilitário de IP antes da classificação.
- Reutilizar/centralizar a classificação de faixas privadas, reservadas, link-local, CGNAT, documentação e loopback já parcialmente existente no `GeoIpService`.
- Em `PRODUCTION`, proxy ausente/não confiável ou endereço local resulta em `NON_PUBLIC/UNAVAILABLE`; nunca em IP público estimado.
- Em `DEVELOPMENT`/`TEST`, loopback é aceito como `LOOPBACK` e apresentado como contexto local.
- Manter `TRUST_PROXY` como configuração explícita por ambiente; validar formato e impedir configuração ampla/ambígua em produção.

#### 2. Remover a confiança e a dependência do IP capturado no frontend

**Arquivos/áreas:** `backendnode/src/auth/dto/login-auth.dto.ts`, `frontend/app/hooks/use-login-mutation.ts`, `frontend/app/lib/get-public-ip.ts`, BFF `frontend/app/routes/api/auth.ts`.

- Retirar `clientIp` do contrato de segurança do login. Pode haver compatibilidade temporária para aceitar e ignorar o campo, sem persistir nem usar em fingerprint, auditoria ou GeoIP.
- Remover a chamada a `api.ipify.org` da mutation de login; ela não é necessária e envia um sinal a terceiro.
- Manter `clientGeo` somente quando já houver consentimento e resultado válido, sem abrir prompt no login. Os helpers existentes de geolocalização permanecem best-effort.
- Atualizar Swagger, comentários e tipos para não afirmar que o backend prioriza IP do cliente.
- O BFF continua proxy transparente para `/auth`, encaminhando cookies e body sem inventar cabeçalhos de rede.

#### 3. Normalizar o dispositivo

**Arquivos/áreas:** novo `DeviceContextService`/adapter e `LoginAlertService`.

- Criar interface de parser de UA para permitir teste determinístico e troca de implementação.
- Usar parser de User-Agent com dependência pequena e versão fixa aprovada, ou adapter de regex equivalente se a política de dependências rejeitar a biblioteca; sempre fornecer fallback.
- Persistir/exibir apenas `browser`, `operatingSystem`, `deviceType` e `deviceLabel`.
- Manter hash do UA cru somente quando necessário para fingerprint, sem expor ou persistir o texto bruto.
- Exemplos de fallback: “Chrome no Windows”, “Safari no iPhone”, “Firefox no Linux”, “Dispositivo não identificado”. O valor `node` não deve ser apresentado como dispositivo humano se não houver informação suficiente.

#### 4. Resolver localização com precedência e minimização

**Arquivos/áreas:** `GeoIpService`, `LoginAlertService`, novo `LoginLocationResolver`.

- Reutilizar MaxMind/GeoLite2 self-hosted; não adicionar API externa de geolocalização.
- Classificar a localização do browser como `CONSENTED_CLIENT`, mas tratá-la como input controlável pelo cliente e não como fonte de autenticação.
- Reduzir latitude/longitude a duas casas ou converter para região/cidade antes de persistir; guardar `accuracyBucketMeters`, nunca coordenada precisa.
- Para GeoIP, usar somente o IP público confiável, exibir cidade/país como “aproximados” e omitir ISP do email salvo se houver necessidade explícita aprovada.
- Não bloquear login quando DB não existe, IP é privado, cache falha ou lookup não encontra registro.
- Persistir no `LoginAlert.location` somente a forma mínima; o `AuditLog` recebe apenas `source`, país/região e referência do alerta, nunca coordenadas precisas.

#### 5. Persistir o evento e seu ciclo de vida

**Arquivos/áreas:** `backendnode/prisma/schema.sqlite.prisma`, migration SQLite, `LoginAlertService`, `AuditService`.

- Criar o modelo `LoginAlert` conforme o contrato deste documento e relation mínima com `User`.
- Gerar `eventKey` determinístico por login concluído para impedir duplicação em retries/background jobs.
- Criar o registro antes do envio do email com `deliveryStatus=PENDING`; atualizar para `SENT` somente quando `EmailService` retornar sucesso real, preservando `FAILED` e a mensagem operacional sanitizada.
- Persistir token apenas por `jtiHash` e expiração. Nunca persistir JWT bruto.
- Registrar `LOGIN_ALERT_CREATED`, `LOGIN_ALERT_SENT`, `LOGIN_ALERT_FAILED`, `LOGIN_ALERT_CONFIRMED` e `LOGIN_ALERT_DISMISSED` no `AuditLog`, com `entity=LoginAlert`, `entityId` opaco e snapshots sem email/CPF/telefone.
- Manter os eventos `LOGIN_SUCCESS`, `LOGIN_NEW_DEVICE` e `LOGIN_KNOWN_DEVICE` para compatibilidade de auditoria, referenciando o novo alert quando houver.

#### 6. Ajustar o momento do evento

**Arquivos/áreas:** `AuthService`, fluxo de verificação 2FA.

- Preferencialmente, disparar `NewLoginAlertEvent` somente após `verifyCode` concluir com sucesso e a sessão estar autorizada (`af2Verified=true`).
- O alerta deve usar o contexto capturado no request de login e não exigir nova chamada ao frontend.
- Se a compatibilidade operacional exigir manter o disparo antes do 2FA, criar um estado `PENDING_2FA` e somente enviar o alerta definitivo após confirmação; não tratar tentativa incompleta como novo login concluído.
- O caminho permanece assíncrono e não deve aumentar a latência da resposta de login além do fluxo atual.

#### 7. Implementar ações “Sim” e “Não” com contrato único

**Backend:** `AuthService`, `DismissSessionController` e novo controller/endpoint de confirmação.

- Emitir token curto com claims mínimos: `purpose`, `sub/userId`, `alertId`, `jti`; assinar com `JWT_SECRET` e algoritmo explicitamente permitido.
- Criar `POST /auth/confirm-login` público, limitado por `ThrottlerGuard`, que valida token, alerta, expiração e `purpose`, consome `jti` atomicamente, marca `CONFIRMED` e chama `markDeviceAsKnown`.
- Confirmar não deve criar sessão, alterar senha, reativar conta ou invalidar outras sessões.
- Manter `POST /auth/dismiss-session`, agora associado ao `alertId`; a primeira execução marca `DISMISSED`, invalida sessões via `SessionService`, define `requirePasswordReset` e limpa caches como hoje.
- Ambas as ações devem tratar o mesmo token repetido de modo idempotente. Token inválido/expirado continua retornando resposta genérica, sem enumeração de usuário ou alerta.
- Auditoria deve diferenciar confirmação e recusa e registrar quantidade de sessões eliminadas somente na recusa.

**Contratos públicos propostos:**

```text
POST /auth/confirm-login
Body: { token: string }
200: { error: false, data: {
  alertId: string,
  status: "CONFIRMED",
  sessionCreated: false
}}

POST /auth/dismiss-session
Body: { token: string }
200: { error: false, data: {
  alertId: string,
  status: "DISMISSED",
  sessionsDeleted: number,
  forcePasswordReset: true
}}
```

As respostas de erro devem ser genéricas em PT-BR e não indicar se um `alertId`, usuário ou email existe.

#### 8. Template e envio de email

**Arquivos/áreas:** `backendnode/src/email/email.service.ts`, `src/email/templates/`, `EmailTemplatesService`, seed/migration de templates e painel FIN-05.

- Criar slug versionado `new-login-alert` no `EmailTemplatesModule`, adicionando mapper de dados no `EmailService`.
- Reutilizar `baseTemplate` e alinhar o alerta à identidade oficial: Inter/stack equivalente, fundo preto, magenta `#d500f9`, contraste AA, textos PT-BR e emerald apenas para semântica terminal; ações positivas/negativas devem usar semântica acessível, não cor como único indicador.
- Dados exibidos: data/hora com timezone explícito, dispositivo normalizado, IP público ou “contexto local/indisponível”, localização aproximada/consentida com origem clara e motivo do alerta. Omitir ISP, coordenadas e user-agent cru.
- Renderizar HTML e texto alternativo; escapar todos os valores e validar URLs antes do template.
- Usar template publicado do banco quando disponível e fallback hardcoded versionado quando ausente/indisponível. Falha do template não deve derrubar login, mas deve resultar em `deliveryStatus=FAILED` se o email não puder ser enviado.
- SES continua via `sendEmail`, com remetente/reply-to configurados e sem CC pessoal por default.

#### 9. Origem de URLs por ambiente

**Arquivos/áreas:** `backendnode/.env.example`, configuração Nest/ConfigService, `EmailService`, `frontend/app/lib/api-config.ts` e BFFs.

- Definir `FRONTEND_URL` como origem canônica absoluta por ambiente; consumi-la via `ConfigService`, não via `process.env` espalhado.
- Validar esquema `http/https`, ausência de path inesperado e correspondência de ambiente. Em produção/homologação, rejeitar `localhost`, `127.0.0.1`, `::1` e origens privadas.
- Em desenvolvimento/teste, permitir localhost explicitamente.
- Gerar ambos os links a partir da mesma origem validada:
  - `${FRONTEND_URL}/auth/confirm-login#token=...`
  - `${FRONTEND_URL}/auth/dismiss-session#token=...`
- O hash não é enviado ao servidor por HTTP; a página extrai o token, remove o fragmento com `history.replaceState` e faz POST JSON para o BFF local.
- O frontend não deve construir URL com `BACKEND_URL` em componentes. BFFs continuam importando `BACKEND_URL` de `~/lib/api-config` e passando cookies somente quando o endpoint exigir.

#### 10. Frontend/BFF e arquitetura SSR

**Arquivos/áreas:** `frontend/app/routes.ts`, novas páginas/BFFs, `frontend/app/routes/auth.dismiss-session.tsx`, `frontend/app/hooks/use-login-mutation.ts`.

- Registrar rotas públicas `auth/confirm-login` e `auth/dismiss-session` na fonte única `routes.ts` antes do layout autenticado.
- Criar BFFs `routes/api/auth.confirm-login.ts` e atualizar `auth.dismiss-session.ts`; ambos aceitam somente POST, validam presença de token e repassam resposta/status sem logar body.
- Extrair UI compartilhada para componente de ação de segurança; manter arquivos de rota pequenos e sem fetch em `useEffect` para dados de servidor além do POST imperativo da ação.
- A página de ação não depende de `useUser()` nem do layout, porque o token deve funcionar após desconexão de todas as sessões.
- Atualizar `useLoginMutation` para remover ipify. A coleta de `clientGeo` continua best-effort e não gera request adicional ao backend; a mutation envia somente o body necessário ao BFF.
- Não criar query de alerta no layout e não duplicar `/users/me`/`/auth/status`; a arquitetura SSR/TanStack Query existente permanece intacta.

## Testing Strategy

### Validation Approach

A validação segue o método bugfix em três fases: capturar contraexemplos no comportamento atual, verificar a correção para `C(X)` e testar preservação para `¬C(X)`. Os testes devem usar relógio controlável, Redis/Prisma/SES mockados e fixtures de proxy/UA/GeoIP; nenhum teste deve chamar ipify ou provider externo.

### Exploratory Bug Condition Checking

**Objetivo:** reproduzir os sintomas no código não corrigido antes da implementação para confirmar a hipótese.

**Casos exploratórios:**

1. `req.ip=::1` em produção/homologação com `TRUST_PROXY` ausente: observar IP local apresentado sem classificação.
2. Request atrás de proxy confiável com cadeia válida: comparar `req.ip`, socket e header para detectar se a configuração retorna o cliente correto.
3. User-agent Chrome/Safari e user-agent ausente/`node`: confirmar apresentação técnica ou genérica.
4. `clientGeo` válido com permissão já concedida: confirmar que só aparece em snapshot de auditoria e não no email/persistência do alerta.
5. GeoLite2 resolve IP público: confirmar que existe enriquecimento, mas não um contrato persistido de source/precision.
6. GeoLite2 ausente/IP privado/Redis indisponível: confirmar que login não falha e que o alerta atual perde contexto.
7. Clicar “Sim, fui eu”: confirmar que a aplicação apenas navega para `/home` e não registra confirmação.
8. Clicar duas vezes “Não fui eu”: confirmar resposta diferente/rejeição e ausência de estado persistido do alerta.
9. `FRONTEND_URL` ausente: confirmar fallback localhost no HTML.

**Contraexemplos esperados:** IP incorreto ou sem classificação, dispositivo cru, localização ausente, ação positiva sem efeito, replay não idempotente e URL incompatível.

### Fix Checking

**Pseudocode:**

```text
FOR ALL X WHERE isBugCondition(X) DO
  result := F'(X)
  ASSERT expectedBehavior(X)
  ASSERT result.alert.ipSource IN {REQUEST_IP, SOCKET_ADDRESS, NONE}
  ASSERT result.alert.neverUsesClientIpAsTrusted
  ASSERT result.alert.locationHasSourceAndPrecision
  ASSERT result.alert.deviceLabelIsHumanReadableOrExplicitlyUnavailable
  ASSERT result.alert.emailLinksMatchValidatedEnvironmentOrigin
  ASSERT result.alert.actionEffectsAreSingleUseAndIdempotent
END FOR
```

### Preservation Checking

**Pseudocode:**

```text
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT observableAuthResult(F(X)) = observableAuthResult(F'(X))
  ASSERT cookiesAndSessionSemantics(F(X)) = cookiesAndSessionSemantics(F'(X))
  ASSERT nonAlertInteractions(F(X)) = nonAlertInteractions(F'(X))
END FOR
```

### Unit Tests

**Backend:**

- `TrustedClientContextResolver`: IP direto público, IPv4-mapped IPv6, `::1`, `127.0.0.1`, RFC1918, CGNAT, documentação, inválido, ausente e produção sem proxy configurado.
- Allowlist `TRUST_PROXY`: proxy confiável, proxy não confiável, múltiplos hops, header forjado e configuração inválida.
- `DeviceContextService`: Chrome/Windows, Safari/iOS, Firefox/Linux, bot/node, user-agent vazio, caracteres maliciosos e limite de tamanho.
- `LoginLocationResolver`: consentida, IP aproximada, ambas com precedência, nenhuma, GeoIP exception e coordenadas reduzidas.
- `LoginAlertService`: fingerprint baseado no contexto normalizado, debounce de 5 minutos, device conhecido, nova localização e Redis fail-open sem storm.
- Persistência: `LoginAlert` criado com campos mínimos, nenhum token/UA cru, delivery `PENDING → SENT/FAILED`, índices/eventKey e referência opaca.
- Token: claims/purpose/expiração/algoritmo, jti atômico, token de outro propósito, token expirado, token ausente e replay idempotente.
- Confirmação: marca `CONFIRMED`, conhece device, não cria sessão e não altera reset.
- Recusa: invalida sessões uma vez, marca reset, limpa caches e repete com segurança.
- `PublicUrlService`: URL válida por development/test/homologation/production, localhost rejeitado em produção e ausência de configuração tratada como falha operacional.
- `EmailService`: template DB, fallback, escape HTML, texto alternativo, branding, ausência de ISP/coordenadas/UA cru, `success=false` quando SES falha.

**Frontend:**

- `useLoginMutation` não chama ipify e encaminha apenas `clientGeo` consentida quando disponível.
- Página/BFF de confirmação e recusa extraem fragmento, removem token da URL, usam POST, preservam status e não renderizam dados privados.
- Rotas públicas são registradas em `routes.ts`; nenhuma rota filha chama auth loader redundante.

### Property-Based Tests

- Gerar combinações de IP, proxy, ambiente e headers; a propriedade é que nenhum valor fornecido no body/header não confiável vire `trustedIp`.
- Gerar todos os limites de ranges IPv4/IPv6 e verificar classificação consistente, sem apresentar reservado/loopback como público.
- Gerar user-agents arbitrários, vazios e malformados; o resultado deve ser label limitado, escapável e nunca o texto cru completo.
- Gerar estados de localização (`consentida`, `GeoIP`, ambas, nenhuma) e verificar precedência, source/precision e ausência de coordenadas precisas.
- Gerar falhas de Redis/GeoIP/SES/template e verificar que o resultado de autenticação não muda e que o alerta degrada para estado explícito.
- Gerar tokens e replays concorrentes; no máximo uma transição destrutiva deve ocorrer por `jti`, enquanto chamadas repetidas da mesma ação retornam estado idempotente.
- Gerar URLs de configuração por ambiente; nenhuma URL de produção pode apontar para localhost, IP privado ou esquema não permitido.

### Integration Tests

- Login completo: credencial válida → sessão Redis → 2FA → criação de `LoginAlert` → renderização/publicação do email com delivery state.
- Login atrás de Nginx/Express trust proxy com IP público: verificar `AccessLog`, fingerprint, `LoginAlert` e email usando o mesmo contexto confiável.
- Login local/teste com `::1`: verificar classificação local, alerta não bloqueante e texto “contexto local/indisponível”.
- Login com consentimento prévio de geolocalização: verificar envio de `clientGeo`, redução, persistência de origem e apresentação sem coordenada precisa.
- Login sem consentimento e com GeoLite2: verificar localização aproximada marcada como estimativa.
- GeoLite2 ausente/Redis indisponível/SES indisponível: verificar autenticação 2FA, estado `FAILED` ou metadata indisponível e ausência de sessão duplicada.
- Fluxo “Sim, fui eu”: abrir URL de fragmento, POST BFF, confirmação, device conhecido, nenhuma sessão nova e segundo clique idempotente.
- Fluxo “Não fui eu”: abrir URL de fragmento, POST BFF, todas as sessões invalidadas, `requirePasswordReset=true`, cache limpo e repetição idempotente.
- Segurança de token: fragmento não aparece em access log/referer, body não é logado, token de propósito incorreto é recusado e rate limit é aplicado.
- Template/branding: publicar template pelo painel FIN-05, renderizar dados reais de fixture e verificar fallback quando o template estiver ausente ou inválido.
- Compatibilidade: login sem novo alerta, login com IP público direto, desenvolvimento local, troca de conta, logout, 2FA pendente e SES sandbox continuam funcionando.

### Riscos, decisões e mitigação

- **Risco de confiar em proxy mal configurado:** mitigação por allowlist `TRUST_PROXY`, validação de configuração e classificação `NON_PUBLIC`; nunca aceitar header bruto.
- **Risco de localização do browser ser forjada:** usar `clientGeo` apenas para UX/auditoria minimizada; anomalia e fingerprint continuam baseados em contexto do backend/GeoIP.
- **Risco de exposição LGPD:** não persistir token/UA cru, não exibir ISP/coordenadas, arredondar localização, usar IDs opacos, limitar campos no email e manter retenção/auditoria controladas.
- **Risco de link quebrado:** validar `FRONTEND_URL` no bootstrap e cobrir cada ambiente; sem fallback localhost em produção.
- **Risco de mudança no timing do alerta:** mover para pós-2FA pode alterar volume/timing observado; acompanhar métricas e manter estado `PENDING_2FA` se for necessário rollout compatível.
- **Risco de migration SQLite:** aplicar migration manual em dev/staging, gerar backup, validar índices e fazer rollout antes de ativar envio persistido; campos opcionais permitem compatibilidade com registros antigos.
- **Risco de template administrável conter links/HTML inseguros:** manter allowlist de variáveis, escape no renderer, validar origem das URLs e exigir publicação/versionamento pelo painel.
- **Risco de SES retornar sucesso parcial/bounce:** considerar sucesso somente quando `EmailService` retornar `success=true`/message id; persistir falha e não marcar device como conhecido apenas por ausência de exception.
