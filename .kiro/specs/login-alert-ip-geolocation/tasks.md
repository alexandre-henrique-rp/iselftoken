# Plano de Implementação — Login Alert IP Geolocation

Este plano segue o bugfix workflow requirements-first e o método de condição do defeito. A implementação futura deve preservar o login, 2FA, sessão Redis, cookies HTTP-only e o comportamento best-effort do alerta. Nenhuma tarefa abaixo autoriza fabricar IP público, coletar localização sem consentimento, persistir token bruto/user-agent bruto ou bloquear autenticação por falha de metadata.

## Ordem obrigatória

1. Explorar o defeito no código não corrigido e registrar contraexemplos.
2. Observar e proteger o comportamento não defeituoso no código não corrigido.
3. Implementar a correção por camadas, incluindo migration SQLite, backend, email/template, frontend/BFF, segurança/LGPD e testes.
4. Reexecutar as propriedades, testes de integração e validações de build/lint.

## 1. Exploração da condição do defeito

- [ ] 1. **Property 1: Bug Condition** - Reproduzir contexto incorreto e alerta não acionável
  - **IMPORTANTE:** escrever e executar este teste antes de qualquer correção; ele deve falhar no código não corrigido.
  - Implementar um teste property-based/parametrizado que gere eventos de novo login e cubra `isBugCondition(X)` do `bugfix.md`/`design.md`:
    - `req.ip` loopback, privado, inválido, ausente ou endereço de proxy em homologação/produção;
    - cadeia de proxy confiável e não confiável, incluindo header forjado e `clientIp` fornecido pelo frontend;
    - user-agent disponível que hoje resulte em `node`/valor cru ou user-agent vazio/malformado;
    - `clientGeo` consentida e válida sem aparecer/persistir no alerta;
    - GeoIP MaxMind resolvível sem localização persistida/apresentada;
    - GeoIP indisponível, Redis indisponível e metadata ausente;
    - ausência de `LoginAlert`/estado de delivery/action persistido;
    - email fora do branding ou contendo user-agent/ISP/coordenada desnecessários;
    - `FRONTEND_URL` ausente, localhost em ambiente não local ou link positivo apontando para `/home` sem confirmação;
    - repetição de “Não fui eu” não idempotente.
  - Asserir a expectativa descrita no design: o comportamento atual deve evidenciar pelo menos um contraexemplo de IP incorreto/não classificado, dispositivo técnico, localização ausente, ausência de persistência, ação positiva sem efeito, replay não idempotente ou URL incompatível.
  - Para cada caso determinístico, manter fixture reproduzível e documentar a saída observada, sem corrigir o teste para fazê-lo passar.
  - **Resultado esperado no código não corrigido:** falha do teste confirmando a existência do bug.
  - Após a implementação, esta mesma suíte será reexecutada como `Property 1: Expected Behavior`; não criar uma segunda suíte equivalente.
  - _Bug_Condition: `isBugCondition(X)` quando `X.generatesNewLoginAlert` e qualquer defeito de contexto, device, localização, persistência, email, URL ou ação ocorre._
  - _Expected_Behavior: `expectedBehavior(X)` deve produzir contexto confiável, classificação explícita, device normalizado, localização com source/precision, persistência mínima, email aprovado, links válidos e ações single-use/idempotentes sem bloquear autenticação._
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13_

## 2. Preservação antes da correção

- [ ] 2. **Property 2: Preservation** - Capturar autenticação e metadata não defeituosa
  - **IMPORTANTE:** seguir observation-first: executar no código não corrigido, registrar as saídas reais e somente então fixar as asserções.
  - Implementar testes property-based para entradas em `NOT isBugCondition(X)` e observar que:
    - credencial, lockout, anti-enumeração, rate limit, 2FA, sessão Redis e cookie HTTP-only continuam funcionando;
    - IP público direto e válido continua sendo usado sem substituição por localhost ou GeoIP;
    - loopback em desenvolvimento/teste continua aceito como contexto local, sem IP público fictício;
    - ausência de consentimento não abre prompt nem coleta localização precisa; `clientGeo` continua opcional;
    - ausência de IP/GeoIP/Redis/parser/SES mantém login e alerta best-effort, com localização indisponível quando necessário;
    - alerta é enviado ao email associado via SES quando configurado e mantém as duas ações;
    - “Não fui eu” preserva invalidação de sessões, `requirePasswordReset`, limpeza de devices/debounce e proteção contra replay;
    - consultas de auditoria permanecem isoladas por usuário, com IDs opacos e sem PII em logs livres;
    - troca de conta, logout, sessões/cookies existentes e navegação normal não sofrem alteração observável.
  - Fixar as propriedades apenas depois de registrar as observações reais do baseline.
  - **Resultado esperado no código não corrigido:** testes passam, estabelecendo o comportamento a preservar.
  - Reexecutar os mesmos testes após a implementação; não substituir por uma suíte mais fraca.
  - _Non-bug condition: `NOT isBugCondition(X)` e entradas de preservação descritas na seção 3 do `bugfix.md`/design._
  - _Preservation: `F(X) = F'(X)` no resultado funcional observável, salvo registro mínimo e transparente de auditoria._
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## 3. Implementação da correção

- [ ] 3. Implementar a correção completa do alerta de novo login
  - Aplicar as subtarefas abaixo na ordem indicada, sem remover a cobertura de exploração/preservação.
  - **Bug_Condition:** evento de novo login cujo contexto, metadata, persistência, email, link ou ação viola `isBugCondition(X)`.
  - **Expected_Behavior:** `expectedBehavior(X)` e as Properties 1, 3 e 4 do design.
  - **Preservation:** preservar a Property 2, autenticação, 2FA, sessão Redis, cookie HTTP-only, SES e ações de segurança existentes.
  - **Requirements:** 2.1–2.14 e 3.1–3.10.

  - [ ] 3.1 Definir contratos internos e resolução confiável do contexto de cliente
    - Criar `TrustedClientContext` independente do DTO HTTP, com endereço normalizado, classificação, origem, ambiente e `proxyChainTrusted`.
    - Criar `TrustedClientContextResolver` usando `req.ip` após `TRUST_PROXY` e socket somente como fallback técnico; nunca usar `clientIp`, `X-Forwarded-For`/`Forwarded` crus ou qualquer header não validado no domínio.
    - Normalizar IPv4-mapped IPv6 e classificar `PUBLIC`, `LOOPBACK`, `PRIVATE`, `RESERVED`, `INVALID` e `MISSING`, incluindo RFC1918, CGNAT, link-local, documentação/teste e loopback.
    - Validar `TRUST_PROXY` por ambiente e impedir configuração ampla/ambígua em homologação/produção; em desenvolvimento/teste, distinguir explicitamente loopback como contexto local.
    - Em produção, representar proxy ausente/não reconhecido ou endereço local como `NON_PUBLIC`/indisponível, nunca como IP público estimado.
    - Integrar a resolução ao `main.ts`/`AuthService` e garantir que fingerprint, auditoria, GeoIP e email usem apenas o contexto produzido pelo resolver.
    - _Bug_Condition: `X.alert.ipIsLoopbackOrIncorrectForEnvironment` ou `X.requiredSecurityDataIsNotPersisted` por uso de origem não confiável._
    - _Expected_Behavior: Requirements 2.1 e 2.2; `TrustedClientContext` é a única fonte de IP._
    - _Preservation: IP público direto continua sendo usado; loopback local continua permitido como contexto técnico._
    - _Requirements: 2.1, 2.2, 2.7, 2.13, 3.2, 3.3, 3.5._

  - [ ] 3.2 Remover dependência e confiança no IP capturado pelo frontend
    - Remover a chamada a `api.ipify.org` da mutation de login e o uso operacional de `clientIp` em fingerprint, auditoria, GeoIP ou alerta.
    - Atualizar `LoginAuthDto`, tipos, Swagger e BFF para aceitar somente o contrato necessário; se compatibilidade temporária for mantida, ignorar explicitamente `clientIp` sem persistir.
    - Preservar `clientGeo` somente quando já houver consentimento e valor válido; não abrir prompt durante o login e não tratar `clientGeo` como evidência de autenticidade de rede.
    - Garantir que o BFF encaminhe cookies/body de forma transparente, sem inventar headers de rede.
    - _Bug_Condition: `clientIp`/ipify pode substituir ou influenciar o IP confiável e introduz dependência externa._
    - _Expected_Behavior: Requirements 2.1, 2.4, 2.5 e 2.8; apenas request/socket confiável informa IP._
    - _Preservation: login, consentimento prévio e fluxo de geolocalização best-effort continuam funcionais._
    - _Requirements: 2.1, 2.4, 2.5, 2.8, 3.1, 3.4._

  - [ ] 3.3 Normalizar user-agent e dispositivo
    - Criar `DeviceContextService`/adapter com parser determinístico e fallback seguro para user-agent vazio, malformado, `node`, bot ou desconhecido.
    - Produzir `NormalizedDevice` com `label`, browser, sistema operacional, `deviceType` e hash do UA somente quando necessário para fingerprint.
    - Exibir labels reconhecíveis como “Chrome no Windows”, “Safari no iPhone” ou “Dispositivo não identificado”; nunca exibir user-agent cru, ISP ou dados desnecessários.
    - Limitar tamanho, escapar valores e impedir que caracteres do user-agent contaminem email, logs ou persistência.
    - _Bug_Condition: `X.alert.deviceIsGenericDespiteAvailableClientInformation` ou exposição do user-agent cru._
    - _Expected_Behavior: Requirements 2.3, 2.7, 2.8 e `DeviceLabel` do design._
    - _Preservation: ausência de parser/UA não bloqueia login; o alerta informa indisponibilidade de forma clara._
    - _Requirements: 2.3, 2.7, 2.8, 2.13, 3.1, 3.5, 3.10._

  - [ ] 3.4 Resolver localização consentida e aproximação por IP
    - Criar `LoginLocationResolver` usando o `GeoIpService` MaxMind/GeoLite2 self-hosted e sem provider externo.
    - Validar `clientGeo` como input controlável pelo cliente, exigir consentimento já existente e reduzir coordenadas para duas casas ou região/cidade antes de persistir.
    - Aplicar precedência explícita: `CONSENTED_CLIENT` reduzida para exibição; `IP_APPROXIMATION` somente para IP público confiável e sempre marcada como estimativa; `UNAVAILABLE` quando nenhuma fonte existir.
    - Quando ambas existirem, preservar a origem de cada informação e não substituir silenciosamente a consentida pela estimativa; manter somente o mínimo necessário no alerta/auditoria.
    - Omitir ISP e coordenadas precisas do email/auditoria; manter `accuracyBucketMeters` quando necessário.
    - Fazer GeoIP, Redis, banco ausente ou erro de parsing falharem abertamente para metadata, sem bloquear login nem fabricar cidade/país/coordenadas.
    - _Bug_Condition: localização consentida ou resolvível por IP está ausente, sem origem/precisão ou não persistida._
    - _Expected_Behavior: Requirements 2.4, 2.5, 2.6, 2.8 e contrato `ResolvedLocation`._
    - _Preservation: sem consentimento não há localização precisa; GeoIP continua opcional e aproximado._
    - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 2.13, 3.4, 3.5._

  - [ ] 3.5 Criar o modelo `LoginAlert` e a migration SQLite
    - Atualizar `backendnode/prisma/schema.sqlite.prisma` com `LoginAlert`, relation com `User` conforme política de retenção, `eventKey` único, índices por usuário/data e status, e `actionTokenJtiHash` único quando preenchido.
    - Criar migration manual em `backendnode/prisma/migrations-sqlite/` sem modificar dados de `User`, `AuditLog`, `AccessLog` ou sessões Redis.
    - Persistir apenas o modelo lógico aprovado: contexto IP classificado, ambiente, device normalizado/hash, localização mínima com source/precision, motivo, timestamps, delivery state e action state.
    - Permitir nulos para metadata indisponível/legada; não persistir JWT bruto, token, email, CPF, telefone, user-agent bruto ou coordenada precisa.
    - Não inventar backfill/alertas históricos; usar seed somente se necessário e somente para fixtures de teste futuras.
    - Executar o procedimento manual SQLite documentado no `backendnode/prisma/AGENTS.md`, regenerar o client e verificar índices/relação sem alterar código de aplicação nesta tarefa de spec.
    - _Bug_Condition: `X.requiredSecurityDataIsNotPersisted` e ausência de estado de delivery/ação/idempotência._
    - _Expected_Behavior: Requirements 2.7 e 2.8; `LoginAlert` conserva estado final mesmo após expiração do Redis._
    - _Preservation: schema existente, auditoria, usuários e sessões Redis permanecem compatíveis._
    - _Requirements: 2.7, 2.8, 2.13, 3.5, 3.8._

  - [ ] 3.6 Integrar o ciclo de vida do alerta e o momento do evento
    - Refatorar `LoginAlertService` para construir `NewLoginAlertEvent`, gerar `eventKey` determinístico, manter debounce/known-device existentes e criar `LoginAlert` com `deliveryStatus=PENDING` antes do envio.
    - Mover o disparo definitivo para após `verifyCode`/2FA e sessão autorizada; se compatibilidade exigir disparo antecipado, modelar `PENDING_2FA` e somente enviar o alerta definitivo após confirmação.
    - Atualizar delivery para `SENT` somente com sucesso real/Message ID do SES e para `FAILED` com mensagem operacional sanitizada; falhas não podem tornar o login inválido.
    - Manter Redis como coordenação (`known_device`, debounce e consumo curto), nunca como fonte de verdade do alerta.
    - Preservar eventos de auditoria legados (`LOGIN_SUCCESS`, `LOGIN_NEW_DEVICE`, `LOGIN_KNOWN_DEVICE`) e adicionar eventos de criação/envio/falha/ação referenciando ID opaco.
    - _Bug_Condition: evento sem ciclo persistido, enviado antes de login concluído ou sem delivery/action state._
    - _Expected_Behavior: Requirements 2.7, 2.13; alerta best-effort e associado a login concluído._
    - _Preservation: login, sessão, 2FA e debounce existentes não falham por metadata/SES/Redis._
    - _Requirements: 2.7, 2.13, 3.1, 3.5, 3.6, 3.9._

  - [ ] 3.7 Implementar confirmação e recusa tokenizadas, single-use e idempotentes
    - Criar contrato de token curto com `purpose`, `sub/userId`, `alertId`, `jti`, expiração e algoritmo explicitamente permitido; persistir somente hash do JTI e expiração.
    - Criar `POST /auth/confirm-login` público com `ThrottlerGuard`, validação de alerta/expiração/purpose, consumo atômico e resposta `{ alertId, status: "CONFIRMED", sessionCreated: false }`.
    - Marcar confirmação, tornar device conhecido e não criar sessão, alterar senha, reativar conta ou invalidar outras sessões.
    - Associar `DismissSessionController` ao `alertId`, preservar invalidação de sessões, `requirePasswordReset`, limpeza de caches e resposta `{ alertId, status: "DISMISSED", sessionsDeleted, forcePasswordReset: true }`.
    - Tratar repetição do mesmo token/alerta de modo idempotente, sem repetir efeitos destrutivos nem revelar usuário/alerta; tokens inválidos, expirados ou de purpose incorreto devem ter erro genérico em PT-BR.
    - Registrar auditoria distinta para confirmação/recusa e quantidade de sessões eliminadas somente na recusa.
    - _Bug_Condition: `confirmActionDoesNotConfirmTheAlert` ou `dismissActionIsNotIdempotent`._
    - _Expected_Behavior: Property 3; Requirements 2.10, 2.11 e 2.12._
    - _Preservation: proteção existente contra repetição, expiração e terceiros continua válida; recusa mantém todas as medidas atuais._
    - _Requirements: 2.10, 2.11, 2.12, 3.6, 3.7, 3.8._

  - [ ] 3.8 Validar origem pública e construir URLs por ambiente
    - Criar/centralizar `PublicUrlService` baseado em `ConfigService`, com `FRONTEND_URL` absoluta, esquema permitido, host/origem sem path inesperado e validação por ambiente.
    - Em homologação/produção rejeitar localhost, `127.0.0.1`, `::1`, IP privado e configuração ausente; em desenvolvimento/teste permitir localhost explicitamente.
    - Gerar ambos os links a partir da mesma origem validada: `/auth/confirm-login#token=...` e `/auth/dismiss-session#token=...`.
    - Manter token no fragmento, removê-lo com `history.replaceState` na página e enviá-lo somente via POST BFF; não usar query string, logs, referer ou HTML sem escape.
    - _Bug_Condition: `X.linksAreInvalidForEnvironment` ou token exposto em transporte/log._
    - _Expected_Behavior: Requirements 2.10; links válidos, environment-aware e protegidos._
    - _Preservation: origem local continua permitida em desenvolvimento/teste, sem fallback localhost em produção._
    - _Requirements: 2.10, 2.13, 3.7, 3.9._

  - [ ] 3.9 Migrar email para template versionado e branding iSelfToken
    - Criar slug versionado `new-login-alert` no sistema de templates, reutilizando `baseTemplate`/`EmailTemplatesService` e fallback hardcoded versionado quando o template publicado estiver ausente/indisponível.
    - Ajustar HTML e texto alternativo para PT-BR, Inter/stack equivalente, fundo preto, magenta `#d500f9`, contraste AA, hierarquia acessível e sem usar somente cor para diferenciar ações.
    - Exibir data/hora com timezone explícito, device label, IP público ou contexto local/indisponível, localização consentida/aproximada com origem clara e motivo do alerta.
    - Omitir ISP, coordenadas precisas, user-agent cru, email/CPF/telefone e qualquer PII desnecessária; escapar todos os dados e validar URLs antes da renderização.
    - Manter destinatário legítimo, remetente/reply-to autorizado no SES, rastreamento sanitizado e `deliveryStatus=FAILED` quando nenhum template/SES puder enviar.
    - _Bug_Condition: `X.emailIsOffBrand` ou email expõe metadata além do necessário._
    - _Expected_Behavior: Requirements 2.8 e 2.9; mensagem compreensível com as duas ações._
    - _Preservation: SES, remetente autorizado, legibilidade, responsividade, acessibilidade e informações essenciais continuam disponíveis._
    - _Requirements: 2.8, 2.9, 2.13, 3.6, 3.9, 3.10._

  - [ ] 3.10 Implementar páginas públicas, rotas e BFFs
    - Registrar em `frontend/app/routes.ts` as rotas públicas de confirmação e recusa antes do layout autenticado, sem `useUser()`/loader de autenticação redundante.
    - Criar/atualizar páginas de ação e componente compartilhado para extrair fragmento, remover token da URL, enviar POST imperativo e exibir somente resultado genérico/seguro.
    - Criar `routes/api/auth.confirm-login.ts` e atualizar `auth.dismiss-session.ts` para aceitar somente POST, exigir token presente, encaminhar status/body sem logar corpo e preservar cookies somente quando necessários.
    - Atualizar `useLoginMutation` para remover ipify e enviar apenas body necessário, mantendo `clientGeo` previamente consentida sem requisição adicional de geolocalização.
    - Não criar query de alerta no layout, não duplicar `/users/me`/`/auth/status` e não armazenar token em localStorage.
    - _Bug_Condition: links de ação não chegam ao endpoint correto, ação positiva não confirma ou token é exposto no frontend._
    - _Expected_Behavior: Requirements 2.10, 2.11 e 2.12; fluxo público funciona mesmo sem sessão._
    - _Preservation: arquitetura SSR/TanStack Query, cookies HTTP-only, gating de autenticação e troca de conta permanecem intactos._
    - _Requirements: 2.10, 2.11, 2.12, 3.1, 3.6, 3.7, 3.10._

  - [ ] 3.11 Aplicar segurança, LGPD, auditoria e documentação operacional
    - Garantir minimização de IP/localização/UA/device, sem PII em logs livres, IDs opacos, retenção de auditoria mínima de cinco anos e autorização por `request.user.id` nas consultas privadas.
    - Garantir que logs de token, body de ação, email, CPF, telefone, coordenadas precisas e user-agent cru não sejam emitidos por backend, BFF, SES ou Sentry.
    - Atualizar Swagger, comentários, `.env.example`/configuração e documentação do procedimento de `FRONTEND_URL`, `TRUST_PROXY`, migration SQLite e fallback operacional de SES/GeoIP.
    - Confirmar que nenhuma nova API externa é usada para IP/GeoIP e que a remoção do ipify não introduz dependência substituta.
    - _Bug_Condition: metadata ou ação viola requisitos de minimização, segurança ou ambiente._
    - _Expected_Behavior: Requirements 2.8, 2.10 e 2.13, com auditoria mínima e sem exposição indevida._
    - _Preservation: isolamento por conta, auditoria existente e canal SES continuam operacionais._
    - _Requirements: 2.8, 2.10, 2.13, 3.8, 3.9._

  - [ ] 3.12 Criar testes unitários dos componentes de backend
    - Cobrir `TrustedClientContextResolver`: IP público direto, IPv4-mapped IPv6, loopback, privado, CGNAT, reservado, documentação, inválido, ausente, proxy confiável/não confiável, múltiplos hops e configuração inválida.
    - Cobrir `DeviceContextService`: Chrome/Windows, Safari/iOS, Firefox/Linux, bot/node, vazio, malformado, caracteres maliciosos e limite de tamanho.
    - Cobrir `LoginLocationResolver`: consentida, IP aproximada, ambas com precedência, nenhuma, GeoIP exception, Redis exception e redução de coordenadas.
    - Cobrir `PublicUrlService`: development/test/homologation/production, localhost rejeitado fora de ambiente local, origem ausente, esquema/host inválido e fragmento seguro.
    - Cobrir persistência/delivery/token/ações: `PENDING → SENT/FAILED`, `eventKey`, campos mínimos, ausência de token/UA bruto, purpose/expiração/JTI, confirmação sem sessão, recusa com reset e replay idempotente.
    - _Bug_Condition: cada classe de defeito deve ter caso que falharia antes da correção._
    - _Expected_Behavior: Properties 1, 3 e 4 do design._
    - _Preservation: incluir casos de IP público, loopback local, provider indisponível e ações legadas._
    - _Requirements: 2.1–2.13, 3.1–3.10._

  - [ ] 3.13 Criar property-based tests adicionais da correção
    - Gerar combinações de IP, proxy, ambiente e headers e verificar que nenhum body/header não confiável se torna `trustedIp`.
    - Gerar limites IPv4/IPv6 e verificar classificação consistente, sem apresentar reservado/loopback como público.
    - Gerar user-agents arbitrários e verificar label limitado, escapável e sem reproduzir o UA cru completo.
    - Gerar estados de localização e verificar source/precision, precedência e ausência de coordenadas precisas.
    - Gerar falhas de Redis/GeoIP/SES/template e verificar que autenticação não muda e metadata degrada explicitamente.
    - Gerar tokens/replays concorrentes e verificar no máximo uma transição destrutiva por JTI e respostas idempotentes subsequentes.
    - Gerar URLs por ambiente e provar que produção não aponta para localhost, IP privado ou esquema inválido.
    - _Bug_Condition: entradas pertencentes a `isBugCondition(X)`._
    - _Expected_Behavior: Properties 1, 3 e 4._
    - _Preservation: incluir domínio `NOT isBugCondition(X)` e verificar a Property 2._
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.10, 2.11, 2.12, 2.13, 3.1–3.10._

  - [ ] 3.14 Criar testes de integração e fluxo completo
    - Cobrir login válido → sessão Redis → 2FA → `LoginAlert` → email/renderização → delivery state.
    - Cobrir Nginx/Express trust proxy com IP público, login local `::1`, consentimento prévio, GeoLite2 disponível/ausente, Redis/SES indisponível e URL inválida.
    - Cobrir confirmação via fragmento/BFF: `CONFIRMED`, device conhecido, nenhuma sessão nova e segunda execução idempotente.
    - Cobrir recusa via fragmento/BFF: sessões invalidadas, `requirePasswordReset=true`, caches limpos e repetição segura.
    - Cobrir segurança de token: ausência em access log/referer, body não logado, purpose incorreto recusado e throttling aplicado.
    - Cobrir template publicado pelo painel FIN-05 e fallback quando ausente/inválido, incluindo branding, acessibilidade, PT-BR e dados essenciais.
    - _Bug_Condition: cenários de produção/homologação que acionavam o alerta incorreto ou ação incompleta._
    - _Expected_Behavior: Properties 1, 3 e 4 em integração._
    - _Preservation: login sem novo alerta, IP público direto, desenvolvimento, troca de conta, logout, 2FA pendente e SES sandbox._
    - _Requirements: 2.1–2.14, 3.1–3.10._

  - [ ] 3.15 **Property 1: Expected Behavior** - Reexecutar a exploração após a correção
    - Reexecutar exatamente o teste criado na tarefa 1, sem criar uma nova expectativa paralela.
    - Verificar para todo caso de `isBugCondition(X)` que o alerta usa contexto confiável, classifica não público, normaliza device, registra localização source/precision, persiste o mínimo LGPD-safe, usa branding aprovado, constrói links da origem válida e executa uma única ação segura.
    - Verificar que falhas de metadata não bloqueiam autenticação e que nenhum contraexemplo original permanece.
    - **Resultado esperado:** teste passa.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13._

  - [ ] 3.16 **Property 2: Preservation** - Reexecutar os testes de preservação após a correção
    - Reexecutar exatamente os testes criados na tarefa 2, sem escrever uma suíte substituta.
    - Confirmar que login, 2FA, cookies, sessão Redis, IP público direto, loopback local, ausência de consentimento, indisponibilidade de metadata, SES, auditoria isolada e ações de segurança mantêm o comportamento observado.
    - **Resultado esperado:** todos os testes passam sem regressões.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10._

## 4. Checkpoint e validação final

- [ ] 4. Checkpoint - Validar a implementação completa
  - Confirmar que migration/schema/client SQLite estão aplicados e reproduzíveis no ambiente suportado, sem alterar dados existentes indevidamente.
  - Executar testes unitários Jest, property-based, integração/e2e backend e testes Vitest/Playwright relevantes do frontend com modo não interativo (`--run` quando aplicável).
  - Executar typecheck, lint e build de backend/frontend; validar Swagger e rotas públicas/BFF.
  - Revalidar que não existem chamadas a ipify/provider GeoIP externo, tokens em query string/localStorage/logs, PII em logs, fallback localhost em produção, user-agent cru/ISP/coordenada precisa no email ou ação sem rate limit.
  - Conferir manualmente fixtures de development, test, homologation e production para `TRUST_PROXY` e `FRONTEND_URL` sem iniciar servidor/watchers neste fluxo.
  - Registrar resultados, contraexemplos corrigidos e qualquer bloqueio operacional antes de marcar a implementação como concluída.
  - _Requirements: 2.14 e todos os requisitos 2.1–2.13 e 3.1–3.10._
