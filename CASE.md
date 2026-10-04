---
title: Regras de Negócio
description: Regras de negócio da plataforma IselfToken — tokenização de ativos e captação de investimentos
---

# Regras de Negócio — IselfToken

> Este documento é a fonte de verdade para regras de negócio do sistema.
> Toda regra descoberta durante desenvolvimento deve ser adicionada aqui seguindo o formato abaixo.

---

## [Notificações] — Push Real-Time via WebSocket (Sprint WS-01)

### Geral
- Notificações são entregues em duas vias paralelas: **push WebSocket** (latência ~50ms) + **polling HTTP de 60 s** (fallback).
- Toda notificação criada é entregue **apenas** ao `userId` destinatário correto. Não há broadcast ou sala compartilhada.
- Falha de WebSocket (connect_error, emit) é **best-effort**: logada mas nunca propaga. Polling cobre.
- Reconexão automática com backoff exponencial (1 s → 5 s, tentativas infinitas).
- **Dados realtime não exigem reload da página.** Uma ÚNICA conexão WebSocket por usuário (namespace `/notifications`) alimenta todos os conectores realtime: notificações, pagamento, KYC, transações e perfil. Ao voltar o foco da aba (`focus`/`visibilitychange`) ou reconectar, os caches reconciliam automaticamente.

### Backend
- Gateway socket.io no namespace `/notifications` (cliente conecta em `${BACKEND_URL}/notifications`).
- `handleConnection` valida cookie `session_id` via `SessionService.getSession()` (mesma lógica do `AuthGuard` HTTP: `isActive`, `af2Verified`, `lastAccessAt < 7d`).
- Sala por usuário: `user:{userId}`. `NotificationsService.create()` chama `gateway.emitToUser(userId, 'notification', payload)` após persistir.
- O gateway relaya **quatro** eventos pela mesma sala `user:{userId}` (todos best-effort, LGPD-safe): `notification`, `payment.confirmed`, `payment.cancelled` e `kyc.decided`. Cada um é disparado por um evento de domínio no `EventEmitter2` (`@OnEvent`).
- Rate limit por userId: **máximo 5 sockets simultâneos** (LRU — derruba a conexão mais antiga).
- Redis adapter (`@socket.io/redis-adapter`) usa `RealtimeService.getPubSubClients()` (clients `.duplicate()` do Redis principal — sem conexão nova).
- Transports: `['polling', 'websocket']` (long-poll primeiro → upgrade ws). Alinhado cliente↔servidor para funcionar atrás de proxy/CDN que bloqueie o header `Upgrade`.
- CORS do handshake WS: `SOCKET_IO_CORS_ORIGINS` (CSV) com fallback para `FRONTEND_URL`.
- Endpoint DEV-only `POST /notifications/dev/trigger` (NODE_ENV≠production) para testes E2E dispararem push manualmente.
- **Controllers de notificações (`/notifications/*`) usam `@SkipSessionFilter()`** — um founder sem plano ativo precisa poder ler/marcar notificações mesmo durante o fluxo de cadastro (Sprint S34, bug reportado: mark-as-read retornava 401 para usuário sem subscription). Mesmo padrão de `/payment` e `/checkout`.

### Frontend
- **Conexão única consolidada** via `useRealtimeConnection()` (`app/hooks/use-realtime-connection.ts`): UM socket.io singleton por userId (`Map<userId, RealtimeManager>` com ref-count). Expõe `subscribe(event, handler)` com fan-out (um listener real por evento). Substitui os dois singletons antigos que criavam conexões duplicadas.
- Conexão só abre quando `useUser().isAuthorized === true`; fecha no logout/último desmonte.
- Cookie HTTP-only via `withCredentials: true` (CORS `credentials: true` no backend).
- URL do WS: `VITE_WS_URL` (produção atrás de proxy) com fallback para `BACKEND_URL` (dev).
- Conectores (todos consomem o socket único via `subscribe`):
  - `useNotificationsSocket()` → `notification`: incremento OTIMISTA de `["notifications-unread-count"]` (sem refetch) + invalida lista + prepend em `["notifications","all",1]`. Retorna `{ connected }`.
  - `usePaymentConfirmedSocket()` → `payment.confirmed`: refetch+invalidate `["me"]` + invalida `["wallet"]`/`["transactions"]`/`["admin-financeiro-transactions"]`; `payment.cancelled`: invalida `["me"]`.
  - `useKycRealtime()` → `kyc.decided`: refetch+invalidate `["me"]` + invalida `["kyc"]`/`["admin-kyc"]`.
- **Reconciliação central** no `useRealtimeConnection`: em `connect`/reconnect, `window.focus` e `document.visibilitychange`→visible, revalida as `REALTIME_RECONCILE_KEYS` (`notifications-unread-count`, `notifications`, `me`, `wallet`, `transactions`, `admin-financeiro-transactions`) com debounce de 150 ms.
- `refetchInterval` em `notificationsUnreadCountQueryOptions`: **60 s** quando WS desconectado; **desligado** quando conectado (push cobre).
- Mutations migradas para hooks: `useMarkAsReadMutation`, `useMarkAllAsReadMutation`.

---

## [Notificações] — Central e Fila de E-mails (Sprint 2026-10-04)

### Geral
- Toda notificação in-app disparada é **obrigatoriamente** acompanhada por e-mail. O in-app é entregue primeiro (sync, persistido no banco + push WebSocket); o e-mail é entregue depois (enfileirado no RabbitMQ).
- A Central de Notificações (`/notifications`) exibe os itens em ordem decrescente por `createdAt` (mais novo primeiro).
- Descrições podem conter múltiplas linhas separadas por `\n\n`; o frontend renderiza com `whitespace-pre-wrap` preservando as quebras.
- "Perfil a adquirir" (label de UX) é o nome dado ao cenário em que o usuário compra uma assinatura de plano **adicional** — ou seja, ele já tinha outra assinatura `ACTIVE` e está acumulando perfis. O e-mail reforça que o perfil anterior continua ativo.
- Quando o broker RabbitMQ estiver indisponível, o e-mail cai em **fallback SMTP inline** automaticamente — a notificação nunca é perdida, mesmo sem fila.

### Backend
- 16 cenários cobertos (lista abaixo). Cada um tem in-app (persistido) + e-mail (fila ou SMTP).
- Fila de e-mails: exchange `emails` (topic) + queue `emails.send` + DLQ `emails.send.dlq` + retry com backoff (TTL 30s) até `MAX_DELIVERY_ATTEMPTS` (5). Padrão reaproveitado de `payment-effects.consumer`.
- `EmailQueuePublisher.publishSend()` (em `src/messaging/email-queue.publisher.ts`) é o único ponto de envio de e-mail assíncrono. Tenta RabbitMQ; se falhar, faz fallback SMTP inline via `EmailService.sendTemplateBySlug`.
- `EmailConsumer` (em `src/messaging/email.consumer.ts`) é o `@RabbitSubscribe` da fila `emails.send` — renderiza template (banco primeiro, hardcoded fallback) e envia via SMTP (Nodemailer + AWS SES).
- `UserNotificationService` (em `src/api/notifications/user-notification.service.ts`) concentra os 6 listeners de domínio do usuário (`payment.confirmed → INVESTMENT`, `payment.confirmed → SUBSCRIPTION`, `user.activated`, `user.suspended`, `kyc.user.decided → APPROVED`).
- `StartupNotificationService` cobre os 9 eventos do fluxo da startup (já documentados em `[Notificações ao founder em decisões admin]`).
- `RepassesNotificationService` cobre os 6 eventos do fluxo de repasses (in-app + e-mail).
- LGPD: nenhum PII (CPF, e-mail pessoal, telefone) em logs ou payloads WS. Mensagens de notificação podem conter PII do destinatário (ex: nome de startup) — é conteúdo da notificação, não log.
- Templates de e-mail: 14 hardcoded em `src/email/templates/` (S34 + Sprint de Notificações). Slug canônico + alias de retro-compat (`fase-aprovada`/`phase-approved`, `compra-tokens`/`token-purchase`).

### Frontend
- `<NotificationCard>` renderiza descrição com `whitespace-pre-wrap break-words` (Sprint de Notificações — central).
- Filtros disponíveis na UI: `all`, `investments`, `security`, `subscriptions`, `repasses`, `general`.
- `notificationsPageQueryOptions` (em `~/lib/queries.ts`) envia `?types=plan_purchased,plan_added` (CSV) quando o filtro cobre múltiplos tipos.

### Cenários cobertos (16)

| # | Evento de domínio | In-app (title) | E-mail (slug) |
|---|---|---|---|
| 1 | `payment.confirmed → SUBSCRIPTION` (1ª assinatura) | "Novo perfil ativado" | `plan-purchased` |
| 2 | `payment.confirmed → SUBSCRIPTION` (assinatura adicional coexistindo) | "Perfil adicional ativado" | `plan-added` |
| 3 | `user.activated` (admin ativa) | "Conta aprovada" | `user-approved` |
| 4 | `user.suspended` (admin desativa) | "Conta suspensa" + motivo | `user-suspended` |
| 5 | `payment.confirmed → INVESTMENT` | "Compra de tokens confirmada" + nome startup | `compra-tokens` |
| 6 | `startup.payment.confirmed` (reserva / taxa) | "Pagamento confirmado!" | `startup-pagamento-confirmado` |
| 7 | `startup.stage1.completed` (criação da startup) | 3 in-app ("Startup criada", "Próximo passo", "Pendência financeira") | `startup-etapa1-concluida` |
| 8 | `startup.phase_approved` (Fase 1) | "Fase 1 aprovada" + próximo passo | `fase-aprovada` |
| 9 | `startup.stage2.completed` (envio da Fase 2) | "Fase 2 concluída: cadastro enviado" | `startup-etapa2-concluida` |
| 10 | `startup.phase_approved` (Fase 2) | "Fase 2 aprovada" + próximo passo | `fase-aprovada` |
| 11 | `startup.stage3.completed` (Fase 3) | 2 in-app ("Quase lá", "Pendência Taxa de Compliance") | `startup-etapa3-concluida` + `startup-pagamento-confirmado` |
| 12 | `startup.phase_approved` (Fase 3) | "Fase 3 aprovada" + próximo passo | `fase-aprovada` |
| 13 | `startup.approved` (gate final) | "Startup aprovada!" + publicar | `startup-aprovada` |
| 14 | `startup.rejected` (gate final) | "Ajustes solicitados pelo Compliance" | `startup-rejeitada` |
| 15 | `startup.document.rejected` (documento individual) | "Documento rejeitado" | `startup-documento-rejeitado` |
| 16 | `kyc.user.decided → APPROVED` | "KYC aprovado" | `kyc-approved` |

#### Repasses (6 cenários adicionais in-app + e-mail)

| Evento | In-app (title) | E-mail (slug) |
|---|---|---|
| `installment.requested` | "Solicitação de parcela enviada" | `parcela-solicitada` (financeiro) |
| `installment.approved` | "Parcela aprovada" | `parcela-aprovada` (founder) |
| `installment.rejected` | "Parcela rejeitada" + motivo | `parcela-rejeitada` (founder) |
| `installment.completed` | "Parcela depositada" | `parcela-depositada` (founder) |
| `repasse.configured` | "Repasse configurado" | `repasse-configurado` (founder) |
| `repasse.concluded` | "Repasse concluído" | `repasse-concluido` (founder) |

### Anti-patterns
- ❌ Disparar in-app e e-mail em paralelo (`Promise.all` que pode falhar a ordem) — usar `await notificationsService.create(...)` ANTES de `dispatchEmail(...)`.
- ❌ Concatenar strings de descrição sem `\n\n` entre parágrafos — usar `buildMultilineDescription()`.
- ❌ Bloquear o request do usuário com chamada SMTP síncrona — sempre via fila (com fallback inline).
- ❌ Escrever PII (CPF, e-mail pessoal, telefone) em logs do publisher/consumer.

---

## [KYC] — Aprovação/Rejeição sincroniza sessão do usuário (BUG-FT-002)

### Geral
- Quando o admin aprova/rejeita/revoga um documento KYC em `/admin/kyc`, **todas as sessões Redis ativas** dos donos do `KYCProfile` devem ter o snapshot do perfil atualizado imediatamente.
- Sem isso, `/users/me` continuaria retornando o status antigo (cacheado no momento do upload) e o `/profile` mostraria "pendente de aprovação" mesmo após o admin ter aprovado.

### Backend
- `AdminService.decideKycUser` chama `refreshKycOwnersSessions(kycProfileId)` após o `$transaction` que atualiza o `KYCProfile.status`.
- `refreshKycOwnersSessions` faz `findMany` em `User` (por `avatar_id`/`comprovante_id`/`documento_id`/`biofacial_id`), relê o profile fresco do banco, e chama `SessionService.refreshUserProfile(userId, pickPublicProfilePayload(profile))` para cada dono.
- Após sincronizar a sessão, emite o evento de domínio `kyc.user.decided` (`src/api/admin/events/kyc-events.ts`) por dono — payload LGPD-safe `{ userId, decision, kycStatus }`. Dedup por `Set`; fallback via `cleanupOwnerId` para REJECTED/NEEDS_RESUBMISSION, onde o `KYCProfile` é deletado e as FKs do user zeradas (o `findMany` não encontraria o dono). O `NotificationsGateway.onKycDecided` relaya como `kyc.decided` para a sala `user:{userId}`.
- `SessionService.refreshUserProfile` usa SCAN+Lua para atualizar atomicamente todas as sessões do user (preserva outras abas/dispositivos).
- Falha de Redis/sessão/emit é best-effort: logada mas não propaga — próximo `/users/me` hidrata do banco.

### Frontend
- `profile-hero.tsx#kycCount` considera KYC completo quando `user.avatar.status === 'APPROVED'` E `user.documento.status === 'APPROVED'` E `user.biofacial.status === 'APPROVED'` E `user.comprovante.status === 'APPROVED'` (todos 4).
- **Realtime (sem reload):** `useKycRealtime()` (montado no `top-navbar.tsx`) escuta `kyc.decided` no socket único e faz `refetchQueries(['me'])` + invalida `['kyc']`/`['admin-kyc']`. Assim, quando o admin aprova/rejeita, o `/profile` reflete o novo status em tempo real. O fallback de reconciliação (focus/visibilitychange) cobre o caso de o push se perder.

## [KYC] — Telemetria de prova de vida (liveness)

### Geral
- Ao enviar a selfie biofacial (fluxo de liveness), o cliente captura sinais agregados (piscadas, amplitude yaw/pitch, movimento de landmarks, óculos, instruções sorteadas, motivos de rejeição) que são persistidos como **auditoria** — apoio à decisão do Compliance, nunca aprovação automática.
- A telemetria **não** contém template biométrico (isso é a Fase 5 — modelo `FaceBiometric`). São apenas métricas derivadas.

### Backend
- Modelo `LivenessTelemetry` (migration `20261002000000_add_liveness_telemetry`) vinculado a `User` (`onDelete: Cascade`) e opcionalmente ao `kycProfileId` (upload biofacial).
- Endpoint `POST /users/me/liveness-telemetry` (`LivenessTelemetryController`, guard `AuthGuard`). O user-agent é guardado apenas como **hash SHA-256** (LGPD: nunca em texto livre); métricas nunca são logadas com PII.
- O detalhe KYC (`AdminService.getUserKycDetail`) devolve `livenessTelemetry` = a telemetria mais recente do usuário.

### Frontend
- `profile-documents.tsx` envia a telemetria via BFF `POST /api/users/me/liveness-telemetry` **após** o upload do biofacial, em modo *fire-and-forget* (falha não bloqueia o KYC).
- `/admin/kyc?userId=` exibe o painel `AdminKycLivenessTelemetry` no aside, com status (aprovada/rejeitada), piscadas, óculos, movimento, amplitude de pose, duração e instruções.

## [KYC] — Desafios ativos e anti-injeção (liveness)

### Geral
- Os desafios da prova de vida são **sorteados aleatoriamente** de um catálogo (pose, piscar, abrir boca, sorrir, encher bochechas) — gestos que dificultam deepfakes em tempo real (princípio DF-CAPTCHA). O **tempo de resposta** por desafio é medido e registrado.
- Sinais de **câmera virtual/injeção** são heurísticos e servem para **auditoria do Compliance** — nunca bloqueiam o usuário automaticamente no MVP (evita falso positivo com drivers legítimos).

### Backend
- `LivenessTelemetry` ganhou `challengeResponseMs` (Json), `injectionSuspicious` (Boolean) e `injectionReasons` (Json). Migrations `20261002010000` e `20261002020000`.

### Frontend
- `liveness/challenges.ts`: catálogo + detecção pura por blendshapes (jawOpen/mouthSmile/cheekPuff). `liveness/injection-guard.ts`: heurística por label/deviceId/framerate do `MediaStreamTrack`.
- O painel admin exibe o tempo de resposta ao lado de cada desafio e um **banner de alerta** quando há suspeita de injeção.

## [KYC] — Template biométrico facial (FaceBiometric)

### Geral
- O template biométrico (embedding facial) é **dado sensível (LGPD Art. 11)**: **nunca** é armazenado em texto plano e só é gerado com **consentimento válido** (`User.biofacialConsentAt`).
- A extração do embedding ocorre **no servidor** (anti-tamper), a partir do arquivo biofacial real — nunca confiando num vetor enviado pelo cliente.
- Na **revogação** do consentimento, o template é **purgado** imediatamente (Art. 18 IX).

### Backend
- Modelo `FaceBiometric` (1:1 com `User`, migration `20261002030000`): `templateEnc`+`iv`+`authTag` (AES-256-GCM via `TemplateCipherService`, chave em `BIOMETRIC_TEMPLATE_KEY` — em produção deve vir de KMS/Vault), `modelVersion`, `dim`, `templateHash` (SHA-256 irreversível), `consentVersion`.
- `FaceBiometricService.enroll` só grava com consentimento + extrator habilitado; `purge` é chamado por `BiometricConsentController.revokeConsent`.
- Extrator plugável via token `FACE_EMBEDDER`: default `NoopFaceEmbedder` (desabilitado) até o `OnnxArcFaceEmbedder` (ArcFace/ONNX) ser hospedado.

## [KYC] — Match facial selfie × documento (FaceMatchService)

### Geral
- A comparação selfie×documento é **ferramenta interna de apoio ao Compliance** (área de admin): read-only, exibida no painel de revisão, **nunca aprova automaticamente** (MVP).
- Restringir a tela ao admin **não isenta a LGPD**: o tratamento do template biométrico (consentimento, cifra, purga) continua obrigatório.

### Backend
- `FaceMatchService.compareToDocument(userId, docBuffer)` usa **cosine similarity** entre o template da selfie (`FaceBiometric`) e o embedding extraído do documento. Faixas: `match` (≥ threshold), `review` (zona cinzenta), `no_match`.
- Threshold calibrável via `FACE_MATCH_THRESHOLD` (default 0.38) e `FACE_MATCH_REVIEW_MARGIN` (0.08). **Deve ser medido no fluxo real (FAR/FRR)** antes de virar decisão forte.
- `AdminService.getUserKycDetail` expõe `faceMatch` (status leve). Enquanto o extrator for `Noop`, retorna `available:false` com `reason`.

### Frontend
- `/admin/kyc?userId=` renderiza a faixa + score + corte no painel `FaceMatchRow`, ou o motivo de indisponibilidade.

---

## [Depoimentos e Opiniões] — Avaliações de Startups e Plataforma

### Geral
- "O Que Dizem" (Depoimentos) representam a opinião dos usuários sobre a experiência na plataforma IselfToken.
- "Opiniões das Startups" (`StartupOpinion`) representam análises e depoimentos de investidores sobre startups que possuem captação concluída (`status: 'FUNDED'` ou `'CLOSED'`).
- Todo autor de depoimento ou opinião de startup no seed é cadastrado como um usuário real no banco de dados (`User`), com avatar salvo na infraestrutura de uploads/storage (`KYCProfile` / `./uploads/avatars`).

### Backend
- Seed `seed-opinions.ts` gera automaticamente as contas de `User` dos autores (role `USER`), avatares vinculados e arquivos físicos nas pastas de upload (`storage/image/seed` e `uploads/avatars`).
- Opiniões de startups filtram prioritariamente startups com campanhas encerradas/concluídas (`FUNDED` / `CLOSED`).

---

## [Banco de Dados] — Provedor Exclusivo SQLite

### Geral
- O banco de dados da aplicação é 100% **SQLite** (`prisma/dev.db`).
- O schema mestre utilizado pelo Prisma é o `prisma/schema.sqlite.prisma`.

### Backend
- O adapter utilizado pelo Prisma 7 é o `@prisma/adapter-better-sqlite3`.
- O comando `pnpm run prisma:setup` compila e sincroniza automaticamente o cliente Prisma para SQLite.
- **REGRA CRÍTICA (Sprint S34 — bug `/admin/startups`):** o argumento Prisma `mode: 'insensitive'` em filtros `contains`/`startsWith`/`endsWith` **NÃO é suportado** pelo `@prisma/adapter-better-sqlite3` (Prisma 7.x). Lança `Unknown argument 'mode'. Did you mean 'lte'?` em runtime e devolve `500` no endpoint, embora o tipo TypeScript (`QueryMode.insensitive`) exista. Como o operador `LIKE` do SQLite já é case-insensitive para ASCII por padrão, **NUNCA usar `mode: 'insensitive'`** em queries Prisma + driver adapter SQLite — basta `contains: value`. Aplica-se a todos os 9 services de listagem (startups, users, campaigns, payments, plans, subscriptions, transactions, admin).
- Toda busca textual (`search`) deve aplicar `.trim()` defensivo antes de montar o `where`, evitando mismatch quando o usuário digitar espaço acidental à frente do termo (ex.: `?search=+FintechPro` → decodificado como `" FintechPro"`).

---

## [Storage e Uploads] — Buckets e Armazenamento de Arquivos

### Geral
- O diretório `storage/` simula os buckets de Object Storage (S3 / RustFS) em ambiente local.
- O bucket `storage/comprovante/` é reservado **exclusivamente para comprovantes de transações financeiras** (`Payment.manualComprovanteKey`, repasses e confirmações de pagamentos/transferências).
- Documentos cadastrais e de KYC (como comprovante de residência, documentos de identidade, contratos sociais e certidões) são armazenados obrigatoriamente no bucket `storage/document/`.
- Imagens de perfil, logos e banners utilizam o bucket `storage/image/` e suas variantes de resolução (`image-sm`, `image-md`).
- O upload é processado de forma síncrona: a resposta só ocorre depois da persistência do original e das variantes aplicáveis.
- URLs de upload são públicas e estáveis, sem expiração ou assinatura temporária.

### Backend
- Para imagens, o original é salvo em `image` preservando o formato recebido; a versão média é salva em `image-md` no mesmo formato (PNG→PNG, JPEG→JPEG, WebP→WebP ou GIF→GIF); a pequena é salva em `image-sm` sempre como WebP.
- O registro `Upload` mantém o original em `url`, a versão média em `url_md` e a versão otimizada para web em `url_web`.
- Documentos não sofrem redução: a URL do original é repetida em `url`, `url_md` e `url_web`.
- Vídeos só recebem variantes se houver transcodificação real disponível no ambiente; nunca se deve copiar o original para simular uma variante.
- O processamento de uploads não publica jobs nem depende de RabbitMQ/Redis; esses serviços permanecem reservados aos domínios de pagamentos e sessão.
- O `Upload.id` permanece como chave interna; o `Upload.publicId` é o UUID exposto em contratos públicos.

### Frontend
- Componentes que exibem uploads devem priorizar `url_web`, usando `url_md` e `url` apenas como fallback para registros legados ou variantes ausentes.
- O frontend não deve aguardar polling de status para um upload novo: o contrato síncrono já retorna o arquivo pronto ou um erro terminal.

---

## [Termo de Adesão Digital] — Geração, aceite e assinatura

### Geral
- O Termo de Adesão Digital é um documento personalizado para o usuário dono da startup e deve ser vinculado simultaneamente ao usuário signatário e à startup.
- O usuário deve abrir e ler o documento completo antes de poder aceitar e assinar o termo.
- O aceite ocorre por checkbox explícito. O usuário somente pode marcar o checkbox e salvar depois que a leitura do documento tiver sido registrada.
- O PDF gerado deve conter, no mínimo, o nome do usuário, o documento de identificação do usuário, o nome da startup e o CNPJ da startup.
- Cada usuário deve possuir um certificado digital individual para a assinatura do termo, criado depois do cadastro e do preenchimento dos dados de identificação.
- O PDF assinado deve apresentar um selo contendo o nome do usuário, o documento de identificação, a data e a hora da assinatura.
- Depois da assinatura, o termo deve aparecer como assinado e ficar disponível para download.
- O documento assinado e a versão do modelo usada na geração devem permanecer imutáveis para preservar o histórico da assinatura.

### Backend
- O sistema deve gerar o PDF a partir da versão publicada do modelo administrativo do Termo de Adesão Digital.
- O modelo deve aceitar somente variáveis autorizadas e conhecidas pelo sistema, com validação de todas as variáveis antes da geração.
- Variáveis mínimas: `{{usuario.nome}}`, `{{usuario.documento}}`, `{{startup.nome}}`, `{{startup.razao_social}}`, `{{startup.cnpj}}`, `{{assinatura.nome}}`, `{{assinatura.documento}}`, `{{assinatura.data}}`, `{{assinatura.hora}}`, `{{assinatura.serial_certificado}}` e `{{termo.versao}}`.
- Ao salvar o aceite válido do dono da startup, o backend deve montar o documento personalizado, gerar o PDF e assiná-lo com o certificado digital individual do usuário.
- O selo deve registrar os dados do signatário e o momento da assinatura; a aplicação deve manter também os metadados técnicos necessários para verificar a assinatura.
- O PDF assinado deve ser persistido no Object Storage S3/RustFS, no bucket de documentos (`document/` no ambiente local), e seu registro deve conter o vínculo com o usuário, a startup, o modelo/versão e o certificado utilizado.
- A atualização do modelo administrativo não pode alterar PDFs já assinados; cada assinatura deve conservar a versão do modelo que originou o documento.
- A geração, o aceite, a assinatura, o download e as alterações do modelo devem ser auditáveis, sem registrar dados sensíveis em texto livre nos logs.

### Frontend
- A aba `/founder/startups/:id/edit/documentos` deve exibir o Termo de Adesão Digital com ação para abrir e ler o documento completo.
- O checkbox de aceite/assinatura deve permanecer bloqueado até a leitura ser registrada; o salvamento deve exigir o checkbox marcado.
- Após a conclusão, a tela deve mostrar o status "Termo assinado", a data/hora e a ação "Baixar termo assinado".
- Deve existir uma página administrativa exclusiva para editar somente o modelo do Termo de Adesão Digital, com editor de texto formatado e catálogo de variáveis autorizadas.
- O editor administrativo deve permitir publicar uma nova versão do modelo sem modificar documentos já assinados.

---

## [Startup] — Taxa de Compliance, Serviços Extras e Aprovação Documental

### Geral
- Todo documento enviado pelo founder, incluindo documentos obrigatórios, condicionais, recomendados e `OUTRO`, deve ser analisado individualmente pelo Compliance.
- Cada documento possui um ciclo de revisão: `PENDING_REVIEW` → `APPROVED` ou `REJECTED`.
- A opção "Não se aplica" também exige análise do Compliance; somente uma opção aceita libera a categoria correspondente.
- Documento rejeitado deve ser substituído ou reenviado pelo founder e retornar para `PENDING_REVIEW`.
- A startup só pode ser liberada pelo Compliance quando o cadastro estiver completo, todos os documentos enviados estiverem aprovados ou suas opções "Não se aplica" estiverem aceitas, o Termo de Adesão Digital estiver assinado e a Taxa de Compliance estiver paga.
- O serviço de Aprovação Rápida (Fast Track) não substitui a análise do Compliance e não dispensa documentos, aceite do termo ou pagamento da Taxa de Compliance.

### Backend
- Quando as seções obrigatórias forem concluídas, a startup deve entrar em `AWAITING_COMPLIANCE_FEE` e o dashboard deve liberar a página de Taxas e Serviços.
- A Taxa de Compliance é obrigatória para enviar a startup à análise; seu valor deve vir da configuração administrativa e não pode ser fixado no frontend.
- Depois da confirmação do pagamento da Taxa de Compliance, a startup pode mudar para `PENDING_APPROVAL` e ser encaminhada ao Compliance.
- A decisão do Compliance deve considerar a startup, o usuário proprietário, os documentos individuais, as marcações "Não se aplica", o Termo de Adesão Digital e o pagamento da taxa.
- A Aprovação Rápida selecionada e paga durante a reserva deve ser reconhecida como `PAID` no painel de Taxas e Serviços e não pode ser cobrada novamente.
- Se a Aprovação Rápida não foi paga durante a reserva, o founder pode contratá-la posteriormente na página de Taxas e Serviços.
- O pagamento da Aprovação Rápida deve ser vinculado à startup e ao serviço contratado, com estados mínimos `PENDING`, `PAID`, `FAILED` e `CANCELED`.
- A página deve suportar serviços extras configuráveis, cada um com nome, descrição, valor, status e cobrança própria.
- A geração da cobrança e a confirmação do pagamento devem ser idempotentes para impedir cobranças duplicadas, especialmente quando a Aprovação Rápida já foi paga na reserva.
- Toda alteração de valor, contratação, pagamento, rejeição, aprovação e decisão deve gerar registro de auditoria sem expor dados sensíveis em texto livre.
- **Notificações ao founder em decisões admin (Sprint S34 — bug reportado):** `AdminService.updateStartupStatus` (PUT `/admin/startups/:id/status`) DEVE emitir o evento `startup.rejected` quando o status é `REJECTED`, com payload `{ startupId, phase, reason }`. O listener `StartupNotificationService.onStartupRejected` (`@OnEvent('startup.rejected')`) consome esse evento para enviar in-app + e-mail ao founder. Sem essa emissão, o founder fica sem feedback da rejeição e não sabe que precisa corrigir pendências. Mesmo padrão de `startup.approved` (Fase 3) e `startup.phase_approved` (gate parcial).
- **BUG-FT-007 — Selos automáticos na aprovação da Fase 3** (`AdminService.updateStartupStatus` com `phase=3` + `status='APPROVED'`): o sistema auto-atribui 3 selos via `SealsService`, todos best-effort (`Promise.catch + logger.warn` — uma falha em qualquer um não bloqueia a aprovação):
  1. `startup_verificada` (VERIFICATION) — sempre que aprovado.
  2. Selo de estágio (STAGE: `ideacao` / `mvp` / `tracao` / `operacao` / `breakeven` / `acelerada`) — baseado em `Startup.estagio`. Aplicado **só na Fase 3** (ou caso legado sem `options.phase`); Fases 1/2 não disparam porque o founder pode ajustar o estágio entre Fase 2 e Fase 3. `autoAssignStage` remove o STAGE anterior antes de atribuir o novo (1 STAGE por startup). Mapeamento tolerante: aceita `ideação`/`tração`/`operação`/`break-even` etc. (ver `seals.service.ts:20-32`).
  3. `lancamento` (PARTNERSHIP, display **"Lançamento"**) — slug `lancamento`, ícone `/icons/lancamento.png`. Aplicado **só quando** `campaignOpenResult.fastDeploy === true` **E** `campaignOpenResult.ok === true` (campanha abriu OPEN imediatamente). Founder sem FAST_DEPLOY → publicação agendada +24h → sem selo. `autoAssignFastDeploy` é idempotente e tolera selo ausente (best-effort).
  Detalhes completos em `prisma/seed.ts:1086` e `seals.service.ts:296-329`.

### Notificações ao founder por fase (Sprint BUG-FT-004)
- **Terminologia canônica = "Fase"** (1/2/3). Toda comunicação textual com o founder
  (in-app, e-mail, slug do banco) deve usar "Fase"; "Etapa" é terminologia de
  wizard legada e está sendo gradualmente removida.
- `startup.stage1.completed` (Fase 1 — Cadastro + Reserva): 3 notificações in-app
  (startup criada, próximo passo, pendência reserva do token) + e-mail
  `startup-etapa1-concluida`.
- `startup.stage2.completed` (Fase 2 — Cadastro completo, docs + termo): 1
  notificação in-app ("Fase 2 concluída: cadastro enviado") + e-mail
  `startup-etapa2-concluida`. **NÃO** inclui mais a pendência da Taxa de
  Compliance — ela migrou para a Fase 3.
- `startup.stage3.completed` (Fase 3 — Detalhes de Captação preenchidos,
  campanha DRAFT): 2 notificações in-app ("Quase lá: captação pronta para
  validação" + "Pendência financeira: Taxa de Compliance") + 2 e-mails
  (`startup-etapa3-concluida` + `startup-pagamento-confirmado` com
  `purposeLabel: 'O pagamento da Taxa de Compliance'`).
- `startup.payment.confirmed`: notificação in-app ("Pagamento confirmado!") +
  e-mail `startup-pagamento-confirmado`. O e-mail usa o campo `purposeLabel`
  (NÃO `purpose`) no payload para casar com o template
  `startupPagamentoConfirmadoTemplate` — bug histórico causava
  `escapeHtml(undefined)` → string literal `'undefined'` no corpo do e-mail.
- `POST /startup/:id/complete-stage3` (founder logado) emite o evento
  `startup.stage3.completed`. Sem este endpoint, o listener
  `StartupNotificationService.onStage3Completed` ficava órfão.

### Frontend
- Quando o cadastro estiver incompleto, o dashboard deve indicar as pendências e não liberar a página de Taxas e Serviços para pagamento de liberação.
- Quando o cadastro estiver completo, o dashboard deve exibir a ação para acessar a página de Taxas e Serviços, planejada como `/founder/startups/:id/taxas-servicos`.
- A página deve exibir a Taxa de Compliance como obrigatória, com valor da configuração administrativa, status do pagamento e orientação sobre o bloqueio existente.
- Antes de a Taxa de Compliance estar `PAID`, a interface deve mostrar que a análise está aguardando pagamento e não deve liberar nenhuma ação que indique início da revisão pelo Compliance.
- Se a Aprovação Rápida foi paga junto com a reserva, a interface deve mostrar "Pago" e ocultar uma nova opção de contratação/cobrança.
- Se a Aprovação Rápida não foi paga, a interface deve mostrar o valor configurado e a opção para contratar pelo checkout.
- Serviços extras devem mostrar descrição, valor, status e CTA de contratação quando aplicável.
- Após a Taxa de Compliance ficar `PAID`, a interface deve indicar que a startup foi enviada para análise; após a decisão, deve mostrar aprovação ou rejeição e suas pendências.
- O frontend deve usar o status retornado pelo backend apenas para exibição; autorização, cobrança e liberação devem ser revalidadas no backend.

---

## [Autenticação] — Login e Sessão

### Geral
- Login exige email + senha + 2FA (código por email)
- Sessão expira se inativa (cookie 35 min, Redis 7 dias)
- Logout invalida cookie e sessão Redis simultaneamente
- Dados privados, pagamentos, assinaturas, investimentos e documentos nunca podem ser retornados ou alterados por outra conta autenticada.

### Backend
- Token JWT armazenado em cookie HTTP-only (`sameSite: strict`)
- `JWT_SECRET` é obrigatório, deve ter no mínimo 32 caracteres e não pode usar placeholders conhecidos; a aplicação deve falhar no bootstrap quando o valor estiver ausente, vazio ou inválido.
- `WEBHOOK_HASH_SECRET` é um segredo independente, obrigatório e com no mínimo 32 caracteres para anonimização HMAC de PII em logs de webhook; não deve reutilizar o segredo de autenticação ou o HMAC de callbacks EFI.
- Em produção, `JWT_SECRET` deve ser injetado por mecanismo seguro de secrets e sua rotação requer procedimento operacional coordenado; valores reais não devem ser versionados em exemplos ou scripts de provisionamento.
- Toda consulta ou mutação de recurso privado deve filtrar pelo usuário da sessão (`request.user.id`) ou exigir `AdminGuard`; IDs enviados pelo cliente não definem o proprietário.
- Session cacheada em Redis (`session:{userId}`) para evitar query no banco a cada request
- Endpoint `POST /auth/logout` limpa cookie + remove sessão Redis
- Endpoint `GET /auth/check-af2` verifica status do 2FA

### Frontend
- Tokens nunca ficam em localStorage (somente cookies HTTP-only)
- Ao login, cadastro ou logout, o cache TanStack Query deve ser limpo na fronteira de identidade antes de renderizar a próxima conta; queries privadas não podem sobreviver à troca de usuário.
- Auth state derivado de TanStack Query (`useUser()`) — sem AuthContext
- Layout loader faz gating server-side (redirect 302 para `/login` ou `/2fa`)
- Mutations de login/register/logout invalidam queries `["me"]` e `["auth-status"]`

---

## [E-mail] — Cópias operacionais via EMAIL_CC_LIST

### Geral
- Até nova orientação operacional, o `EMAIL_CC_LIST` deve permanecer configurado e ser aplicado aos e-mails transacionais, incluindo os códigos 2FA.
- A variável usa uma lista CSV de endereços e a ordem informada deve ser preservada no envio das cópias.
- O destinatário principal é enviado primeiro; os endereços de `EMAIL_CC_LIST` são enviados em seguida, na mesma ordem configurada.

### Backend
- `EMAIL_CC_LIST` é carregado pelo `ConfigService` durante o bootstrap do `EmailService`; alterações na variável exigem reinício do processo backend para entrarem em vigor.
- Endereços são normalizados, deduplicados e não são adicionados novamente quando coincidem com o destinatário principal.
- Valores vazios após a normalização não devem gerar destinatários adicionais; a validação do formato dos endereços deve ocorrer na configuração do ambiente.
- A aceitação SMTP (`250`) confirma somente a submissão ao relay; a entrega posterior deve ser confirmada pelos eventos do relay/SES.

### Frontend
- O frontend não define, altera ou expõe `EMAIL_CC_LIST`; a distribuição de cópias é responsabilidade exclusiva da configuração do backend.

## [Marketplace] — Detalhe autenticado e preview do fundador

### Geral
- O detalhe autenticado de uma oportunidade pode ser consultado por qualquer usuário com sessão válida para permitir o fluxo de descoberta antes do primeiro investimento.
- O detalhe privado por slug é uma superfície owner/admin e não pode ser usado por fundador de outra startup para consultar dados de outra conta.

### Backend
- `GET /startup/marketplace/private/:slug` exige `AuthGuard` e permite somente o founder cujo `Startup.founderId` corresponde à sessão ou os papéis `ADMIN`, `FINANCEIRO` e `COMPLIANCE`.
- O endpoint autenticado de oportunidade deve retornar apenas os campos necessários para análise e checkout, sem `id` interno da startup, dados bancários, email, CNPJ ou documentos do titular.
- A autorização não pode depender do slug, de parâmetros do frontend ou do BFF; a identidade deve vir de `request.user` e a consulta deve aplicar o filtro de owner no backend.

### Frontend
- O BFF de detalhe por slug usa a oportunidade autenticada para usuários logados e reserva o endpoint owner/admin para o preview do fundador (`view=owner`), sempre com revalidação server-side.

## [Marketplace] — Pinning manual (ADMIN/COMPLIANCE)

### Geral
- ADMIN ou COMPLIANCE podem **pinar manualmente até 3 startups** simultâneas para destaque no `/marketplace/featured`, com motivo auditável de no mínimo 20 caracteres.
- O pino é uma **decisão editorial explícita**, separada do score automático: o fundador consegue entender olhando o painel dele por que está em destaque.
- Toda ação de pin/unpin gera entrada em `AuditLog` com `action='PIN_STARTUP'` ou `'UNPIN_STARTUP'`, contendo `actorId`, `IP`, `userAgent` e `newValue`.

### Backend
- 4ª tentativa de pino retorna `409 MAX_PINNED_EXCEEDED` (validado no service com `count(pinned) >= 3` antes do insert).
- Motivo < 20 caracteres retorna `400`.
- `DELETE /admin/startups/:id/pin` remove o pino mas preserva `manuallyPinnedReason` no `AuditLog` (LGPD: rastro da decisão editorial).
- Cache Redis `marketplace:featured:v1` é invalidado em `POST`/`DELETE` para refresh em ≤ 5min sem intervenção manual.
- `Startup.manuallyPinnedBy` referencia `User.id` com `ON DELETE SET NULL` — se o admin for removido, o pino permanece mas perde o autor.

### Frontend
- Tela `/admin/marketplace` mostra 3 slots visuais (vazio/preenchido) + busca por nome/slug.
- Modal de pin exige motivo ≥ 20 chars (validação client + server).
- Tabela de pinos atuais com botão "Despinear".
- Bloqueio client-side quando 3 já preenchidos (toast explicativo).
- Card pinned no frontend exibe "Em destaque por: <motivo>"; auto-rank exibe "Score alto".

## [Perfil] — Data de Nascimento

### Geral
- A data de nascimento representa uma data civil, sem horário ou fuso horário; o dia informado pelo usuário deve ser preservado na leitura e na exibição.

### Backend
- O valor pode ser persistido como `DateTime` por compatibilidade com o schema atual, mas não deve sofrer alteração de dia por conversão de fuso horário.

### Frontend
- Campos `input type="date"` devem enviar e exibir o valor no formato civil `YYYY-MM-DD`/`DD/MM/YYYY`, formatando o ISO em UTC quando a origem for um `DateTime`.
- O avatar deve ser enviado exclusivamente pelo tile `Avatar` da seção `Documentos & Verificação`; o avatar exibido no cabeçalho do perfil é apenas visual e não deve abrir fluxo de upload.

## [Captação] — Rodadas de Tokenização

### Geral
- Uma startup pode ter NO MÁXIMO uma campanha ativa (status OPEN) a qualquer momento
- Nova rodada só é permitida quando a anterior foi 100% vendida + 3 meses de carência (Regra B05)
- Tokens JAMAIS são gerados antes da confirmação do pagamento da taxa de reserva
- Tokens JAMAIS são gerados antes da aprovação do Compliance
- A soma das alocações de recursos deve ser EXATAMENTE 100%
- **Cap por categoria na alocação de recursos**: a categoria `FUNDADOR` (pró-labore, salário ou distribuição do time fundador) **NÃO pode ultrapassar 20%** do total captado. Garante que a maior parte dos recursos seja investida no crescimento do negócio (desenvolvimento, comercial, marketing, infraestrutura, jurídico, reserva) e protege o investidor de captações em que o founder se apropriaria de mais de 1/5 do montante sem entrega de produto/resultado. Valores acima de 20% exigem aprovação explícita do Compliance via solicitação formal.
- Equity oferecido: mínimo de 5% e máximo de 20%, configuráveis via `campaign.equityMin`/`campaign.equityMax` (Admin/Financeiro/Compliance), sem permitir valores fora desse intervalo
- Meta de captação: mínimo e máximo globais configuráveis via `campaign.minTarget`/`campaign.maxTarget` (Admin/Financeiro/Compliance). Não há restrição por estágio.
- Valores padrão da plataforma: mínimo de R$ 300.000,00 e máximo de R$ 12.000.000,00. Esses limites são usados como fallback quando não há configuração vigente.
- Preços do token: base (`token.basePrice`, default R$ 200), reserva (`token.reservePrice`, default R$ 1) e venda (`token.salePrice`, default R$ 240) — todos configuráveis por Admin/Financeiro
- Taxa Fast Track: `token.fastTrackFee` — configurável por Admin/Financeiro
- Comissão de afiliado: opções configuráveis via `affiliate.commissionOptions` (Admin/Financeiro/Compliance); founder escolhe entre as opções definidas. A comissão é calculada sobre o **repasse à startup** (`quantity × preço base`), não sobre o total pago pelo investidor — ver §"[Investimento] — Split financeiro"
- **Congelamento da oferta após Compliance**: depois que a Taxa de Compliance estiver paga e a startup for aprovada pelo Admin/Compliance, os parâmetros da captação não podem mais ser alterados. Isso inclui meta, equity, valuation, preço/token, quantidade de tokens, recursos, tese, governança, retornos, benefícios e comissão de afiliados.
- Documentos CVM 88/2022 obrigatórios antes da aprovação
- Dados bancários de repasse devem ter titular = PJ (CNPJ) ou sócio registrado
- Alteração de dados sensíveis pós-aprovação requer DataChangeRequest ao Compliance

### Backend
- Snapshots financeiros (ADR-008) congelados na criação da campanha (imutáveis)
- Emissão de tokens via FOR UPDATE SKIP LOCKED (concorrência atômica, MySQL 8+)
- Cada token recebe hash SHA-256 único (UNIQUE constraint)
- TokenReservation com TTL para prevenção de oversell
- Auditoria CVM via CampaignOfferAuditLog (aceites de termos com IP/UA)
- Validação de limites dinâmicos via SystemConfig (9 chaves financeiras)
- Taxa de reserva: R$ 1,00 por token (default, configurável via `token.reservePrice`). Founder paga totalTokens × `token.reservePrice` (PaymentPurpose: TOKEN_RESERVATION). Preço de venda: `Campaign.tokenPrice` = `token.salePrice` (configurável por Admin/Financeiro). Preço base: `token.basePrice` (interno).
- Comissão de afiliado congelada por rodada (5% ou 10%)
- Alocações de recursos são públicas somente para campanhas publicadas (`OPEN`, `FUNDED` e `PAID_OUT`); campanhas não publicadas exigem leitura autenticada do founder owner ou de papel administrativo
- O detalhe público de campanha (`GET /campaigns/:id`) aceita somente `OPEN`, `FUNDED` e `PAID_OUT` e retorna projeção mínima; investimentos individuais, tokens, hashes, CNPJ, dados bancários, flags administrativas e snapshots financeiros ficam restritos aos contratos autenticados/administrativos
- **Validação do cap FUNDADOR ≤ 20%** em `CampaignResourceService.replaceAll` (`backendnode/src/api/campaigns/service/campaign-resource.service.ts`) — constante `MAX_FUNDADOR_PERCENTUAL = 20`. Fail-fast antes da transação, retornando HTTP 400 com código estruturado `FUNDADOR_PERCENTUAL_EXCEEDS_MAX`, `maxAllowed: 20` e `provided: <valor enviado>`. Replicado no frontend (vide §Frontend) para feedback imediato sem ida ao backend.

### Frontend
- O catálogo público pode exibir a composição de recursos somente quando a campanha estiver publicada
- Editores de fundador e painéis administrativos devem usar a leitura autenticada para campanhas `DRAFT`, `PAUSED` e `CLOSED`
- **Cap FUNDADOR ≤ 20%** enforçado em três camadas paralelas:
  1. Schema Zod (`MAX_FUNDADOR_PERCENTUAL = 20` exportado de `app/lib/captacao-shared.tsx`, `app/lib/round-distribution-schema.ts`, `app/lib/new-startup-schema.ts`) — mensagem de erro amigável ao submeter o formulário.
  2. Componente `RoundResourcesEditor` (`app/components/founder/round-resources-editor.tsx`) — input com `max={20}` no FUNDADOR + badge `(máx 20%)` ao lado do label + parágrafo de ajuda explicativo + `aria-describedby` ligando o input à ajuda para leitores de tela. O `onChange` clampa o valor no cap da categoria para evitar digitação acima do limite mesmo antes do Zod rodar.
  3. Validação cruzada redundante com o backend (`FUNDADOR_PERCENTUAL_EXCEEDS_MAX`).

---

## [Captação] — Rejeição da Etapa 3 (Detalhes de Captação) — Sprint S35

### Geral
- Quando o admin rejeita a Etapa 3 via `/admin/startups/:id/3` (`intent=reject-startup` + `phase=3` + `justification`), a startup inteira vai para `status=REJECTED` e a campanha ativa volta para `DRAFT`, permitindo nova edição.
- A justificativa do admin fica gravada em `startup_review_decisions` (última decisão da `phase=3`) e precisa ser exibida ao founder na próxima vez que ele abrir a página de captação.
- A ressubmissão usa o mesmo endpoint `POST /startup/:id/resubmit` que cobre as Etapas 1 e 2 — o critério é `startup.status === 'REJECTED'`, sem distinção de fase no backend.

### Backend
- `GET /startup/:id/captacao` (em `startup-extras.service.ts:getCaptacaoData`) carrega em paralelo (`Promise.all`) a última decisão da `phase=3` e anexa 3 campos ao payload do `campaign`:
  - `phase3Rejected: boolean` — `true` apenas quando a última decisão é `REJECTED`
  - `phase3RejectedJustification: string | null` — texto da justificativa do admin
  - `phase3RejectedAt: string | null` — `createdAt.toISOString()` da decisão
- A query da decisão tem `.catch(() => null)` (best-effort) — falha na tabela de auditoria NÃO quebra a página de captação; apenas o banner não aparece (campos null/false).
- `rejectedSnapshot` NÃO é exposto (dados internos de auditoria, exclusivos do admin).

### Frontend
- `/founder/startups/:id/captacao` renderiza o `CaptacaoRejectionBanner` (`app/components/founder/captacao-rejection-banner.tsx`) quando `campaign.phase3Rejected === true`.
- Banner visual: paleta rosa destrutiva (`border-rose-500/30 bg-rose-500/5`) para distinguir do banner âmbar genérico do `/edit` (que cobre fases 1/2).
- Conteúdo: ícone `AlertTriangle`, título "Etapa 3 rejeitada pela curadoria", subtítulo instrutivo, e blockquote com a justificativa do admin entre aspas + data formatada `DD/MM/YYYY HH:mm` (UTC, via `formatBRDateTime` em `app/lib/date-utils.ts`).
- CTA: botão "Ressubmeter para análise" chama `POST /api/startup/:id/resubmit` (mesmo handler do banner `/edit`), com toast success/error e `window.location.reload()`.
- Acessibilidade: `role="alert"` + `aria-live="polite"` no container, `data-testid="captacao-rejection-banner"` para testes E2E.

---

## [Taxonomia] — Categorias e Áreas de Atuação

### Geral
- Categorias e áreas de atuação são gerenciadas pelo Admin e alimentam os selects de cadastro e edição de startups.
- Uma categoria pode possuir várias áreas de atuação; cada área pertence a uma única categoria.

### Backend
- Os registros usam `ativo=false` quando removidos pelo Admin, preservando as referências das startups existentes.
- Apenas categorias e áreas ativas aparecem nos endpoints públicos usados pelos formulários.

### Frontend
- O cadastro e a edição exibem categoria e área em selects encadeados: a área depende da categoria selecionada.
- Uma categoria pode ter várias áreas selecionadas simultaneamente no multiselect; trocar a categoria limpa as áreas anteriores.

### Regra adicional — Multiárea e links oficiais
- O contrato novo usa `areaAtuacaoIds` (lista de IDs únicos) e retorna `areasAtuacao` resolvidas; `areaAtuacaoId` permanece apenas como compatibilidade legada.
- A lista de áreas é persistida em JSON no `Startup`; o backend valida que todas as áreas existem, estão ativas e pertencem à categoria escolhida.
- Instagram, X/Twitter e LinkedIn aceitam somente URLs HTTPS com hostname oficial da respectiva rede; identificadores `@usuario`, HTTP e domínios de terceiros são inválidos.

### Backend — Wizard checkout (`POST /payment/checkout-draft`)
- Endpoint consumido pelo wizard `/founder/startups/new` (BFF `/api/payment/startup-checkout` → `POST /payment/checkout-draft` em `payment.service.ts:createStartupCheckout`).
- **Aceita ambos os formatos** para evitar quebra do wizard (que envia `areaAtuacaoIds`) e de rascunhos legados em `StartupDraft.payload` (que ainda podem ter `areaAtuacaoId` singular):
  1. `payload.areaAtuacaoIds: number[]` (plural, contrato vigente) — preferido.
  2. `payload.areaAtuacaoId: number` (singular, legado) — fallback para drafts antigos.
- Validação dispara `BadRequestException("Categoria e área de atuação são obrigatórias.")` quando nenhum dos dois formatos estiver presente ou quando a categoria for inválida.
- Ao materializar a `Startup` em `processTokenReservationPayment`, persiste `areaAtuacaoId` (primeira área, coluna legacy) **e** `areas_atuacao` (lista completa, coluna JSON) — espelha o que `startup-crud.service.ts` já faz no `POST /startup` e `PATCH /startup/:id`.
- Testes em `payment.service.spec.ts`: `describe('createStartupCheckout — taxonomia multi-área')` (3 casos) + 2 casos em `processTokenReservationPayment`.

---

## [Investimento] — Split financeiro (Modelo B)

> Taxa da plataforma cobrada **do investidor por cima** do subtotal de tokens. A separação repasse-à-startup × receita-da-plataforma é **persistida no `Investment` na criação** e carimbada na confirmação do pagamento (`allocatedAt`, na mesma transação idempotente de `confirmInvestment`).

### Geral
- Fórmulas (exemplo: 10 tokens, venda R$ 240, base R$ 200, taxa 5%):
  - `tokenSubtotal = quantidade × preço de venda` → 10 × 240 = **R$ 2.400**
  - `platformFeeAmount = tokenSubtotal × platformFeePct` → **R$ 120**
  - `totalCharged = tokenSubtotal + platformFeeAmount` → **R$ 2.520** (valor do `Payment`)
  - `startupRepasseAmount = quantidade × preço base` → **R$ 2.000**
  - `platformSpreadAmount = tokenSubtotal − startupRepasseAmount` → **R$ 400**
  - `platformRevenueAmount = platformSpreadAmount + platformFeeAmount` → **R$ 520**
- O investidor sempre paga `totalCharged`; a startup recebe somente `startupRepasseAmount`. Spread + taxa + taxa de reserva + compliance + fast track são receita da plataforma.
- "Captado"/GMV exibido a founders e investidores usa o **repasse** (`startupRepasseAmount ?? amount`), não o total pago.
- Comissão de afiliado incide sobre `startupRepasseAmount` (decisão registrada — não sobre o GMV).
- **Estorno de investimento é sempre integral** (sem estorno parcial em `purpose = INVESTMENT`): reverte `Investment`, devolve tokens ao estoque e cancela a comissão de afiliado.
- Sem valor mínimo de investimento: a partir de 1 token. `minInvestment` permanece apenas como snapshot legado.

### Backend
- `Investment` carrega 9 colunas de split: `tokenBasePrice`, `tokenSellPrice`, `tokenSubtotal`, `platformFeePct`, `platformFeeAmount`, `startupRepasseAmount`, `platformSpreadAmount`, `platformRevenueAmount`, `affiliateCommissionAmount` + `allocatedAt`. `totalCharged` não é coluna — é derivado (`tokenSubtotal + platformFeeAmount`, espelhado em `Payment.amount`). Preços congelados a partir dos snapshots da `Campaign` (`tokenBaseValue`, `tokenSellPrice`/`tokenPrice`); a alíquota (`platformFeePct`) é lida do `ConfigService` vigente no momento da criação do investimento.
- Preços da campanha vêm do `ConfigService` (`fundraising.tokenPrice` = base, `fundraising.tokenSalePrice` = venda, `fundraising.platformFee` = alíquota) — a mesma store editada em `/admin/config`. Criação rejeita `tokenSalePrice < tokenBaseValue`.
- `InvestmentsService.create` calcula o split e cria `Payment.amount = totalCharged` com breakdown serializado em `Payment.serviceDetails`. `PaymentService.createCheckout` deriva o total do `Investment` persistido (não confia em `dto.amount`).
- `confirmInvestment` grava `allocatedAt` dentro da transaction idempotente; comissão de afiliado é calculada pós-commit sobre o repasse.
- `Investment.amount` = `tokenSubtotal` (mantém semântica de base de ROI); o total pago mora em `Payment.amount`/`totalCharged`.
- Estorno integral: `RefundService` rejeita parcial em INVESTMENT; `InvestmentsService.refundInvestment` reverte investment/tokens/comissão; `PaymentService.cancelByAdmin` delega ao estorno quando o payment é INVESTMENT pago. `StartupRoundService.cancelRound` estorna cada investimento sequencialmente e **não fecha a campanha se algum estorno falhar**.
- Dashboards financeiros (`GET /admin/financeiro/dashboard`, `GET /admin/financeiro/investments`) separam GMV / repasse / receita por categoria (taxa plataforma, spread, reserva, compliance, fast track, selos, comissão afiliada).
- `GET /campaigns/:id/checkout` expõe `tokenBasePrice`, `tokenSellPrice` e `platformFeePct` para o frontend renderizar o breakdown sem recalcular regras.

## [Admin] — Visualização do Split Financeiro (Repasse × Lucro)

> Tela dedicada para auditoria do split por campanha + KPIs destacados no dashboard executivo. Apenas leitura.

### Geral
- Os valores gravados em `Investment` (`startupRepasseAmount`, `platformSpreadAmount`, `platformFeeAmount`, `platformRevenueAmount`, `affiliateCommissionAmount`) ficam visíveis em **2 superfícies admin**:
  1. `/admin/dashboard`: nova seção "Split Financeiro" com 4 KPIs (`Repasse startups`, `Lucro plataforma`, `Spread`, `Taxa`) + sparklines mensais (12 buckets).
  2. `/admin/financeiro/split`: auditoria paginada por campanha com filtros (período, status, busca) + modal de detalhe com lista de investments.
- Acesso restrito a **ADMIN** (`AuthGuard + AdminGuard` no backend; backend rejeita 403 se não-admin tentar).
- Apenas leitura — não há regra nova nem mudança no split já persistido.

### Backend
- `AdminDashboardSummaryService` agrega `Σ Investment.startupRepasseAmount`, `Σ platformSpreadAmount`, `Σ platformFeeAmount`, `Σ platformRevenueAmount` (todos filtrados por `status=CONFIRMED`) + série mensal emparelhada `splitMonthly.repasse / splitMonthly.lucro`.
- Novo módulo `AdminFinanceiroSplitService` (audit-only, read-only):
  - `GET /admin/financeiro/split?from=&to=&status=&search=&page=&pageSize=` — lista campanhas (default: `FUNDED | PAID_OUT | CLOSED`) com breakdown agregado via `Investment.groupBy` por `campaignId`.
  - `GET /admin/financeiro/split/:campaignId` — campanha + breakdown + lista de investments CONFIRMED com seus snapshots.
  - `GET /admin/financeiro/split/:campaignId/export` — CSV (snake_case) dos investments com headers `Content-Disposition` para download.
- Filtro de período (`from`/`to`) atua em `Investment.allocatedAt` (carimbo de confirmação), não em `createdAt`.
- Fallback `?? amount` aplicado para investments legados (sem split gravado), mesma convenção de `startup-query.service.ts:168`.
- Sem nova migration — apenas leitura dos snapshots já existentes (migration `20261001000000_investment_financial_split`).

### Frontend
- `/admin/dashboard`: nova seção editorial "Split Financeiro" entre os action tiles e o `PaymentsOverviewTile`, com 4 `SecondaryTile`s (repasse / lucro / spread / taxa) + link "Auditoria por campanha" para `/admin/financeiro/split`.
- Nova rota `/admin/financeiro/split` com:
  - Filtros GET (de, até, status, busca por startup).
  - Tabela editorial (mesmo padrão de `admin-startup-table`) com colunas Captado, Repasse (startup), Lucro plataforma, Comissão afiliado, Investidores.
  - Footer agregado com totais da página atual.
  - Modal de detalhe (drawer em mobile) com breakdown + tabela de investments CONFIRMED.
- BFFs novos: `admin.financeiro.split.ts`, `admin.financeiro.split.$campaignId.ts`, `admin.financeiro.split.$campaignId.export.ts` (preserva headers para download de CSV).
- Nova entrada na sidebar admin: **"Split Repasse × Lucro"** (ícone `Scale`).
- Tipos novos em `queries.ts`: `FinanceiroSplitRow`, `FinanceiroSplitList`, `FinanceiroSplitDetail`, `FinanceiroSplitInvestment`, `AdminSplitMonthlySeries`. Hooks: `useFinanceiroSplitQuery`, `useFinanceiroSplitDetailQuery`.

### Frontend
- Drawer de compra (`investment-sidebar`) só aparece com **documento KYC `APPROVED`** + rodada aberta + estoque; exibe quantidade, preço de venda, subtotal, taxa da plataforma e total — e envia ao `POST /api/investments` somente o **subtotal** (o backend recalcula e cobra `totalCharged`).
- `payment-presentation.ts` monta `details` do INVESTMENT a partir do split persistido (`N tokens × preço = subtotal` + `Taxa da plataforma (x%): valor`); legado sem split mostra apenas a quantidade.
- Checkout (`checkout-order-summary`) mostra subtotal, taxa da plataforma, cupom e total final vindos do `Payment`/backend — sem cálculo local de taxa.
- Dashboard financeiro e tabela de investimentos consomem os campos de breakdown do backend; o dashboard do investidor exibe `amount` (subtotal, base de ROI) e "+ taxa" quando presente.

### Migration / legado
- Migration `20261001000000_investment_financial_split` cria as colunas e faz **backfill** de investimentos CONFIRMED legados (`startupRepasseAmount = amount`, demais split zero/null) — fallback `?? amount` mantido em todas as agregações.

---

## [Painel do Fundador] — Visibilidade de Botões nos Cards do `/founder/dashboard`

> Regras que determinam quais CTAs aparecem nos cards de cada startup na listagem do `/founder/dashboard`, derivadas de `Campaign.status` da rodada mais recente (enum: `DRAFT | OPEN | PAUSED | CLOSED | FUNDED | PAID_OUT`). As regras abaixo coexistem com as já documentadas em `[Afiliação]` (apenas campanhas `OPEN` aceitam novos afiliados) e `[Captação]` (regra B05 — janela de carência para nova rodada).

### Geral

- **Botão "Ver investidores"** (`<Users/>` → `/founder/investors?startupId=:id`)
  - Aparece **APENAS quando `campaignStatus === 'OPEN'`** (campanha ATIVA recebendo aportes)
  - Antes de abrir (`DRAFT`): não há investidores ainda, botão oculto
  - Após encerrar/pausar (`PAUSED | CLOSED | FUNDED | PAID_OUT`): botão oculto — fluxo de investidores passa a ser feito via `/founder/investors?startupId=:id&past=true` (read-only de captações passadas, decisão de UX separada)
  - Tooltip quando oculto: `"Disponível apenas com captação ativa"`

- **Botão "Transparência"** (`<Eye/>` → `/founder/startups/:id/transparencia`)
  - Aparece **APENAS quando o Admin LIBEROU as parcelas na gestão de repasse**, ou seja `campaignStatus ∈ { 'FUNDED', 'PAID_OUT' }` **E** `repasseConfigurado === true` (existe `Repasse` com `status = CONFIGURED`)
  - `DRAFT | OPEN | PAUSED`: ainda não há "resultado" para reportar — botão oculto
  - `FUNDED | PAID_OUT` **sem** repasse configurado: botão **oculto** — a transparência (marcos/resultados/relatórios) só faz sentido após o Admin liberar o fluxo de repasse
  - `CLOSED` (captação encerrada **sem bater meta**): botão **NÃO** aparece — sem repasse, sem dividendos, sem motivo estruturado para relato formal
  - Exceção de leitura: investidores com `Token` ativo da startup continuam acessando a página `/founder/startups/:id/transparencia` independente do botão (ver `[Transparência] — Geral`)

- **Botão "Afiliados"** (`<Handshake/>` → `/founder/affiliate/triagem?startupId=:id`)
  - Aparece **APENAS quando `campaignStatus === 'OPEN'`** (regra já existente, alinhada com `[Afiliação] — Geral`)

- **Botão "Financeiro"** (`<Wallet/>` → `/founder/startups/:id/financeiro` ou `/founder/campaigns/:campaignId/financeiro` — S18.6 prioriza a rota por campanha via `Startup.campaigns[0].id` retornado pelo backend, com fallback legacy se ausente)
  - Aparece **APENAS quando `campaignStatus ∈ { 'FUNDED', 'PAID_OUT' }`** (gestão financeira pós-captacao: repasses, NF, recebimentos). S18.6 — antes era `!= OPEN` mas mostrava o ícone em DRAFT/PAUSED/CLOSED onde ainda não há repasse para gerenciar; corrigido para refletir "captacao finalizada".

- **Botão "Editar Captação"** (`<ClipboardList/>` → `/founder/startups/:id/captacao`)
  - Aparece **APENAS quando `campaignStatus === 'DRAFT'` E `platformStatus === 'approved'`** (S18.6 — fase 2 do Compliance aprovada. Antes da S18.6 o botão aparecia em qualquer DRAFT, permitindo ajustes sem feedback do analista; corrigido para que o founder só ajuste parâmetros após a revisão do Compliance)

- **Botão "Nova Rodada"** (`<Rocket/>` CTA primário → `/founder/startups/:id/new-round`)
  - Aparece **APENAS quando `campaignStatus === 'FUNDED'`** (regra já existente; respeita Regra B05 — `100% vendida + 3 meses de carência`, ver `[Captação]`)

- **Botão "Editar"** (`<Edit3/>` → `/founder/startups/:id/edit`)
  - **Sempre visível** (edição de dados cadastrais da startup, independente da campanha)

- **Botão "Solicitar Parcela"** (`<HandCoins/>` → `/founder/startups/:id/repasse`)
  - Aparece **APENAS quando o Admin LIBEROU as parcelas na gestão de repasse**, ou seja `campaignStatus ∈ { 'FUNDED', 'PAID_OUT' }` **E** `repasseConfigurado === true` (existe `Repasse` com `status = CONFIGURED`)
  - Mesmo gate da **Transparência** — ambos dependem da liberação do repasse pelo Admin (`admin-payout-management §6.2`)
  - **Ícone dedicado** (`HandCoins`) para não colidir com o botão **Financeiro** (`Wallet`), que pode coexistir no mesmo card

> **Ícones (evitar colisão):** `Financeiro` usa `<Wallet/>`; `Solicitar Parcela` usa `<HandCoins/>`. Nunca reutilizar o mesmo ícone para os dois — eles coexistem em `FUNDED/PAID_OUT` com repasse liberado.

### Backend

- Endpoint `GET /api/founder/dashboard` já entrega `campaignStatus` da rodada mais recente de cada startup no payload (`{ startups: [{ id, campaignStatus, ... }] }`)
- **Sem mudança de schema**: a regra é puramente de UI. O backend não precisa expor campo derivado tipo `availableActions: string[]` — a decisão é do frontend para manter a regra visível e versionada no mesmo local da feature
- `useDashboardOverview` (TanStack Query) deve invalidar após qualquer mutação que altere `campaignStatus`:
  - `useCreateRoundMutation` quando `DRAFT → OPEN` (campanha entra em captação)
  - `usePauseRoundMutation` quando `OPEN → PAUSED`
  - `useCancelRoundMutation` quando `OPEN → CLOSED` (falha de meta) ou `FUNDED → CANCELLED` (caso edge)
  - `useMarkFundedMutation` quando `OPEN → FUNDED` (atingiu meta)
  - `useMarkPaidOutMutation` quando `FUNDED → PAID_OUT` (repasse final concluído)

### Frontend

- Componentes responsáveis (as **3 variantes** de card do dashboard devem manter PARIDADE de regra):
  - **`app/components/founder/startup-card.tsx`** (view `list`)
  - **`app/components/founder/startup-actions-cell.tsx`** (coluna de ações injetada na `list` via `startup-list-view.tsx`)
  - **`app/components/founder/startup-grid-card.tsx`** (view `grid`)
- Implementação: cada `<Link>` envolto em renderização condicional baseada em `startup.campaignStatus` + `repasseConfigurado` (variáveis booleanas `isDraft`, `isOpen`, `isPaused`, `isFunded`, `isPaidOut`, `repasseLiberado` derivadas no componente)
- **NÃO** calcular visibilidade via fetch adicional — `campaignStatus` e `repasseConfigurado` já vêm na resposta do dashboard (`/api/startup`)
- `aria-label` deve estar em PT-BR e descrever o contexto quando o botão está oculto (atributo `title`/`aria-describedby`)
- Quando `campaignStatus !== 'OPEN'`, exibir tooltip global do card com `"Captação encerrada em DD/MM/AAAA — aguarde nova rodada"`
- Regras devem ser cobertas por testes E2E em `frontend/test/e2e/flows/founder-dashboard-integration.spec.ts` para cada combinação de status (DRAFT, OPEN, PAUSED, CLOSED, FUNDED, PAID_OUT) × cada botão (6 status × 7 botões = 42 cenários derivados; cob pelo menos as transições críticas DRAFT→OPEN→FUNDED)

---

## [Aprovação por Fases] — Aprovação do Admin/Compliance nas Fases 1, 2 e 3

> Regra de domínio que conecta a aprovação por fase (`/admin/startups/:id/1|2|3`) à promoção da campanha para captação ativa. Define QUANDO o status da startup muda, QUANDO a campanha `DRAFT → OPEN` acontece, e o que o founder vê no `/founder/dashboard` em cada combinação.

### Geral

- A startup atravessa **3 fases de aprovação** sequenciais (cada uma com gate próprio de pagamento/auditoria):
  - **Fase 1 — Cadastro + Reserva** (`/admin/startups/:id/1`) — gate = `Payment(TOKEN_RESERVATION) PAID`
  - **Fase 2 — Edição do Cadastro** (`/admin/startups/:id/2`) — gate = `Payment(COMPLIANCE_FEE) PAID`
  - **Fase 3 — Detalhes de Captação** (`/admin/startups/:id/3`) — gate = `TODOS os payments PAID` + captação preenchida
- O botão "✅ Aprovar" do admin é **sempre auditoria de fase**: grava em `StartupReviewDecision` (com `phase` 1/2/3). NÃO muda o `Startup.status` por si só.
- **Quem muda o `Startup.status = APPROVED` é a aprovação da Fase 1 ou Fase 3** (idempotente — se já APPROVED, mantém). Fases 1 e 3 consolidam a aprovação da plataforma; Fase 2 só audita cadastro/documentos.
- **Quem libera a captação (`Campaign.status: DRAFT → OPEN`) é SÓ a Fase 3**, e somente se **TODOS** os pré-requisitos abaixo estiverem satisfeitos.

### Backend

- `AdminService.updateStartupStatus` (`backendnode/src/api/admin/admin.service.ts`) recebe `options.phase` (1, 2, 3 ou undefined para legado). Comportamento por `status='APPROVED'`:
  - `phase === 1` → muda `Startup.status='APPROVED'` + auditoria + **NÃO** chama `openCampaignOnApproval()`. Emite `startup.phase_approved` (founder vê "Startup Aprovada / Captação Rascunho" e botão "Editar Captação" liberado em `/founder/dashboard`).
  - `phase === 2` → muda `Startup.status='APPROVED'` (idempotente) + auditoria + **NÃO** chama `openCampaignOnApproval()`. Emite `startup.phase_approved`.
  - `phase === 3` → muda `Startup.status='APPROVED'` (idempotente) + auditoria + chama `openCampaignOnApproval()`. Se a campanha abrir, emite `startup.approved`; senão, emite `startup.phase_approved` com `campaignOpened=false` e `reason`.
  - `phase === undefined` (legado) → comportamento legado: chama `openCampaignOnApproval()` (mas respeita os novos gates internos).
- `openCampaignOnApproval` é **idempotente** e tem **3 pré-requisitos** (TODOS obrigatórios):
  1. **NÃO existe campanha OPEN** (idempotência — se já há OPEN, retorna `{ ok: true, reason: 'already_open' }` sem alterar).
  2. **Existe campanha DRAFT com parâmetros preenchidos**: `targetAmount > 0 ∧ valuation > 0 ∧ tokenPrice > 0 ∧ totalTokens > 0`. Sem isso, abrir a captação seria um bug grave (investidores veriam uma campanha sem meta/valuation/preço/quantidade). Retorna `{ ok: false, reason: 'draft_campaign_not_filled' }`.
  3. **`Payment(COMPLIANCE_FEE) PAID`** para a campanha. Retorna `{ ok: false, reason: 'compliance_fee_not_paid' }` se faltar.
- O evento `startup.approved` (que dispara o e-mail "sua startup foi aprovada") SÓ é emitido quando a campanha realmente abriu (`openCampaignOnApproval.ok === true`). Quando não abre, emite `startup.phase_approved` com `campaignOpened: false` para o founder entender que precisa preencher a captação ou pagar a taxa de compliance antes da próxima tentativa.
- Auditoria: `AuditLog(action='CAMPAIGN_OPENED_ON_APPROVAL')` é gravado em `Campaign` sempre que a transição `DRAFT → OPEN` acontece (sucesso).

### Frontend

- No `/founder/dashboard` (`frontend/app/components/founder/startup-card.tsx`, `startup-actions-cell.tsx`, `startup-grid-card.tsx`):
  - Botão **"Editar Captação"** (`<ClipboardList/>` → `/founder/startups/:id/captacao`) aparece **APENAS quando `campaignStatus === 'DRAFT' ∧ platformStatus === 'approved'`** (alinhado com `[Painel do Fundador]` CASE.md linha 279).
  - Status pills mostram `Aprovada` (platformStatus) + `Rascunho` (campaignStatus) enquanto a captação ainda não foi liberada. Quando `DRAFT → OPEN`, muda para `Em Captação`.
- A tela `/founder/startups/:id/captacao` continua exibindo a `Campaign` ativa (`DRAFT/OPEN/PAUSED`) com todos os snapshots financeiros. Com a correção, **só aparece após Fase 1 aprovada** (não depende da Fase 3).
- `/admin/startups/:id/3` exibe os parâmetros de captação preenchidos pelo founder (mesmos campos da tela de edição) — o admin revisa esses valores antes de aprovar a Fase 3. Se a DRAFT estiver vazia, `PaymentReceipt` mostra gate "Captação não preenchida" e o botão "Aprovar Fase 3" fica desabilitado (a verificação `unlocked` do `phase-screen.tsx:953` precisa incluir `campaignFilled`, ver TODO).
- O front escuta o evento `startup.phase_approved` (novo) via TanStack Query invalidation para forçar refetch de `["startups"]` e mostrar imediatamente o status atualizado no `/founder/dashboard`.

---

### Geral
- O afiliado só pode se afiliar a uma startup com captação (campanha) ATIVA (status OPEN)
- Quando a campanha finaliza (FUNDED ou CLOSED), o saldo a receber do afiliado é processado (comissões apuradas)
- Após processamento do saldo, a afiliação é ENCERRADA automaticamente (status → SUSPENDED ou removida)
- O afiliado precisa se re-afiliar a cada nova rodada de captação

### Backend
- Ao mudar Campaign.status para FUNDED/CLOSED: processar todas as AffiliateCommission PENDING → PAYABLE
- Após apuração: atualizar Affiliation.status para refletir encerramento
- Não permitir criar nova Affiliation se não houver Campaign com status OPEN para a startup

### Frontend
- Catálogo de afiliação (`/affiliate`) só lista startups com campanha OPEN
- Botão "Solicitar afiliação" desabilitado se startup não tem campanha ativa
- Badge "Encerrada" em afiliações de campanhas finalizadas

### Frontend
- Wizard de 3 etapas: Identidade → Bancário → Captação & Valuation
- Validação CNPJ alfanumérico (IN RFB 2.229/2024) com cálculo DV1/DV2 no client
- Limites de captação ajustados dinamicamente ao mudar estágio
- Botão "Nova Rodada" só aparece se TODAS as pré-condições B05 são satisfeitas
- Auto-fill de CNPJ via Receita Federal e endereço via ViaCEP
- Loader SSR busca configs financeiras do backend (sem valores hardcoded no client)

---

## [Cadastro] — Usuários e Startups

### Geral
- O código de verificação de cadastro/2FA é sempre gerado pelo servidor e nunca pode ser definido pelo cliente.

### Backend
- O cadastro gera um código numérico aleatório de seis dígitos com `crypto.randomInt`, envia o mesmo valor por email e o armazena na sessão Redis por 300 segundos.
- O campo `codigo` recebido no cadastro é legado e ignorado; ele não pode funcionar como fallback ou override do código server-side.

### Frontend
- O formulário e o BFF de cadastro não geram nem injetam código de verificação; apenas encaminham a requisição ao backend.

---

## [Cadastro] — Checkout temporário por CNPJ

### Geral
- Os dados do cadastro permanecem em `StartupDraft` até a confirmação do pagamento.
- A existência de um `StartupDraft` pendente não bloqueia uma nova tentativa de checkout; o bloqueio de duplicidade ocorre somente quando o CNPJ já está em uma `Startup` persistida.

### Backend
- O CNPJ normalizado é comparado com `Startup` persistida antes da criação do checkout.
- A criação do `Payment` e do `StartupDraft` temporários não depende de uma consulta prévia a drafts pendentes.
- Checkouts e pagamentos continuam vinculados ao usuário autenticado; outro usuário não pode consultar ou usar o `Payment` de terceiros.
- Todo checkout de reserva deve persistir `Payment.expiresAt` em 1 hora; o cron cancela a cobrança vencida e remove o `StartupDraft` temporário, preservando o `Payment` como `CANCELED` para auditoria.

### Frontend
- O usuário deve ser encaminhado ao pagamento após o checkout ser criado, mesmo que exista outro `StartupDraft` temporário pendente.
- Respostas `409` continuam sendo exibidas quando o backend detectar conflito real, como CNPJ de uma `Startup` já persistida.

---

## [Cadastro] — Criação da Campaign DRAFT na confirmação da reserva

### Geral
- O pagamento confirmado da reserva de tokens (`Payment.purpose === 'TOKEN_RESERVATION'` com `StartupDraft` associado) cria, **na mesma transação**, a `Startup` E a `Campaign` em status `DRAFT` com `reservationFeePaid = true`.
- Sem essa `Campaign`, a aba `/founder/startups/:id/captacao` não tem dados para exibir (loader `getCaptacaoData` não encontra nenhuma `Campaign` em `DRAFT/OPEN/PAUSED` e cai no fallback de zeros).
- A campanha permanece em `DRAFT` até o founder preencher as abas de captação (recursos/tese/governança/retornos); depois disso, o admin promove para `OPEN` via fluxo já existente (`POST /campaigns/:startupId` ou `updateDraft` + state transition).

### Backend
- `processTokenReservationPayment` (`payment.service.ts`) faz, dentro de uma `$transaction` única:
  1. `kYCProfile.create` (logo, se houver)
  2. `startup.create` (status `PENDING_CURATOR_REVIEW`, com `fastTrackReview`/`fastTrackReviewedAt` setados quando o draft tem `fastTrackPaymentId` — ver §"[Pagamento] — Fast Track Review (S18.6)")
  3. **`campaign.create`** com `status: 'DRAFT'`, `reservationFeePaid: true`, `deadline = now + 90d` (padrão; prorrogável depois). Em seguida, **`payment.updateMany`** vincula os Payments do checkout consolidado (`paymentId` + `fastTrackPaymentId`) ao `campaignId` recém-criado — sem isso, `getCaptacaoData` (que faz `include Campaign.payments`) retornaria lista vazia e a tela `/founder/startups/:id/captacao` não exibiria as cobranças.
  4. `startupDocument.create` (pitch deck, se houver)
  5. `startupDraft.update` → `PROCESSED`
- Snapshot financeiro do ADR-008 (Modelo A) é persistido na criação (`tokenBaseValue`, `tokenSellPrice`, `adminFeeValue`, `tokenMintingCost`), idêntico ao `createFirstCampaign` de `CampaignsCreateService`.
- `valuation` é derivado de `payload.equityOferecido` e `payload.metaCaptacao` (`valuation = metaCaptacao * 100 / equityPercent`).
- `totalTokens` é derivado de `TOKEN_BASE_VALUE` (config): `totalTokens = ceil(metaCaptacao / TOKEN_BASE_VALUE)`. O frontend espelha a fórmula em `new-startup-wizard.metrics.ts`.
- `minInvestment` pode permanecer como snapshot legado para compatibilidade, mas não é uma barreira de compra; o investidor pode comprar a partir de 1 token, respeitando apenas o saldo disponível.
- `createStartupCheckout` valida `payload.metaCaptacao` (finito, > 0, entre `fundraising.minCampaign` e `fundraising.maxCampaign`) ANTES de criar o `Payment` PENDING — falha cedo.
- Idempotência: o efeito de domínio continua ancorado em `Payment.effectsAppliedAt` (criado em `20260905000000_payment_effects_applied_at`); uma reentrega do webhook não duplica a `Campaign` porque o caminho legado (`payment.campaignId` setado) sobrescreve, e o caminho novo só roda se `StartupDraft.status === 'PENDING_PAYMENT'` (qualquer retry encontra `PROCESSED`/`FAILED` e retorna early).
- Erro dentro da transação faz Prisma rollback completo — sem `Startup`/`KYC`/`Campaign` órfãos; o `StartupDraft` é marcado `FAILED` pelo `catch` de `processTokenReservationPayment`.

### Frontend
- O wizard (`/founder/startups/new`) envia `metaCaptacao` e `equityOferecido` no payload; o backend deriva o resto. Não enviar `totalTokens`, `valuation` ou `tokenPrice` do frontend para a reserva — eles são derivados.
- A aba `/founder/startups/:id/captacao` continua exibindo a `Campaign` ativa (`DRAFT`/`OPEN`/`PAUSED`) com todos os snapshots financeiros; com o fix, passa a exibir os valores definidos no wizard em vez do fallback de zeros.
- Fast Track Review não altera o cálculo da campanha — é apenas um adicional no `Payment.amount` da reserva.

---

## [Pagamento] — Fast Track Review (S18.6, checkout consolidado)

### Geral
- O **Fast Track Review** é um produto adicional que o founder contrata na reserva de tokens para análise prioritária do compliance. Hoje default `fundraising.fastTrackFee` = R$ 2.500 (configurável em `/financeiro/config`).
- O fundador vê **uma única cobrança PIX** consolidada (reserva + Fast Track). O backend cria **2 Payments separados** com o mesmo `txid` para que admin/compliance vejam a contratação do serviço discriminada na auditoria e nos relatórios financeiros.
- Cada `Payment` registra `originalAmount` (valor cheio do produto), `discountAmount` (desconto aplicado a ESTE item) e `paidAmount` (valor efetivamente pago). Em fluxos sem cupom, `originalAmount === paidAmount === amount`.
- Cupons compartilhados são rateados proporcionalmente ao `originalAmount` de cada item via `CouponService.apply` (S18.6): o desconto é calculado sobre `totalOriginal = primary + sibling` e depois dividido pelo peso de cada um. O residual de 1 centavo (rounding HALF_EVEN) vai para o Payment principal. O `CouponUsage` registra o TOTAL do checkout consolidado (admin vê o valor agregado); cada `Payment.serviceDetails` espelha o breakdown do próprio item.

### Backend
- `createStartupCheckout` (em `payment.service.ts`) decide o split a partir de `payload.wantsFastTrackReview`:
  - `wantsFastTrackReview === true`:
    - lê `fundraising.fastTrackFee` da config (rejeita 400 se ≤ 0 / não-finita);
    - valida que `dto.amount === reservationFee + fastTrackFee` (diferença > R$ 0,01 → 400 "Valor total inconsistente");
    - cria 2 Payments PENDING dentro de **uma `$transaction`**:
      1. `Payment A`: `purpose = TOKEN_RESERVATION`, `amount = reservationFee`, `originalAmount/paidAmount = reservationFee`, `StartupDraft.paymentId = A.id`
      2. `Payment B`: `purpose = FAST_TRACK_REVIEW`, `amount = fastTrackFee`, `originalAmount/paidAmount = fastTrackFee`, `StartupDraft.fastTrackPaymentId = B.id` (via relation `startupDraftFastTrack`)
  - `wantsFastTrackReview === false`: 1 Payment PENDING (TOKEN_RESERVATION), `fastTrackPaymentId = null`.
- O `processWebhookPaymentReceived(txid, e2eId)` foi migrado de `findUnique({where: {txid}})` para `findMany({where: {txid}})` — um PIX consolidado agora retorna 2 Payments que compartilham o mesmo `txid`. Ambos são marcados PAID em sequência; cada um segue seu próprio pipeline de `dispatchOrApplyEffects` (TOKEN_RESERVATION → cria Startup + Campaign; FAST_TRACK_REVIEW → AuditLog standalone `FAST_TRACK_REVIEW_CONFIRMED`).
- `generatePixViaEfi` (S18.6 — espelho do txid): ao gerar a cobrança PIX consolidada, o `txid` retornado pela EFI é salvo tanto no `Payment` principal quanto no `Payment.startupDraftFastTrack` (sibling FAST_TRACK_REVIEW). Sem isso, o webhook de `processWebhookPaymentReceived` só encontraria 1 dos 2 Payments (o irmão ficaria preso em `PENDING`).
- Reconciliação no webhook: caso legado (Fast Track gerado antes deste fix, com `txid=null`), `processWebhookPaymentReceived` busca via `StartupDraft.fastTrackPaymentId` os siblings com `txid=null` vinculados aos Payments principais encontrados pelo `txid`, espelha o txid neles e os inclui na lista de processamento. Idempotente.
- `processPaymentEffects` ganhou o case `FAST_TRACK_REVIEW` → `auditFastTrackStandalonePayment(paymentId)` (audit-only; o efeito real `Startup.fastTrackReview=true` é aplicado DENTRO de `processTokenReservationPayment` quando a Startup é criada — o draft já carrega `fastTrackPaymentId` e a leitura é feita em `select` no lookup inicial).
- Idempotência preservada: cada Payment tem seu próprio `effectsAppliedAt` (idem ao design S01). Uma reentrega do webhook reprocessa os efeitos de cada Payment individualmente.
- A `Payment.txid` perdeu o `@unique` (agora é índice comum `Payment_txid_idx`) — múltiplos Payments podem compartilhar 1 txid. Migration: `20260925114525_payment_fast_track_breakdown`.
- O seed (`prisma/seed.ts`) foi migrado de `upsert({where: {txid}})` para `findFirst + update/create` porque `txid` deixou de ser único.

### Frontend
- O wizard (`/founder/startups/new`) já envia `wantsFastTrackReview` (boolean do form) e o `amount` total correto. Backend faz a validação server-side.
- `getPaymentPresentation` (em `payment-presentation.ts`) reconhece `purpose === "FAST_TRACK_REVIEW"` e renderiza título/descrição próprios ("Avaliação Rápida (Fast Track Review)").
- `PaymentSummary` (em `payment-presentation.ts`) ganhou `originalAmount?`, `discountAmount?`, `paidAmount?`, `fastTrackPaymentId?` — campos disponíveis no checkout e em qualquer listagem admin.
- O fundador vê 1 PIX (mesmo `txid`); admin/compliance veem 2 Payments com propósitos distintos para relatórios.

### Auditoria / Relatórios
- Cada Payment PAID registra os 3 campos de breakdown (`originalAmount`, `discountAmount`, `paidAmount`) — consultáveis via `payment-originalAmount-idx`/`payment-discountAmount-idx`/`payment-paidAmount-idx` ou no SELECT direto. Facilita:
  - Relatório de receita por produto (somar `paidAmount` agrupado por `purpose`).
  - Auditoria de descontos aplicados por item.
  - Conciliação financeira (somatório de `amount` dos Payments PAID confere com o PIX consolidado recebido na EFI).
- `Startup.fastTrackReview` (boolean, default false) + `fastTrackReviewedAt` (DateTime?) identificam rapidamente quais startups contrataram o serviço — exibido na listagem admin e usado para priorização na fila do compliance.

---

## [Publicação] — Delay de 24h pós-aprovação + serviço FAST_DEPLOY (Publicação Rápida)

### Geral
- Ao aprovar a **Fase 3** (Detalhes de Captação) no Compliance, por padrão a startup **não** é publicada imediatamente: a publicação no marketplace (e a liberação da página pública) ocorre em **até 24h** após a aprovação.
- O founder pode contratar o serviço pago **FAST_DEPLOY** (nome comercial **"Publicação Rápida"**, default R$ 1.000, configurável) que torna a publicação **imediata** na aprovação do Compliance.
- O serviço é oferecido num diálogo ao clicar **"Finalizar"** na tela `/founder/startups/:id/captacao/retornos`, **somente quando a Taxa de Compliance ainda NÃO foi paga**. Se já paga, o "Finalizar" segue sem diálogo e sem oferta.
- Quando aceito, FAST_DEPLOY vai ao checkout **junto** da Taxa de Compliance — 2 produtos num único PIX consolidado (mesmo padrão de `FAST_TRACK_REVIEW` + `TOKEN_RESERVATION`).
- O e-mail de startup aprovada mostra o **tempo de publicação**: "já está no ar" (FAST_DEPLOY) ou "publicada em até 24h (previsto para DD/MM/AAAA HH:MM)" (padrão).

### Backend
- Schema (`schema.sqlite.prisma`): `Campaign.scheduledPublishAt DateTime?` (horário-alvo da publicação) + `Campaign.fastDeploy Boolean @default(false)` (serviço contratado/pago). Enum `PaymentPurpose` ganhou `FAST_DEPLOY`. Migration `20261007000000_add_campaign_scheduled_publish_fast_deploy`.
- Preço: `SystemConfig.FAST_DEPLOY_FEE` (default R$ 1.000). Catálogo: `Service` slug `fast-deploy` (seed em `prisma/seeds/seed-services.ts`), editável em `/admin/services`.
- `PaymentService.createComplianceFee(campaignId, userId, wantsFastDeploy=false)`: quando `wantsFastDeploy` e **não** há COMPLIANCE_FEE PAID, cria um 2º Payment `FAST_DEPLOY` (preço de `FAST_DEPLOY_FEE`) ligado à mesma campanha. Guard idempotente: ignora `wantsFastDeploy` se já há COMPLIANCE_FEE PENDING/PAID, e não duplica FAST_DEPLOY existente.
- `getPaymentForCheckout` expõe `fastDeployPayment` (sibling por `campaignId`) quando o Payment principal é COMPLIANCE_FEE — para o checkout renderizar os 2 produtos.
- `processPaymentEffects` (case `FAST_DEPLOY`): seta `campaign.fastDeploy=true` (idempotente, AuditLog `FAST_DEPLOY_CONFIRMED`). `processPaymentCancelledEffects` reverte para `false` (AuditLog `FAST_DEPLOY_REVERTED`).
- `AdminService.openCampaignOnApproval` (aprovação da Fase 3), após os gates (DRAFT preenchida + COMPLIANCE_FEE PAID):
  - `campaign.fastDeploy === true` → abre **OPEN imediato** (`dataLancamentoRodada=now`); AuditLog `CAMPAIGN_OPENED_ON_APPROVAL`.
  - caso contrário → mantém **DRAFT** e grava `scheduledPublishAt = now + PUBLISH_DELAY_HOURS` (const = 24h em `admin.service.ts`); AuditLog `CAMPAIGN_PUBLISH_SCHEDULED_ON_APPROVAL`.
  - Emite `startup.approved` com `{ fastDeploy, scheduled, scheduledPublishAt }`.
- `ScheduledPublishCron` (`src/api/marketplace/scheduled-publish.cron.ts`, `@Cron` a cada 10 min, lock Redis `SET NX EX`): busca campanhas `status=DRAFT` com `scheduledPublishAt <= now` e as transiciona para OPEN (`dataLancamentoRodada=now`, deadline), AuditLog `CAMPAIGN_PUBLISHED_SCHEDULED`, emite `startup.approved` com `publishedNow:true`. Idempotente.
- Visibilidade no marketplace continua derivada de `campaign.status === 'OPEN'` (`MarketplaceService`) — nenhuma mudança nas queries; o delay é implementado mantendo a campanha DRAFT até o cron publicar.
- E-mail: `startupAprovadaTemplate` (+ `StartupAprovadaTemplateData.fastDeploy/scheduledPublishAt`) renderiza texto condicional; `StartupNotificationService.onStartupApproved` repassa os campos do evento (`jaNoAr = fastDeploy || publishedNow`).
- `StartupExtrasService.getCaptacaoData` expõe `complianceFeePaid` (há COMPLIANCE_FEE PAID?) e `fastDeploy` para o frontend decidir se mostra o diálogo.

### Frontend
- `FastDeployDialog` (`app/components/founder/fast-deploy-dialog.tsx`): modal que explica o delay padrão de 24h e oferece a Publicação Rápida (preço de `/founder/services`, slug `fast-deploy`). Botões "Aceitar" (checkout com 2 produtos) e "Não, obrigado" (só compliance).
- `edit-startup-captacao-retornos.tsx`: ao "Finalizar", se `complianceFeePaid` → finaliza direto; senão abre o `FastDeployDialog`. O aceite/recusa chama `useRequestComplianceFee({ campaignId, wantsFastDeploy })`.
- `useRequestComplianceFee` envia `wantsFastDeploy` no POST `/api/founder/compliance-fee`.
- Checkout (`checkout-payment.tsx`): quando o Payment é COMPLIANCE_FEE e há `fastDeployPayment`, renderiza o 2º produto ("Publicação Rápida") e soma no total. `getPaymentPresentation` (payment-presentation.ts) reconhece `purpose === "FAST_DEPLOY"`.

---

## [Pagamento] — Reserva de Tokens e Checkout

### Geral
- A integração de pagamentos (PIX e cartão) usa a API direta da EFI. A EFI não oferece checkout hospedado — apenas API para PIX e cartão de crédito.

### Backend
- A integração PIX usa o SDK oficial `sdk-node-apis-efi`, que resolve mTLS, OAuth `client_credentials` e a seleção de endpoint (homologação vs produção).
- `EFI_MODE` aceita `mock | dev | sandbox | prod`. Tanto `dev` quanto `sandbox` apontam para homologação; qualquer valor diferente de `prod` é tratado como sandbox (nunca cai em produção por engano).
- Autenticação mTLS obrigatória: toda chamada (inclusive OAuth) exige o certificado `.p12`. Regra de seleção: modo sandbox usa o certificado de homologação; modo prod usa o de produção. Caminhos configuráveis por `EFI_CERT_HOMOLOG_PATH` / `EFI_CERT_PROD_PATH` (default em `backendnode/certs/efi/`).
- Os certificados `.p12` NUNCA são versionados (`.gitignore`).
- Geração de cobrança PIX = 2 passos: `pixCreateimmediateCharge` (cria a cobrança, retorna `txid` + `loc.id`) e `pixGenerateQRCode({ id: loc.id })` (retorna `qrcode` = copia-e-cola e `imagemQrcode` = data URI base64 da imagem).
- Persistência no `Payment`: `copyPastePix` = `qrcode` (BR Code EMV), `qrCodeBase64` = `imagemQrcode` (data URI base64), `efiLocation` = `loc.location`. NÃO gravar a URL de location em `qrCodeBase64`/`copyPastePix`.

### Frontend
- A tela `/checkout/payment/:id` renderiza o QR Code a partir de `qrCodeBase64` (data URI base64) e oferece o copia-e-cola a partir de `copyPastePix`.

## [Pagamento] — Cupons de Desconto

### Geral
- Um desconto só pode ser aplicado quando o código existir na tabela `Coupon`; cupom inexistente não altera o valor do pagamento.
- O valor final de um pagamento com cupom é canônico em centavos (duas casas), calculado pelo backend com `Decimal` e arredondamento `ROUND_HALF_EVEN`; o desconto é a diferença entre o valor original e o total final arredondado.
- Um cupom pode ser aplicado a um pagamento `PENDING` mesmo depois de uma cobrança PIX aberta ter sido emitida: a cobrança externa anterior é cancelada e uma nova cobrança é gerada com o valor líquido atualizado. Cobranças de cartão já emitidas continuam sem substituição.
- Cada cupom usa exclusivamente o percentual persistido no próprio registro `Coupon`.
- O desconto é subsidiado pela plataforma: para investimentos, ele não reduz a quantidade de tokens, o valor bruto do investimento, a captação da campanha, a comissão de afiliado nem o repasse da startup. A diferença entre o valor bruto e o valor efetivamente pago deve permanecer auditável como subsídio da plataforma.
- Um cupom de 100% liquida a ordem internamente, sem gerar PIX, cartão, `txid`, `endToEndId` ou chamada à EFI. Essa liquidação só é válida quando o percentual persistido do cupom é exatamente 100%, o valor original da ordem é positivo, o total canônico é zero e a ordem ainda não expirou; a transição condicional para `PAID` verifica essas condições no backend. A ordem executa os efeitos normais do propósito e exibe uma confirmação de pagamento ao cliente.
- Um cupom é considerado utilizado somente quando o `Payment` vinculado confirma como `PAID`. Até a confirmação, sua reserva não compõe `usedCount`; expiração ou cancelamento de uma ordem pendente libera a reserva e devolve a disponibilidade do cupom.
- Cupons com uso ou reserva histórica não são apagados: a exclusão administrativa é inativação (`active=false` e `status=INACTIVE`), preservando a trilha financeira e de auditoria.
- No gerenciador administrativo, `ADMIN` é o único papel com permissão de criar, editar, ativar/desativar ou inativar cupons; `COMPLIANCE` e `FINANCEIRO` possuem apenas consulta, auditoria e histórico de uso.
- Cupons com `validFrom` no futuro são classificados como inativos até o início da janela de validade.

### Rastreabilidade financeira da ordem
- `Payment.amount` deve representar sempre o total final efetivamente cobrado do cliente. Sem juros de cartão, ele equivale ao valor líquido após o cupom; com parcelamento sujeito a juros, ele deve refletir o total final com juros e o snapshot preserva separadamente principal líquido, juros e total cobrado.
- Uma ordem (`Payment`) pode receber no máximo um cupom. A aplicação não pode compor descontos sucessivos sobre a mesma ordem.
- A ordem deve preservar um snapshot financeiro imutável do cupom aplicado: identificador e código do cupom, percentual vigente na aplicação, valor original, desconto aplicado, principal após o desconto, juros quando aplicáveis, valor final, estado da reserva/resgate e datas relevantes. Alterar ou inativar o catálogo de cupons não pode alterar esse histórico.
- Os juros de cartão são calculados sobre o principal já descontado pelo cupom. A configuração vigente define máximo de parcelas, taxa mensal e valor mínimo da parcela; o checkout apenas apresenta o cálculo retornado pelo backend.
- O detalhe da ordem deve expor esse snapshot de forma estruturada para o titular e para os papéis administrativos autorizados, sem depender de campos JSON genéricos.
- Após a emissão da cobrança ou a transição para `PAID`, nenhuma rota genérica pode alterar o valor final ou o snapshot de cupom da ordem.

### Backend
- A aplicação valida existência, ativo/status, janela de validade, limite de usos, ownership, status `PENDING` e prazo da ordem ainda não expirado. Para PIX aberto, cancela a cobrança externa via `pixUpdateCharge` (`REMOVIDA_PELO_USUARIO_RECEBEDOR`), limpa o `txid`/QR local por CAS, persiste o snapshot do cupom e reemite a cobrança com o valor final. Cobrança de cartão já emitida continua bloqueando a aplicação.
- A reserva, o snapshot financeiro, a confirmação ou liberação do cupom, o contador de uso e o `AuditLog` devem ser persistidos transacionalmente e de forma idempotente.
- A confirmação de uma ordem gratuita por cupom integral reutiliza o pipeline de efeitos de `Payment` por `paymentId`, sem simular uma transação da EFI. A validação usa o snapshot congelado no momento da aplicação — e nunca o percentual atual, mutável, do catálogo de cupons.
- PIX e cartão recusam ordens com total menor ou igual a zero como defesa adicional; a ordem gratuita correta já deve estar `PAID` antes de qualquer tentativa de emissão.
- A configuração de parcelamento é fonte de verdade do backend e deve ser aplicada antes da emissão da cobrança de cartão, persistindo snapshot de principal, juros, parcelas e total.
- A listagem administrativa calcula status, filtro, total e paginação sobre o mesmo conjunto derivado; datas futuras, expiração e esgotamento não podem gerar `totalPages` incompatível com `items`.
- O histórico de uso expõe apenas identificador público e rótulo genérico do usuário; emails, CPF, telefone e IDs internos não são retornados.

### Frontend
- O checkout não aceita códigos especiais nem calcula percentuais, juros ou valores finais localmente; envia o código ao backend e exibe apenas os valores retornados pela API.
- A entrada de cupom aparece após a criação do `Payment` e permanece disponível enquanto a ordem estiver `PENDING`, inclusive com PIX aberto. Durante a substituição, o QR anterior é ocultado; após sucesso, a tela revalida o pagamento e mostra somente o novo QR/copia-e-cola.
- Ao concluir uma ordem por cupom de 100%, o checkout direciona para uma tela autenticada de sucesso, sem mostrar QR Code ou formulário de cartão, com CTA para a Home.
- `/admin/config` deve oferecer uma seção administrativa própria para configurar e consultar o histórico de máximo de parcelas, taxa mensal de juros e valor mínimo de parcela.
- A Central de Cupons exibe controles de mutação apenas para `ADMIN`; `COMPLIANCE` e `FINANCEIRO` consultam dados, usos e auditoria em modo somente leitura.

### Histórico das alterações deste fluxo (2026-09)
- O checkout canônico permanece `/checkout/payment/:id`, com BFFs React Router encaminhando sessão por cookie ao backend NestJS.
- O fluxo PIX foi consolidado no `EfiPixAdapter` usando `sdk-node-apis-efi` 2.x: criação imediata, geração de QR, consulta de status, webhook e cancelamento de cobrança aberta.
- A aplicação de cupom deixou de bloquear todo PIX já emitido: a saga valida o cupom, cancela a cobrança EFI anterior, limpa o QR antigo por comparação-e-troca, atualiza o valor e solicita uma nova cobrança.
- A emissão usa lock temporário no pagamento; falha de cancelamento não altera cupom nem valor. Falha após o cancelamento mantém a ordem sem QR antigo para nova tentativa segura.
- A UI passou a invalidar a query real `payment-status`, ocultar o QR durante a substituição e revalidar o loader após sucesso ou falha.
- Não foram alterados schema/migrations, `.env`, certificados, chaves ou credenciais. Uma coleção `.postman.json` ainda precisa ser criada para executar uma validação Postman versionada.

## [Pagamento] — Cartão de Crédito (EFI)

### Geral
- Pagamento com cartão usa a API de Cobranças da EFI (one-step), não checkout hospedado.
- É obrigatório ter "ramo de atividade" cadastrado e a API de emissão de cobranças liberada na conta EFI.

### Backend
- A cobrança de cartão é criada via `createOneStepCharge` do SDK `sdk-node-apis-efi` (`EfiChargeAdapter.createOneStepCard`). Valor é enviado em CENTAVOS (inteiro).
- O backend NUNCA recebe dados do cartão — apenas o `payment_token` (gerado no navegador) + parcelas via `POST /payment/:id/card` (DTO `ConfirmCardDto`).
- Se a EFI retorna status aprovado (`approved`/`paid`/`settled`), o pagamento é marcado PAID reusando `processWebhookPaymentReceived` (mesmo pipeline do PIX, que emite `payment.confirmed`). Recusa retorna HTTP 422 com o motivo da EFI.
- O backend NÃO usa `payee_code` (isso é só do frontend).
- **Persistência do `method`**: `PaymentService.generateCardCheckout` DEVE atualizar `Payment.method = 'CREDIT_CARD'` no `updateMany` do lock de emissão (linhas ~2076–2093 de `payment.service.ts`). Sem isso, Payments criados pelo wizard com default `method='PIX'` permaneciam com PIX no banco mesmo após liquidação via cartão, fazendo `/user/payments`, `/pending-payments-card` e `/admin/payments` exibirem "PIX" para transações pagas com cartão. Quando `installments > 1`, também persiste `serviceDetails.installments`.
- **Backfill histórico**: `prisma/migrations-sqlite/20261005000000_backfill_card_payment_method/migration.sql` corrige o legado — `UPDATE Payment SET method='CREDIT_CARD' WHERE efiChargeId IS NOT NULL AND method='PIX'`. Idempotente.

### Frontend
- A tokenização do cartão é feita no navegador pela lib `payment-token-efi`, usando o Identificador de Conta em `VITE_EFI_PAYEE_CODE` (`setAccount`) e ambiente `sandbox`/`production` derivado de `VITE_API_URL`.
- O componente `CreditCardForm` gera o `payment_token` e envia ao BFF `POST /api/payment/:id/card`; os dados do cartão nunca trafegam pelo backend.
- Em homologação, cartões com final 1/2/3 simulam recusas; demais finais aprovam (valores entre R$ 0,01 e R$ 10,00).
- **Helpers de método de pagamento**: `app/lib/payment-presentation.ts` exporta `getPaymentMethodLabel(method)`, `isPaymentMethodPix(method)` e `normalizePaymentMethod(method)` para uso consistente no UI. Substituem lógica inline que existia em `routes/private/user.payments.tsx`. O método real é decidido na aba do checkout (`/checkout/payment/:id`), não no wizard de criação.

## [Pagamento] — Webhook PIX (EFI)

### Geral
- A EFI notifica pagamentos PIX via callback POST na URL cadastrada. A segurança é em duas camadas: mTLS reverso (validado pelo Nginx) + HMAC na query string + IP de origem.

### Backend
- O callback chega em `POST /payment/efi/webhook` (também aceita `/webhook/pix`, pois a EFI acrescenta `/pix` quando não se usa `?ignorar=`).
- `WebhookSignatureGuard` valida o `?hmac=` (contra `EFI_WEBHOOK_HMAC_SECRET`, comparação em tempo constante) e o IP oficial da EFI (`34.193.116.226`, via `X-Forwarded-For`); em `NODE_ENV=development` o guard libera.
- O mTLS NÃO é validado na aplicação (o TLS termina no Nginx) — por isso o guard não checa `peerCertificate`.
- O cadastro do webhook é feito por `POST /payment/efi/webhook/configure` (ADMIN/FINANCEIRO), que usa `EFI_WEBHOOK_URL` (pública, https) e acrescenta `?hmac=<segredo>&ignorar=` via SDK (`pixConfigWebhook`).
- Processamento assíncrono via RabbitMQ; resposta ao callback em ≤200ms. Idempotência por `txid`.

### Infra
- O Nginx do host faz `ssl_verify_client on` na rota do webhook com a cadeia pública da EFI (`certs/efi_webhook/certificate-chain-{homolog,prod}.crt`). Referência em `infra/prod/ec2-api/nginx-efi-webhook.conf.example`.

---

## [Pagamento] — Copy do Resumo do Checkout (fonte única)

### Geral
- O texto exibido no "Resumo do Pedido" de cada `Payment` no `/checkout/payment/:id` é fonte única em `frontend/app/lib/payment-presentation.ts::getPaymentPresentation`. Não duplicar copy em outros arquivos (hooks, componentes) sem antes atualizar a função.

### Frontend
- `COMPLIANCE_FEE` (Taxa de Compliance): title "Taxa de Compliance", description em parágrafo único ("Taxa referente à análise de conformidade da sua startup e da rodada de captação. O pagamento é necessário para iniciar o processo de análise."), `details: []` (sem bullets adicionais), `quantityLabel: "1 taxa"`. Texto aprovado pelo produto em 2026-10-05.
- O `PendingPaymentsCard` em `/founder/dashboard` espelha a mesma copy para consistência — `frontend/app/hooks/use-founder-pending-payments.ts::PAYMENT_PURPOSE_LABELS.COMPLIANCE_FEE`.

## [Planos] — Planos de Investimento

### Geral
- Os preços anuais canônicos da seed são: AFILIADO R$ 85,00, INVESTIDOR R$ 50,00 e FUNDADOR R$ 100,00.
- Um usuário **NÃO pode** ter duas assinaturas (`Subscription`) `ACTIVE` para o **mesmo** plano (`Plan`) ao mesmo tempo — compra duplicada do mesmo plano deve ser bloqueada.
- Um usuário **PODE** ter assinaturas `ACTIVE` simultâneas para **planos diferentes** (ex.: `FUNDADOR` + `INVESTIDOR`) — perfis complementares são aceitos.
- Assinaturas em status `CANCELED`, `EXPIRED` ou `PENDING` não bloqueiam nova compra do mesmo plano.
- A compra de um plano diferente em `/pricing` cria uma nova assinatura `PENDING` para checkout e nunca cancela automaticamente uma assinatura `ACTIVE` existente.
- O cancelamento ou encerramento de uma assinatura deve ser uma ação explícita do usuário ou de um operador autorizado, não um efeito colateral da compra de outro plano.
- Usuários autenticados podem aplicar cupons durante o checkout mesmo sem uma assinatura `ACTIVE`; a posse do pagamento, o status `PENDING` e as demais regras do cupom continuam obrigatórios.

### Backend
- `SubscriptionsService.create()` deve validar, antes de inserir, se já existe `Subscription` com mesmo `userId` + `planId` em status `ACTIVE`. Caso exista, retornar `409 Conflict` com mensagem PT-BR explicando que o usuário já possui o plano ativo e orientando usar a troca via `/pricing`.
- A validação é idempotente: `PENDING` duplicado deve ser resolvido pelo fluxo de pagamento (`PaymentService.processPaymentEffects`) e não gerar erro de conflito no `create`.
- Webhook de pagamento (`payment.confirmed`) continua ativando a `Subscription` normalmente — a regra anti-duplicata é no momento da **criação**, não da ativação.
- O filtro de sessão considera o usuário autorizado quando existir **qualquer** assinatura `ACTIVE` não expirada; nunca deve validar somente a primeira assinatura da lista.
- Audit log deve registrar tentativas bloqueadas com action `SUBSCRIPTION_DUPLICATE_BLOCKED` (entity `Subscription`, sem newValue).

### Frontend
- Tela `/pricing` deve ocultar/desabilitar o CTA do plano atualmente ativo (badge "Plano atual") — comportamento já implementado em `pricing.tsx`.
- Quando o usuário já possui outro plano `ACTIVE`, os demais planos elegíveis devem exibir "Adicionar plano" e iniciar um novo checkout; não deve existir modal ou fluxo de troca automática.
- `usePricingSubscriptionMutation` deve manter a defesa contra duplicata pelo `planId`, mas nunca cancelar uma assinatura existente durante a compra de outro plano. O parâmetro `currentSubscription` permanece apenas por compatibilidade com consumidores legados; a tela `/pricing` o envia como `null`.
- Mensagem de erro 409 do backend deve ser exibida em toast PT-BR: "Você já possui este plano ativo. Para trocar, cancele o plano atual em /pricing."

---

## [Uploads] — Documentos e Arquivos

### Geral
- Arquivos armazenados em S3 (produção) ou filesystem local (desenvolvimento) via `IObjectStorageProvider`
- Cada usuário tem quota por plano (FREE/PRO) controlada pelo `QuotaService` — limite de uploads/hora, storage total e tamanho por arquivo
- Sem rate limit específico por IP no endpoint `/uploads` (removido em PRD §UPLOAD_DE_ARQUIVOS). Cobertura de DoS fica a cargo do ThrottlerGuard global (100 req/min por IP) herdado do `AuthModule`
- **Pitch Deck** é um PDF de até **15 MB**: limite imposto no frontend (`new-startup-wizard`, pré-checagem de 15MB) e no backend (`POST /uploads?kind=pitch-deck` → `MAX_PITCH_DECK_SIZE_BYTES`, retornando 413 ao exceder)
- **Divergência a tratar:** no fluxo de documentos da edição (`POST /startup/:id/documents`, categoria `PITCH_DECK`) a trava atual é mais frouxa — backend `MAX_DOC_SIZE_BYTES` de 25 MB e frontend `validateFile` de 50 MB — portanto a regra de 15 MB só é efetivamente aplicada no wizard de cadastro hoje

### Backend
- Validação de MIME type obrigatória no backend (não confiar no Content-Type do cliente)
- Presigned URLs de download com expiração configurável (default 7 dias)
- Upload via `POST /uploads` com multipart/form-data é público e não exige sessão; quando houver uma sessão válida, o backend a usa apenas para associar o arquivo ao usuário, sem aceitar `userId` enviado pelo cliente
- `QuotaService.checkQuota(userId, startupId, fileSize, plan)` é chamado antes de persistir; retorna 413 quando storage/uploads/hora excedem plano
- Ao vincular um arquivo à Profile, o frontend envia `*_upload_id`; o backend valida a posse do upload e cria o `KYCProfile` correspondente antes de atualizar `User.avatar_id`/demais relações, sem confundir IDs de `Upload` com IDs de `KYCProfile`
- Quando `POST /uploads` recebe `kind`, o valor deve pertencer à matriz oficial de tipos; `kind` desconhecido é rejeitado e não pode cair na matriz legacy
- Para `kind` de KYC (`avatar`, `documento`, `comprovante` ou `biofacial`), a resposta do upload informa o campo correspondente (`avatar_upload_id`, `documento_upload_id`, `comprovante_upload_id` ou `biofacial_upload_id`); o frontend só faz o PATCH após o status `READY` confirmar o mesmo campo
- `User.avatar_id` e os demais campos KYC continuam referenciando exclusivamente `KYCProfile`; o retorno do PATCH atualiza a sessão Redis com a URL da imagem vinculada
- `UserPlanHelper` resolve plano do usuário via `Subscription.ACTIVE` + `plan.slug.contains('pro')`, com cache em memória TTL 5min
- ThrottlerGuard global (100 req/min por IP) ativo por padrão via `AuthModule.forRoot()` — proteção de DoS compartilhada
- Limites FREE: 50 uploads/h, 500MB storage total, 50MB/arquivo
- Limites PRO: 200 uploads/h, 5GB storage total, 100MB/arquivo
- Limite físico global por arquivo: 500MB (`MulterConfigService`); esse limite é apenas o teto técnico do parser e não substitui as quotas FREE/PRO
- Upload de **documentos compliance da startup** (`POST /startup/:id/documents`) e **comprovante financeiro** (`POST /admin/financeiro/comprovantes`) aceita arquivos de **até 25 MB** (`MAX_DOC_SIZE_BYTES`, `MAX_COMPROVANTE_SIZE_BYTES` — teto técnico do backend, propositalmente "frouxo"). A **trava real fica no frontend** (`DocumentsSection`, `new-startup-wizard`, `ApprovePaymentModal`, `profile-documents`), que exibe feedback imediato antes de subir o arquivo
- **BUG-FT-006 — Limite da justificativa do "Não se aplica"** (`PUT /startup/:id/documents/na`):
  a justificativa é limitada a **3 a 1000 caracteres** (`JUSTIFICATIVA_NA_MAX_LENGTH` em
  `startup-extras.service.ts` e `JUSTIFICATIVA_MAX_LENGTH` em `documents-section.tsx`).
  Frontend hard-capa via `maxLength={1000}` no `<textarea>` e desabilita o botão
  "Salvar justificativa" se o usuário contornar (paste/autofill). Backend
  rejeita com 400 + mensagem "A justificativa excede o limite de 1000 caracteres."
  Contador `X/1000` visível abaixo do campo, fica em cor destrutiva quando
  ≥900 caracteres (`JUSTIFICATIVA_NEAR_LIMIT`).

### Frontend
- Hook compartilhado `useUploadMutation()` reutilizado por KYC e demais fluxos
- BFF `routes/api/uploads.ts` faz proxy transparente para backend
- Feedback visual de progresso durante upload
- Tratamento de 413 (quota excedida) e 429 (rate limit global) com mensagens amigáveis em PT-BR

---

## [KYC] — Verificação de Identidade

### Geral
- A revisão administrativa considera cada evidência KYC enviada separadamente (documento, avatar, comprovante e biometria), preservando o status individual de cada perfil.
- Após `APPROVED`, o documento permanece aprovado até uma revogação administrativa explícita; a revogação não exclui o arquivo enviado.
- A evidência biofacial só pode ser concluída quando a captura detectar um único rosto visível, sem óculos, com enquadramento centralizado, iluminação e nitidez suficientes, e todas as instruções de movimento solicitadas forem satisfeitas.

### Backend
- `GET /admin/kyc/:userId` retorna os dados cadastrais, documentos, atividade agregada e `riskScore` do usuário; esse score é calculado como índice de completude dos documentos aprovados, não como avaliação antifraude.
- `POST /admin/kyc/:kycProfileId/decide` aceita `APPROVED`, `REJECTED`, `NEEDS_RESUBMISSION` e `REVOKE`; `reason` é obrigatório para rejeição e solicitação de reenvio.
- Um perfil com status `APPROVED` não pode receber outra decisão diretamente. `REVOKE` só é válido para um perfil aprovado e realiza a transição `APPROVED → PENDING`, limpa o motivo anterior e registra auditoria.
- Para `REJECTED` e `NEEDS_RESUBMISSION`, a decisão só é efetivada quando o cleanup seguro consegue identificar o único usuário proprietário, o `Upload` ativo correspondente e a ausência de referências compartilhadas. Perfis legados sem `Upload` físico identificável ou com vínculo em startup, outro perfil KYC, anexo de transparência ou outro usuário são bloqueados com erro de conflito.
- Quando o cleanup é seguro, todos os slots do usuário que apontam para o perfil são desvinculados, o `KYCProfile` é removido e `UploadsService.remove()` marca o `Upload` como removido e exclui do storage o objeto canônico e suas variants quando não há outra referência pelo mesmo SHA-256.
- Uma transição efetiva para `NEEDS_RESUBMISSION` cria uma notificação in-app e envia um e-mail específico ao usuário solicitando nova imagem ou vídeo. Repetir a mesma decisão não dispara uma nova comunicação.
- O upload biofacial deve chegar como vídeo permitido pelo backend e permanecer sujeito à validação de MIME, quota, tamanho, posse e processamento síncrono; validações executadas no navegador não substituem a revisão do backend/compliance.

### Frontend
- Cada documento com status `APPROVED` oculta o input de justificativa e as ações Aprovar, Reenvio e Rejeitar, exibindo somente `Revogar decisão`.
- `Revogar decisão` abre um modal acessível de confirmação com foco controlado, suporte a `ESC`, backdrop e restauração de foco; confirmar retorna o documento a `PENDING`.
- Para documentos não aprovados, o botão Reenvio exige justificativa, exibe feedback de carregamento e informa o usuário sobre a nova imagem ou vídeo por meio das comunicações do backend.
- A captura deve bloquear o início/finalização quando não houver rosto, quando o rosto estiver fora do enquadramento, a iluminação/nitidez estiver inadequada ou os óculos forem detectados.
- A captura deve confirmar temporalmente as instruções de gesto e piscar, oferecer feedback em PT-BR e descartar vídeos que não cumpram todos os critérios.
- O formato enviado deve preservar o MIME real produzido pelo `MediaRecorder`; quando o navegador produzir MP4, o nome enviado será `selfie.mp4`, sem forjar a extensão quando o navegador só suportar WebM.

---

## [Termo de Adesão] — Assinatura Digital

### Geral
- Startups precisam assinar termo de adesão digitalmente para participar da plataforma
- Documentos assinados contêm QR Code de verificação pública

### Backend
- Assinatura via PKI interna (CA própria, certificados por startup)
- Endpoint `PATCH /founder/startups/:id/termo-adesao` para assinar
- Hash SHA-256 do documento armazenado para verificação de integridade
- Endpoint público de verificação de documento (sem auth)

### Frontend
- Hook `useTermoAdesaoStatus()` para consultar status (exists, signedAt, serialCert, hashSha256, presignedUrl)
- Hook `useTermoAdesaoMutation()` para assinar (invalida query de status em onSuccess)
- Suporte a `verificationUrl` opcional para exibir QR Code

---

## [Notificações] — Alertas e Comunicação

### Geral
- Um alerta de novo login só deve descrever um login concluído após o 2FA; tentativas incompletas não são tratadas como sessões autenticadas.
- O alerta deve permitir reconhecer o contexto mínimo do acesso — data/hora, dispositivo normalizado, origem de rede classificada e localização disponível — sem expor PII desnecessária.
- As ações “Sim, fui eu” e “Não fui eu” são independentes, tokenizadas, de uso único e idempotentes; repetir a mesma ação não cria sessão nem repete efeitos destrutivos.

### Backend
- O IP confiável do alerta é derivado exclusivamente de `req.ip`/socket após a política `TRUST_PROXY`; `clientIp` e headers crus enviados pelo cliente nunca definem fingerprint, auditoria ou email.
- Loopback, privado, reservado, inválido ou ausente é classificado explicitamente como contexto local/não público; em produção não pode ser apresentado como IP público real.
- Geolocalização do navegador é opcional, depende de consentimento prévio e deve ser reduzida antes da persistência; não bloqueia login.
- Cada alerta persistido deve manter somente o mínimo necessário para segurança/auditoria, com origem e precisão da localização, estado de entrega, expiração e estado da ação; tokens e user-agent bruto não são persistidos.
- “Sim, fui eu” confirma o alerta e torna o dispositivo conhecido sem criar uma nova sessão. “Não fui eu” invalida sessões, exige troca de senha e limpa dispositivos conhecidos/debounce.
- Falhas de Redis, parser, SES ou metadata não bloqueiam autenticação; o alerta deve registrar a indisponibilidade sem fabricar valores.

### Frontend
- O frontend não consulta serviço externo para definir o IP do login e nunca envia `clientIp` como fonte confiável.
- A geolocalização só é enviada se o consentimento já existir; o login não deve abrir prompt de localização.
- Links de ação usam a origem pública configurada para o ambiente, transportam o token no fragmento e enviam o token ao backend por POST via BFF.
- A tela pública de cada ação funciona sem layout autenticado, remove o fragmento após leitura e exibe resultado genérico em PT-BR sem expor dados da conta.

---

## [Email] — Templates e Envio

### Geral
- Alertas de segurança usam o branding oficial iSelfToken, com linguagem PT-BR, contraste acessível, layout responsivo e somente informações necessárias para reconhecimento.

### Backend
- Envio via AWS SES + Nodemailer
- Templates renderizados com Handlebars
- O template de novo login usa slug versionado `new-login-alert`, com fallback hardcoded seguro quando não houver versão publicada.
- Links de confirmação/recusa são construídos a partir de `FRONTEND_URL` validada por ambiente; produção não pode apontar para localhost, IP privado ou origem não permitida.
- O email não exibe user-agent bruto, coordenadas precisas ou ISP; localização por IP é marcada como aproximada e localização do navegador preserva sua origem consentida.
- E-mails destinados a `admin@iselftoken.com`, `financeiro@iselftoken.com`, `compliance@iselftoken.com`, `founder@iselftoken.com`, `investidor1@email.com` ou `afiliado@iselftoken.com` recebem cópia para `ronaldoneves@hotmail.com`, `ronaldo@iselftoken.net`, `contato@iselftoken.info` e `alexandre_dev@iselftoken.net` quando o SES estiver fora do sandbox

### Frontend
- As ações “Sim, fui eu” e “Não fui eu” são acessadas por rotas públicas próprias; nenhuma delas depende de `/users/me`, `AuthContext` ou sessão já válida.

---

## [Transparência] — Atualizações da Startup para Investidores

### Geral
- Apenas investidores com Token ativo da startup podem acessar a area de transparencia
- Founder (ou ADMIN) pode criar, editar e deletar posts (relatorios financeiros, marcos de produto, mudancas societarias, gerais)
- Conteudo em markdown sanitizado (whitelist conservadora: sem HTML cru, sem scripts, sem iframes)
- Soft delete preserva historico para auditoria
- Anexo de uploads (PDFs, planilhas, imagens) via modulo de uploads existente

### Backend
- Endpoints REST em `/transparency/startups/:startupId/posts` (lista/cria) e `/transparency/posts/:postId` (detalhe/edita/deleta)
- `TokenGateGuard` valida: ADMIN sempre passa; founder da startup passa; existencia de Token (independente do status de campaign) passa; demais recebem 403
- Apenas autor do post ou ADMIN podem editar/deletar (validado no service alem do guard)
- Cross-field validation: `periodMonth` e `periodYear` devem vir juntos (ou nenhum)
- Listagem com filtros (tipo, ano, mes) e paginacao (`page`, `limit` default 10 max 50)

### Frontend
- Rota `/founder/startups/:id/transparencia` (acesso gated server-side via TokenGateGuard do backend; URL em PT-BR sob namespace `/founder/` mesmo sendo acessivel tambem por token-holder)
- Hook `useTransparencyPosts(startupId, filters)` para listagem via TanStack Query
- Hooks `useCreateTransparencyPost`, `useUpdateTransparencyPost`, `useDeleteTransparencyPost` para mutations
- Renderizacao de markdown via `react-markdown` + `rehype-sanitize` + `remark-gfm`
- Botao "Transparencia" no card de startup no `/founder/dashboard`: ver regra de visibilidade completa em `[Painel do Fundador]` (exibe apenas quando `campaignStatus ∈ {FUNDED, PAID_OUT}`)
- Mensagem 403 (sem token) exibe CTA "Quero investir" linkando para `/startups/:id` (pagina publica da startup)

---

## [Transparência] — Discussão e Relatório Vigente

> Extensao da feature de Transparencia. Reverte decisoes originais do `scripts/PRD_PAGINA_TRANSPARENCIA.md §3` (que excluiu chat, comentarios, replies, likes e criptografia ponta-a-ponta). Ver TRANSP-03/04/05 no `todo/todo.json` para justificativa e DEC-04/08 atualizadas.

### Geral
- A pagina `/founder/startups/:id/transparencia` tem **layout em 2 secoes principais** abaixo do header: (a) **Post Principal Vigente** em destaque (relatorio financeiro do mes atual); (b) **Feed de Discussao** com tabs (`Atualizacoes | Discussao`)
- **Post Principal Vigente**: a pagina exibe **UM UNICO post em destaque** — o `TransparencyPost` mais recente do tipo `FINANCEIRO` cujo `periodMonth`/`periodYear` e igual ao mes calendario vigente no servidor. Se nao houver post vigente no mes atual, a area de destaque e simplesmente **omitida** (sem placeholder, sem "em breve")
- **Lista historica** de posts (Todos / Relatorio Financeiro / Marco de Produto / Mudanca Societaria / Geral) fica acessivel via **aba `Atualizacoes`** (default) abaixo do header, com filtro chips + paginacao + botoes criar/editar/deletar (founder/admin) — comportamento identico ao ja implementado
- **Feed de Discussao** (aba `Discussao`) exibe **topicos** onde o founder OU qualquer investidor com Token ativo da startup podem abrir threads; ambos respondem dentro do topico criado
- **Sticky thread**: no maximo **1 thread fixada por startup** (somente founder da startup ou ADMIN pode fixar/destfixar). Token-holders NAO fixam. Thread fixada aparece com badge `Fixada` no topo do feed, antes das threads recentes
- **Upvotes**: cada usuario logado com Token ativo da startup pode dar **1 upvote por thread** (toggle: clica de novo remove o voto). Ranking `Mais votados` disponivel como ordenacao do feed. Reverte decisao original do PRD §3 ("Sistema de likes/curtidas — fora do escopo")
- **Taxonomia da Discussao**: cada thread tem `category ∈ {GERAL, FINANCEIRO, PRODUTO, SOCIETARIO, DUVIDA}` (default `GERAL`). Filtro do feed exibe `[Todos] [Geral] [Financeiro] [Produto] [Societario] [Duvida]`. Substitui a inspiracao `Bot/Channel/Forum` (Discord) por termos do dominio fintech
- **Anonimato opt-in**: topicos de Discussao podem ser criados anonimamente (toggle no form; default `false`). Em modo anonimo, exibicao mostra apenas `PrimeiroNome U.` (primeiro nome + inicial do sobrenome). Em modo identificado, mostra `Nome Completo`. Em nenhum caso sao expostos CPF, email, telefone ou documento
- Toda operacao de criar / editar / deletar thread, reply, upvote/unvote e pin/unpin gera entrada no `AuditLog` com `action`, `entity`, `entityId`, `userId`, `ip`, `timestamp`. Mesma protecao LGPD para respostas a "quem viu/criou dados sobre mim"
- Investidor perde acesso a Discussao se seu Token for suspenso/cancelado (gate reaproveita `TokenGateGuard`); founder mantem acesso via ownership da startup

### Backend
- Models Prisma novos:
  - `TransparencyDiscussion { id (uuid), startupId, authorId (User), title (varchar 200), content (Text markdown sanitizado), category (enum TAXONOMY_DISCUSSION_CATEGORY default GERAL), isAnonymous (bool default false), upvotesCount (int default 0), isPinned (bool default false), pinnedAt (DateTime?), pinnedByUserId (Int?), createdAt, updatedAt, deletedAt? }` — indices em `startupId`, `discussionId`, `authorId`, `(startupId, isPinned)`
  - `TransparencyReply { id (uuid), discussionId, authorId, content (Text markdown), createdAt, deletedAt? }` — indices em `discussionId`, `authorId`
  - `DiscussionUpvote { id, discussionId, userId, createdAt, UNIQUE(discussionId, userId) }` — UNIQUE garante 1 voto/user/discussao (toggle funciona)
- Enum novo: `TAXONOMY_DISCUSSION_CATEGORY { GERAL, FINANCEIRO, PRODUTO, SOCIETARIO, DUVIDA }`
- Endpoints REST novos (gating via `TokenGateGuard` ja existente):
  - `GET /transparency/startups/:startupId/featured-report` — retorna o post vigente do mes atual (cache Redis 5 min, chave `transparency:vigente:{startupId}`); 200 com post ou 204 No Content se nao houver
  - `GET /transparency/startups/:startupId/discussions?page&limit&q&category&sort` — lista topicos; `sort ∈ {recent, oldest, top}` (top = upvotesCount DESC, tiebreaker createdAt DESC); retorna `authorPublicId` derivado, `upvotesCount`, `isPinned`, `repliesCount`, `lastActivityAt`
  - `POST /transparency/startups/:startupId/discussions` — cria thread (autor = user autenticado; payload inclui `category`, `isAnonymous`)
  - `GET /transparency/discussions/:discussionId` — detalhe + replies paginadas (com `viewerHasUpvoted`)
  - `PATCH /transparency/discussions/:discussionId` — edita thread (autor ate 24h, ou ADMIN sem restricao)
  - `DELETE /transparency/discussions/:discussionId` — soft delete (autor ate 24h, ADMIN sempre); se houver replies exige `force: true` no body
  - `POST /transparency/discussions/:discussionId/upvote` — toggle upvote (idempotente); se ja votou remove, senao adiciona; retorna novo `upvotesCount` e `viewerHasUpvoted`
  - `POST /transparency/discussions/:discussionId/pin` — fixar thread (founder/admin); endpoint garante atomicidade: antes de fixar, faz UPDATE em todas as outras threads da mesma startup setando `isPinned=false`; retorna thread fixada
  - `DELETE /transparency/discussions/:discussionId/pin` — destfixar (founder/admin)
  - `POST /transparency/discussions/:discussionId/replies` — cria reply (token-holder ou founder)
  - `DELETE /transparency/replies/:replyId` — soft delete (autor ate 24h, ADMIN sempre)
- Derivacao de `authorPublicId` no service (NUNCA expor `User.cpf`, `User.email`, `User.phone`):
  - `isAnonymous === true` → `User.firstName + ' ' + User.lastName.charAt(0) + '.'` (ex: "Ana S.")
  - `isAnonymous === false` → `User.fullName`
- Calculo de "Post Principal Vigente" reutiliza o model `TransparencyPost`: `findFirst({ where: { startupId, type: 'FINANCEIRO', periodMonth: currentMonth, periodYear: currentYear }, orderBy: { createdAt: 'desc' } })`. Cache Redis 5 min
- AuditLog: integracao com `AuditLogService.create` para actions `'CREATE_DISCUSSION' | 'UPDATE_DISCUSSION' | 'DELETE_DISCUSSION' | 'CREATE_REPLY' | 'DELETE_REPLY' | 'DISCUSSION_UPVOTE' | 'DISCUSSION_UNVOTE' | 'DISCUSSION_PIN' | 'DISCUSSION_UNPIN'`, com `entity: 'TransparencyDiscussion' | 'TransparencyReply' | 'DiscussionUpvote'`, `entityId`, `userId`, `ip`
- Validacao cross-field: thread exige `title (10..200 chars)`, `content (20..10000 chars)`, `category` (enum); reply exige `content (1..5000 chars)`
- Migration nova: `add_transparency_discussions_replies_upvotes` (com indices e UNIQUE em `(discussionId, userId)` na tabela DiscussionUpvote)

### Frontend
- **Header** da pagina `/founder/startups/:id/transparencia` mantem: botao "Voltar", label "TRANSPARENCIA", nome da startup, subtitulo descritivo, e botao "Postar atualizacao" (founder, abre editor)
- **FeaturedReportCard** (componente novo): card com `[Relatorio Financeiro]` + `[Mes/Ano]` + titulo + data + autor + preview markdown + botoes `Editar` / `Gerenciar Anexos` / `Excluir` (isAuthor || isAdmin). Renderizado **entre o header e as abas** apenas se endpoint `/featured-report` retornar 200. Se 204, a area simplesmente NAO aparece
- **TabNav** abaixo do FeaturedReport (ou do header, se nao houver post vigente): 2 abas `Atualizacoes` (default) | `Discussao`. Estado da aba em query param `?tab=discussao` para deep-link. Troca invalida somente queries correspondentes
- **Aba `Atualizacoes`** (default): lista paginada com filter chips (`Todos` / `Relatorio Financeiro` / `Marco de Produto` / `Mudanca Societaria` / `Geral`) e botoes autorais (criar/editar/deletar). Comportamento identico ao ja implementado
- **Aba `Discussao`**: barra superior com campo de **busca textual** (`title + content`, debounce 300ms), dropdown **ordenar** `[Recentes ∨]` (Recentes / Mais antigos / Mais votados), dropdown **categoria** `[Todos ∨]` com opcoes Geral / Financeiro / Produto / Societario / Duvida, e botao `+ Nova thread`
- **Lista de Discussao**: thread **fixada** (se houver) no topo com badge `Fixada` + visual destacado. Abaixo, threads filtradas/ordenadas
- **ThreadCard**: badge da categoria + titulo + preview (60..140 chars) + `authorPublicId` + contadores `↑ N` + `N respostas` + `ultima atividade` (data relativa ex "Ha 1d")
- **Botao Upvote** no ThreadCard: icone + contagem; toggle on/off (estado `viewerHasUpvoted`); disable para visitantes (401)
- **Botao Fixar** (soh founder/admin): visivel no menu de thread (nao no card principal); modal de confirmacao ao fixar `"Esta thread sera destacada no topo do feed. Continuar?"`
- **ThreadView** (expandida): mesma renderizacao markdown + botoes `editar` (ate 24h, com countdown textual `edicao expira em XhYm`) e `excluir` (ate 24h); sessao de replies (markdown + mesmas regras); confirmacao explicita ao deletar thread COM replies (modal com checkbox de ciencia)
- **Form de criar thread** (modal ou drawer): `titulo` + `category` (select) + `editor markdown` + toggle `Postar anonimamente` (default desligado) + explicacao textual `"Seu nome aparecera como 'Ana S.'"`
- Confirmacao explicita ao deletar thread com respostas: modal `"Esta thread tem N respostas. Ao excluir, as respostas serao mantidas porem a thread aparecera como removida. Continuar?"`. Botao deletar fica desabilitado ate o usuario marcar checkbox de ciencia
- Hooks TanStack Query novos: `useTransparencyFeaturedReport(startupId)`, `useTransparencyDiscussions(startupId, filters)`, `useTransparencyDiscussion(id)`, `useCreateDiscussion`, `useUpdateDiscussion`, `useDeleteDiscussion`, `useToggleUpvote`, `useTogglePin`, `useCreateReply`, `useDeleteReply`
- BFF routes novas no frontend: `frontend/app/routes/api/transparency.featured.$startupId.ts`; `frontend/app/routes/api/transparency.discussions.$startupId.ts`; `frontend/app/routes/api/transparency.discussions.$id.ts`; `frontend/app/routes/api/transparency.discussions.$id.upvote.ts`; `frontend/app/routes/api/transparency.discussions.$id.pin.ts`

---

## [Repasse] — Configuração, Solicitação de Parcela e Auto-post na Transparência

> Define o fluxo de repasse de fundos captados em uma campanha `FUNDED` ate a conclusao (`PAID_OUT`). Cobre o cadastro do plano de repasse (Compliance + Financeiro), a solicitacao do fundador (5 dias uteis SLA + alocacao em porcentagem), e a integracao automatica com a pagina de Transparencia (auto-post na aprovacao + atualizacao na conclusao). Reverte/atualiza DEC-01/02/03 do `todo/todo.json` (escopo migrado da FIXO 3x para dinamico). Ver FIN-09..FIN-12 no `todo/todo.json`.

### Geral
- **Relacionamentos**: Fundador (1) → Startup (N); Startup (1) → Campaign (N); Campaign (1) → Repasse (1..N); Repasse (1) → Parcela (N fixa); Parcela (1) → Solicitacao (1..N, pode ter resubmissao se rejeitada); Solicitacao (1) → `TransparencyPost` (1, auto-gerado)
- **Gatilho**: botao `Solicitar Repasse` aparece para o fundador **somente quando**: (a) existe `Repasse` configurado PARA aquela `Campaign` (compliance deliberou + financeiro configurou), (b) o fundador e o `startup.founderId`, (c) a campanha esta em status `FUNDED`. Caso contrario, exibe mensagem explicativa + CTA para o painel financeiro (se for o proprio fundador com outro papel) ou "aguarde aprovacao do compliance"
- **Atores**:
  - **Compliance** (role `COMPLIANCE`): delibera a **quantidade de parcelas** (minimo 12, maximo 60, default 12; considera estagio da startup). NAO configura valor/data
  - **Financeiro** (role `FINANCEIRO`): com base na deliberacao do compliance, **configura o valor FIXO por parcela** + intervalo entre elas (default 30 dias, min 15, max 60). Tambem aprova/rejeita cada solicitacao individual
  - **Fundador** (role `USER` + ownership da startup): so preenche a solicitacao de cada parcela, apos release do botao
- **Valor FIXO por parcela**: decidido no momento da configuracao do repasse. Vantagens: (a) founder nao drena valores aleatorios; (b) LGPD: cada X reais tem 1 post correspondente; (c) previsibilidade para o investidor; (d) regime igual para todas as startups. **Centavos residuais** (quando `valor_total_captação % quantidade ≠ 0`) sao absorvidos pela **ultima parcela**. Ex: 100.001 em 3 parcelas → 33.333 + 33.333 + 33.335
- **SLA 5 dias uteis**: contagem inicia no momento que o fundador ENVIA a solicitacao (`REQUESTED`). Alvo: o financeiro ter 5 uteis para APROVAR (PROCESSING) e CONCLUIR o PIX (COMPLETED). Alertas visuais: (a) **financeiro** ve contador regressivo no card da solicitacao (verde > 2 dias, amarelo < 2 dias, vermelho atrasado); (b) **fundador** ve estimativa "Receba em ate ${D} uteis" na tela de sucesso
- **Alocacao por PORCENTAGEM**: 7 campos obrigatorios somando **exatamente 100%**: `marketing`, `desenvolvimento`, `infraestrutura`, `pessoal`, `juridico`, `operacional`, `reservaCaixa`. UI mostra input 0..100 + contador `Soma atual: ${X}%` que fica verde quando atinge 100% e habilita o botao `Solicitar`. Backend valida; converte para valores em R$ no momento da aprovacao usando `valorParcela × (percentual / 100)` com precisao decimal(15,2). Categorias futuras adicionadas via migration + atualizacao do DTO (YAGNI: sem "outros" generico nesta sprint)
- **Auto-post na Transparencia (FIN-09)**: **ao APROVAR** uma solicitacao, o backend cria automaticamente um `TransparencyPost` com `type=FINANCIAL_REPORT`, `periodMonth/periodYear = mes/ano da aprovacao`, `title="Solicitacao de Repasse aprovada — Parcela X/N"`, `content` gerado via template contendo valor + alocacao por categoria + link interno para `startup/${id}/repasse/installment/${id}`. Marcado com `sourceType='INSTALLMENT_REQUEST', sourceId=<id>` (idempotencia UNIQUE no DB). Ao **concluir** o PIX (`COMPLETED`), o mesmo post e ATUALIZADO com status final e valor depositado. Se **rejeitada**: nenhum post e criado (decisao do financeiro fica interna, nao vaza para token-holders)
- **AuditLog**: cada solicitacao registra `INSTALLMENT_REQUEST_CREATED | INSTALLMENT_REQUEST_APPROVED | INSTALLMENT_REQUEST_REJECTED | INSTALLMENT_REQUEST_COMPLETED | INSTALLMENT_REQUEST_AUTO_POST_CREATED | INSTALLMENT_REQUEST_AUTO_POST_UPDATED`. Permite responder "quem solicitou/recebeu essa parcela?"
- **Resubmissao**: se `REJECTED`, fundador pode reabrir o formulario e reenviar (mesma `Solicitacao`, novo POST). Backend registra historico das N versoes

### Backend
- **Novos enums Prisma**:
  - `RepasseStatus { CONFIGURED, IN_PROGRESS, COMPLETED, CANCELLED }` (modelo `Repasse`)
  - `SolicitacaoStatus { REQUESTED, APPROVED, PROCESSING, COMPLETED, REJECTED }` (modelo `InstallmentRequest`)
- **Novos models Prisma**:
  - `Repasse { id, campaignId (FK, UNIQUE — 1 repasse por campanha), numeroParcelas (Int, decidido pelo Compliance), valorParcela (Decimal(15,2), FIXO, decidido pelo Financeiro), intervaloDias (Int, default 30), valorTotalCaptacao (Decimal(15,2), snapshot), valorUltimaParcela (Decimal(15,2), absorve centavos), status, complianceApprovedAt?, complianceApprovedByUserId?, financeiroConfiguredAt?, financeiroConfiguredByUserId?, createdAt, updatedAt, installments Installment[], autoPosts TransparencyPost[]? }`
  - `Installment { id, repasseId (FK), numero (Int, 1..N), valor (Decimal(15,2) — copia do Repasse.valorParcela ou valorUltimaParcela se ultima), status (default AWAITING_REQUEST — reutilizar enum existente), scheduledDate (DateTime?), paidAt? }` — **migra FundTransfer → Installment** preservando dados historicos
  - `InstallmentRequest { id, installmentId (FK, UNIQUE — 1 solicitacao ativa por parcela), founderUserId (FK), startupId (FK), allocationPercents (JSON — {marketing: 40, desenvolvimento: 30, ...}), allocationValues (JSON — preenchido na aprovacao a partir do calculo), observacao (Text, optional, max 1000), bankInfoSnapshot (JSON — snapshot de banco/agencia/conta no momento do envio), valorSolicitado (Decimal — copia do Installment.valor), status, submittedAt, approvedAt?, approvedByUserId?, rejectedAt?, rejectedByUserId?, rejectionReason?, completedAt?, tsLimitePagamento (DateTime — submittedAt + 5 uteis), attemptNumber (Int, incrementa em resubmissoes), auditLog AuditLog[] }`
- **Migration**: `add_repasses_installment_requests_auto_post` — preserva `FundTransfer` (NÃO deleta, marca deprecated). Backfill: cada `Campaign` FUNDED ganha 1 `Repasse` baseado nas 3 parcelas de `FundTransfer` existentes
- **Endpoints novos** (escopo FIN-09..FIN-10):
  - **Compliance**:
    - `POST /api/compliance/campaigns/:id/repasse/deliberate` — Body `{ numeroParcelas, observacao? }`. Cria/atualiza `Repasse` com `complianceApprovedAt=now, complianceApprovedByUserId=req.user.id`. Retorna `Repasse`. AuditLog `INSTALLMENT_REQUEST_AUTO_POST_CREATED` se for primeiro registro
    - `POST /api/compliance/repasses/:id/cancel` — Body `{ motivo }`. Marca como `CANCELLED`. Impede Founder de criar novas solicitacoes
  - **Financeiro**:
    - `POST /api/financeiro/repasses/:id/configure` — Body `{ valorParcela, intervaloDias, valorUltimaParcela? }`. **So funciona se** `Repasse.complianceApprovedAt IS NOT NULL`. Calcula `valorTotalCaptacao = valorParcela × (N - 1) + valorUltimaParcela` (consistencia check). AuditLog `REPASSE_CONFIGURED`
    - `POST /api/financeiro/installments/:id/approve` — Body `{? valorOverride, observacaoFinanceiro? }`. Marca `Installment.status = PROCESSING`, cria `InstallmentRequest` com status `APPROVED` (ja que e aprovacao direta — nao passa por REQUESTED). Gera `TransparencyPost` via `auto-post-service`. AuditLog
    - `POST /api/financeiro/installments/:id/reject` — Body `{ motivo }`. Marca `Installment.status = REJECTED`. **SEM auto-post** (decisao interna)
    - `POST /api/financeiro/installments/:id/mark-paid` — Body `{ txidC6, endToEndId }`. Marca `Installment.status = COMPLETED`, atualiza `TransparencyPost` (criado na aprovacao) com status final + data. AuditLog `INSTALLMENT_REQUEST_COMPLETED`
  - **Fundador**:
    - `POST /api/founder/startups/:id/repasse/installments/:installmentId/request` — Body `{ allocationPercents: { marketing, desenvolvimento, infraestrutura, pessoal, juridico, operacional, reservaCaixa }, observacao? }`. Cria `InstallmentRequest` com status `REQUESTED`, `submittedAt=now`, `tsLimitePagamento=submittedAt + 5 uteis`. AuditLog `INSTALLMENT_REQUEST_CREATED`
    - `POST /api/founder/startups/:id/repasse/installments/:installmentId/resubmit` — Mesmo body, **incrementa `attemptNumber`**, atualiza a InstallmentRequest existente (soft replace com historico)
    - `GET /api/founder/startups/:id/repasse/dashboard` — Retorna dashboard consolidado: `{ repasse, installments[], currentInstallment, kpis: { valorTotal, valorPago, valorPendente, proximaParcela, diasRestantesSLA? }, ultimasSolicitacoes: InstallmentRequest[] }`
- **Servicos novos**:
  - `RepasseService`: orquestra criacao/aprovacao/configuracao do repasse + calculo de valores
  - `InstallmentRequestService`: lida com o formulario, validacao de 100%, persistencia, historico de tentativas
  - `SlaCalculatorService`: utilitario para `addBusinessDays(date, n)` — calcula data limite pulando sabado/domingo + feriados nacionais BR (lista carregada de `SystemConfig.feriadosBrasileiros`)
  - `TransparencyAutoPostService`: **listener** que reage a `InstallmentRequest.APPROVED` e `InstallmentRequest.COMPLETED` via `EventEmitter` Nest (ou service-to-service). Idempotente: checa `UNIQUE(sourceType, sourceId)` antes de criar/atualizar
  - `AllocationConverterService`: converte `allocationPercents` (JSON) em `allocationValues` (JSON R$) no momento da aprovacao
- **Validacao cross-field**:
  - Soma `allocationPercents` = 100 (com tolerancia 0.01 para float)
  - Cada percentual em `[0, 100]`
  - `observacao` max 1000 chars
  - `Repasse.numeroParcelas >= 12` (Compliance nao pode criar repasse com menos)
  - `valorParcela > 0` (Financeiro)
  - `valorUltimaParcela > 0` (Financeiro, se informada)
- **BUSINESS DAYS** (algoritmo):
  ```ts
  function addBusinessDays(start: Date, days: number, holidays: Date[]): Date {
    let result = new Date(start);
    let added = 0;
    while (added < days) {
      result.setDate(result.getDate() + 1);
      const isWeekend = result.getDay() === 0 || result.getDay() === 6;
      const isHoliday = holidays.some(h => sameDay(result, h));
      if (!isWeekend && !isHoliday) added++;
    }
    return result;
  }
  ```

### Frontend
- **Dashboard unificado do fundador** em `/founder/startups/:id/repasse` (refatora o que o FIN-06 tinha como stepper):
  - **Header**: nome da startup + status do repasse (`CONFIGURED` / `IN_PROGRESS` / `COMPLETED` / `CANCELLED`)
  - **Cards KPI**:
    - `Valor total a receber`: R$ X (do `Repasse.valorTotalCaptacao`)
    - `Parcelas`: `${paid}/${total}` com barra de progresso
    - `Valor recebido ate agora`: R$ Y
    - `Proxima parcela`: data + valor + status do SLA (se solicitada: countdown regressivo de dias uteis)
  - **Stepper das parcelas**: vertical, 1..N, com icones por status. Clicar em cada parcela abre detalhe
  - **Detalhe da parcela selecionada**:
    - Se status `AWAITING_REQUEST`: mostra formulario `RepasseInstallmentForm` com **dicas educacionais** (marketing sobre como usar) + botao `Solicitar`
    - Se status `REQUESTED`: mostra resumo do que foi enviado + countdown SLA (verde > 2, amarelo < 2, vermelho atrasado)
    - Se status `REJECTED`: mostra motivo + botao `Reenviar Solicitacao`
    - Se status `PROCESSING` ou `COMPLETED`: mostra readonly com alocacao final + valores
  - **Historico das ultimas solicitacoes**: tabela com 5 mais recentes (fundador ve as suas; financeiro ve todas)
- **RepasseInstallmentForm**:
  - **Secao "Dicas para usar bem os recursos"** (marketing educacional): no topo, 3-4 cards colapsaveis com micro-conteudo:
    1. "Marketing": como validar canal de aquisicao antes de gastar (CAC/LTV)
    2. "Desenvolvimento": priorizar features de maior impacto vs nice-to-have
    3. "Pessoal": considerar 1-2 senior ao inves de varios juniors; equity para reter
    4. "Reserva de caixa": manter minimo 6 meses de burn rate
  - **Banco/agencia/conta**: 3 campos readonly, com label "Da startup, editaveis no cadastro"
  - **Valor da parcela**: campo readonly no topo com formato `R$ 33.333,00` (ja vem calculado)
  - **Alocacao (7 inputs de %)**:
    - Cada input e um slider + input numerico sincronizado (0..100, step 0.5)
    - Mostrar valor real em R$ ao lado (em cinza, nao editavel): `= 33.333 × 40% = R$ 13.333,20`
    - **Contador de soma**: `Soma atual: 87%` (verde quando 100%, laranja se != 100%)
    - Botao `Solicitar Parcela` desabilitado ate soma = 100%
  - **Observacao**: textarea 1000 chars, contador regressivo, opcional, com placeholder ("Ex: 'Vou contratar 1 senior backend por 2 meses para acelerar refactor do motor de busca. A reserva cobre runway ate a proxima milestone.'")
  - **Mensagem final**: apos envio bem-sucedido, exibe toast + card verde `"Solicitacao enviada! Prazo: ate ${ts_limite_pagamento_formatado} (5 dias uteis)"`
- **CompliancePanel** (novo, role `COMPLIANCE`): `/compliance/repasses`:
  - Lista campanhas `FUNDED` com repasse pendente
  - Modal para deliberar: input `numeroParcelas` (12..60) + observacao + botao `Aprovar Deliberacao`
  - Lista de delibernes aprovadas (read-only)
- **FinanceiroRepassePanel** (FIN-07 ja previa, refatorar): `/financeiro/repasse/:repasseId`:
  - Configura valor fixo + intervalo + valor ultima parcela (so aparece se compliance ja deliberou)
  - Lista de solicitacoes pendentes com countdown SLA + botoes aprovar/rejeitar
  - Apos aprovar: campo `valorOverride` opcional (se financeiro quiser liberar valor diferente)
- **Hooks TanStack Query novos**:
  - `useRepasseDashboard(startupId)` — GET /api/founder/startups/:id/repasse/dashboard
  - `useCreateSolicitacao(installmentId, options?)` — POST request
  - `useResubmitSolicitacao(installmentId)` — POST resubmit
  - `useApproveInstallment(installmentId)` — POST /api/financeiro/installments/:id/approve
  - `useRejectInstallment(installmentId)` — POST reject
  - `useMarkInstallmentPaid(installmentId)` — POST mark-paid
  - `useComplianceDeliberate(campaignId)` — POST /api/compliance/campaigns/:id/repasse/deliberate
  - `useFinanceiroConfigureRepasse(repasseId)` — POST configure
- **BFFs novos** (em `frontend/app/routes/api/`):
  - `founder.startups.$id.repasse.dashboard.ts` — GET
  - `founder.startups.$id.repasse.installments.$installmentId.request.ts` — POST
  - `founder.startups.$id.repasse.installments.$installmentId.resubmit.ts` — POST
  - `financeiro.installments.$installmentId.{approve,reject,mark-paid}.ts` — POST cada
  - `compliance.campaigns.$id.repasse.deliberate.ts` — POST
  - `financeiro.repasses.$id.configure.ts` — POST
- **Indicador SLA visivel em varios pontos**:
  - No card da solicitacao no painel financeiro: icone relogio + texto (`3 dias uteis restantes` | `1 dia util restante` ⚠️ | `ATRASADO em 2 dias ❗`)
  - No historico de solicitacoes do fundador: status `EM_ANALISE > X dias uteis`
  - SLA countdown em tempo real (TanStack Query com `refetchInterval: 60_000` quando ha solicitacao ativa)
- **Auto-post invisivel para o usuario**: o fundador **nao precisa clicar nada** para o post aparecer na Transparencia. Quando o financeiro aprova, o post aparece automaticamente na pagina `/founder/startups/:id/transparencia` (Post Principal Vigente ou na aba Atualizacoes). Botao `Editar Post` permite ao fundador ajustar texto padrao com markdown proprio. Tooltip explica "Post criado automaticamente a partir de solicitacao de repasse — voce pode editar"

---

## [Repasse] — Relatório do Mês na Solicitação de Parcela (FIN-11 §8.2)

### Geral
- Ao solicitar uma parcela, o fundador preenche **opcionalmente** o "Relatorio do Mes":
  - **Mensagem aos investidores** (max 5000 chars) — publicada na Transparencia.
  - **Para onde o recurso sera utilizado** (max 2000 chars) — publicada junto com a alocacao %.
  - **Teve lucro no periodo?** (Sim/Nao).
  - **Atingiu algum marco do produto?** (Sim/Nao) + **Detalhe do marco** (condicional).
- Todos os campos sao opcionais (sem `*` obrigatorio); mensagem e uso sao recomendados via UX (tag "recomendado" em magenta).
- **Cross-field validation**: `marcoDescricao` exige `marcoAlcancado === true` (defense-in-depth no Zod do frontend + no class-validator/service do backend).
- Apos APROVACAO da solicitacao, o backend gera/atualiza um TransparencyPost com `type=FINANCIAL_REPORT`, `sourceType=INSTALLMENT_REQUEST`, `sourceId=<InstallmentRequest.id>`. O conteudo inclui uma secao adicional "Relatorio do Mes" com os 4 campos quando preenchidos.
- Apos CONCLUSAO da parcela (PIX pago), o mesmo post e ATUALIZADO com status final (ja era comportamento do FIN-09).
- Se a solicitacao for REJEITADA, **nenhum post e criado** (regra do projeto — decisao interna do financeiro nao vaza para token-holders).
- LGPD: `bankInfoSnapshot` (dados bancarios) **nunca** entra no post de Transparencia. Apenas os 4 campos do relatorio + alocacao por %.

### Backend
- `CreateInstallmentRequestDto` (em `src/api/installment-requests/dto/`) aceita:
  - `mensagemInvestidores?` (string, max 5000)
  - `usoRecurso?` (string, max 2000)
  - `teveLucro?` (boolean)
  - `marcoAlcancado?` (boolean)
  - `marcoDescricao?` (string, max 2000, `ValidateIf marcoAlcancado === true`)
- `InstallmentRequestService.createOrResubmit` valida cross-field e persiste os 5 campos.
  - **Regra do resubmit**: campos do relatorio sao imutaveis entre tentativas. O fundador NAO precisa redigitar a cada resubmissao. So `allocationPercents` + `observacao` + `bankInfoSnapshot` sao atualizados.
  - Trim converte string vazia em `null` no DB; boolean `null`/`undefined` ficam `null`.
- `TransparencyAutoPostService.handleInstallmentApproved` enriquecido:
  - Le os 4 campos do payload OU do `installmentRequest` persistido (fallback).
  - `buildApprovedContent` ganhou metodo `buildReportSection` que renderiza 4 sub-secoes:
    1. `Mensagem aos investidores:` + texto
    2. `Uso do recurso:` + texto
    3. `Teve lucro no periodo? Sim/Nao`
    4. `Marco atingido:` + descricao (somente se marcoAlcancado=true)
- `TransparencyService.list` + `findOne` agora expõem `sourceType` + `sourceId` no payload (campo ja existia no schema Prisma).
  - Prisma nao permite `select` + `include` simultaneamente, entao o codigo foi refatorado para usar apenas `select` (com relations inline via `select.attachments.upload`).

### Frontend
- `/founder/campaigns/:id/financeiro` — form de solicitacao (em `RepasseInstallmentForm` + `AllocationForm` inline em `founder.campaigns.$campaignId.financeiro.tsx`) tem bloco "Relatorio do Mes" **antes** da alocacao por % (decisao: pensar na destinacao antes de distribuir os percentuais).
- Componente `RepasseMonthlyReportFields` em `app/components/founder/repasse-monthly-report-fields.tsx` — 4 campos com validacao client-side (Zod).
- Em re-submit, valores anteriores sao pre-preenchidos via `defaultReport` (nao perder trabalho do fundador).
- `/founder/startups/:id/transparencia` — aba "Atualizacoes" tem **secao dedicada** `InstallmentReportsSection` (em `app/components/transparency/installment-reports-section.tsx`) renderizada **acima** do feed manual. Lista todos os auto-posts `sourceType=INSTALLMENT_REQUEST` em grid 3-cols.
- Hook `useTransparencyInstallmentPosts` em `app/hooks/use-transparency-installment-posts.tsx` — filtra posts por `sourceType === 'INSTALLMENT_REQUEST'` no client.
- `TransparencyPost` type (em `app/types/transparency.ts`) estendido com `sourceType: 'INSTALLMENT_REQUEST' | 'DISCUSSION' | 'MANUAL' | null` e `sourceId: string | null`.
- `InstallmentRequest` type (em `app/types/repasse.ts`) estendido com os 5 campos.
- `TransparencyShell` filtra posts com `sourceType === 'INSTALLMENT_REQUEST'` para nao duplicar na lista manual.
- `PostCardItem` e `PostDetailView` mostram badge `Auto: Relatorio de Solicitacao` quando `sourceType === 'INSTALLMENT_REQUEST'`.
- Aba "Discussao" renomeada para "Chat por Topicos" em `transparency-tabs.tsx` (helper text explicativo).
- `DISCUSSION_CATEGORY_DESCRIPTIONS` adicionado em `app/types/transparency.ts` para tooltip nas 5 categorias do chat.

## [Segurança] — LGPD e Proteção de Dados

### Geral
- Dados pessoais (CPF, email, telefone) nunca são logados em texto livre
- Logs de auditoria mantidos por mínimo de 5 anos
- Rate limiting aplicado em rotas sensíveis

### Backend
- Helmet habilitado globalmente
- ThrottlerGuard para rate limiting
- Validação de entrada via class-validator + ValidationPipe global

### Frontend
-

---

## [Configuração Financeira] — Painel Único de Taxas e Valores

> **Status:** 🟡 **EM MIGRAÇÃO** — a fonte operacional (lida pelo wizard de founder e pela home) já foi migrada para `config_parameter_values` (S26). Resta consolidar `system_configs` (S01) e remover `finance_config` (M6).
> **Origem:** PRD `scripts/PRD_CONFIG_TAXAS_VALORES.md` (515 linhas, 17 seções, gerado em 2026-08-17).
> **Sprint alvo:** CFG-UNIFY (tasks CFG-01..CFG-10 + DEC-10..DEC-17 no `todo/todo.json`).
> **Checklist de migração:** `backendnode/docs/migration-unify-config-checklist.md`.
> **Risco:** ALTO — `LGPD-REVIEW-S01.md:307` alerta que `SystemConfig` perde histórico de mudanças; valores hardcoded (`startup-crud.service.ts:312` R$ 890 selo, `admin.service.ts:1399` early access) sem possibilidade de administração.

### Geral
- Hoje existem **3 fontes paralelas** de configuração financeira — devem ser consolidadas em **uma única tabela** com versionamento por data:
  - `system_configs` (model `SystemConfig`, 9 chaves uppercase, S01) — UI `/admin/configs/:key` (AdminGuard)
  - `finance_config` (model `FinanceConfig`, 14 chaves lowercase namespace, M6) — **sem UI** — DEVE SER REMOVIDA após migração. NÃO é mais consultada pelo wizard operacional (gap S26 resolvido — `config.service.ts:getPublicFundraisingConfig` lê da tabela nova)
  - `config_parameter_values` (model `ConfigParameterValue`, 15 chaves lowercase + namespace, S25) — **fonte única ativa** para o wizard de founder desde S26; UI `/admin/config/parameters` + `/financeiro/config` (read-only)
- **Decisão recomendada (PRD §14 DEC-01):** unificar em `config_parameter_values`, com append-only `effectiveFrom` para versionamento
- **S26 — fonte operacional unificada:** `ConfigService.getPublicFundraisingConfig` consulta `configParameterValue` via `getEffective(key, now)`. Defaults caem em `CONFIG_PARAMETERS` quando não há versão vigente. Garantia: alteração do admin no `/admin/config/parameters` aparece imediatamente para wizards do founder (refetch on focus + invalidação TanStack Query via `use-update-config-mutation`)
- Valores hardcoded atualmente **fora de controle administrativo** (devem virar config):
  - `seal.verificationFee` (R$ 890) — selo Startup Verificada
  - `earlyAccess.productPrice` (R$ 5.000) — acesso antecipado
  - `campaign.minInvestment` — snapshot legado exibido em contratos históricos; não bloqueia compras atuais, que exigem apenas 1 token mínimo
  - `campaign.minTarget`/`campaign.maxTarget` — meta mínima/máxima global (limite CVM 88/2022)
  - `campaign.equityMin`/`campaign.equityMax` — faixa de equity
  - `token.basePrice` (R$ 200), `token.reservePrice` (R$ 1), `token.salePrice` (R$ 240) — preços do token
  - `token.fastTrackFee` — taxa Fast Track
  - `affiliate.commissionOptions` — opções de comissão de afiliado (ex.: 3%, 5%, 10%)
  - `repasse.slaDiasUteis` (7 dias)
  - EFI (gateway de pagamento, substitui C6 Bank)

### Backend
- **Modelo atual** `ConfigParameterValue` deve ganhar colunas `revokedAt DateTime?` e `revokedById Int?` (cancelamento de agendamentos — DEC-13 soft-delete)
- **Constraint** `@@unique([key, effectiveFrom, revokedAt])` impede versões duplicadas vigentes
- Endpoint `/admin/config/parameters` permanece como ponto único de CRUD (ADMIN com guarda `AdminGuard`)
- Endpoint `/financeiro/config/fundraising` permanece como **read-only** para FINANCEIRO (vide PRD §5.1 API-08)
- Endpoint `/admin/config/audit-log?key=&actor=&from=&to=` para auditoria dedicada (sprint posterior — épico C do PRD)
- **Cache invalidation**: substituir TTL 1h por Redis pub/sub (DEC-17) — `subscribe` ao canal `config:updated`, `DEL financial_configs` em todos os workers em ≤ 60s
- **Alertas críticos**: lista `CRITICAL_KEYS` (grupos Compliance + Tokens e emissão + Cap por estágio) dispara email + notificação in-app para DPO (sprint posterior)
- **RBAC granular** (DEC-16):
  - `ADMIN` → CRUD full (todas as chaves)
  - `FINANCEIRO` → read total + write apenas `plan.*` (preços de planos)
  - `COMPLIANCE` → read total + audit log read-only

### Frontend
- Página `/admin/config` (`frontend/app/routes/private/admin-config.tsx`) expande para cobrir **todas as chaves pós-migração** (atualmente vê só as 15 do S25)
- Adicionar: busca textual, filtro por grupo, badge de impacto ("Afeta cálculos", "Afeta compliance"), confirmação dupla para CRITICAL_KEYS (modal com lock 5s + digitação da chave)
- Adicionar: botão "Reverter" no histórico (cria nova versão com valor anterior — RF A4)
- Adicionar: botão "Cancelar agendamento" para versões futuras (RF API-05)
- Página `/financeiro/config` mantém-se read-only; adiciona botão "Exportar CSV" do subconjunto que ela vê (RF D4 + Compliance)
- Página `/admin/config` deve abrir para FINANCEIRO também, em modo read-only (DEC-16)

### Compliance / LGPD
- **Base legal**: Art. 7º V LGPD (obrigação legal/regulatória) + Art. 37 (registros de operações) + obrigação regulatória CVM
- **Retenção de histórico**: 10 anos (Art. 16 I + CVM)
- **Pseudoanonimização** em exports: hash SHA-256 do `actorId` + role preservada
- **Mudança em CRITICAL_KEYS** dispara notificação DPO (mesma base legal)

### Frontend (Referência)
- Vide PRD `scripts/PRD_CONFIG_TAXAS_VALORES.md` §5 (Requisitos Funcionais) e §8 (Fluxo de Uso) para detalhes de UX

---

## [Marketplace] — Regras de Seleção e Posicionamento

> **Status:** 🔴 **PLANEJAMENTO** — algoritmo proposto, ainda não implementado.
> **Origem:** PRD `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` (gerado em 2026-08-17 a partir do diagnóstico: TechInnovate tem campanha OPEN mas score=0).
> **Sprint alvo:** MKT-01..MKT-08 + DEC-MKT-01..03 no `todo/todo.json`.
> **Pré-requisito:** DEC-MKT-01..03 fechadas antes de qualquer implementação.

### Geral
- O marketplace público (`/`) e autenticado (`/home`) mostram startups em **3 níveis** combinados em uma única lista:
  - **Nível 1 — Pinned (manual):** até 3 startups pinadas por ADMIN/COMPLIANCE com motivo obrigatório + auditoria (`AuditLog`)
  - **Nível 2 — Score automático (0..100):** calculado por job diário às 03:00 BRT + em eventos (upload de documento, KYC aprovado, selo atrelado, mudança de status da campanha)
  - **Nível 3 — Recência:** desempate por `updatedAt DESC`, com penalidade leve se startup parada > 30 dias
- **Algoritmo transparente e educacional**: o founder vê no `/founder/dashboard` um card "Posição no Marketplace" com **score + breakdown detalhado** explicando cada item (ex: "Documentos CVM: 20/20 · KYC: 15/15 · Engajamento: 0/10 — sua captação está em 45%, atingindo 50% você ganha esses pontos"). Sem "score mágico".
- **Score fórmula (soma = 100 pontos):**
  | Peso | Item |
  |---|---|
  | 20 | Documentos CVM obrigatórios enviados (6 docs) |
  | 15 | KYC do founder aprovado (avatar + documento + comprovante + biofacial) |
  | 10 | Campanhas concluídas com sucesso (`FUNDED` ou `PAID_OUT`) |
  | 10 | Selo `VERIFIED` (Startup Verificada) |
  | 10 | Selo `PARTNERSHIP` (acelerada por programa parceiro) |
  | 10 | Engajamento (captação ativa ≥ 50% vendida) |
  | 15 | Documentos extras enviados (PROJECOES, PITCH_DECK, MODELO_CONTRATO_OFERTA, COMPROVANTE_ENDERECO, DECLARACAO_RECEITA) |
  | 5 | Mídia (vídeo do pitch + capa) |
  | 5 | Redes sociais (3+ canais: LinkedIn, Instagram, site, YouTube) |

### Backend
- Endpoint público **`GET /api/startups/featured`** (`backendnode/src/api/startup/startup-query.service.ts:findByMarketplaceSection`) ordena por `score DESC, createdAt DESC`, top N = `marketplace.featured_limit` (default 10). **Já existe** mas depende de score populado.
- Endpoint público **`GET /api/marketplace/featured`** (`backendnode/src/api/marketplace/marketplace.service.ts:getFeatured`) é **duplicado** com filtros extras — precisa ser **consolidado** em um único endpoint.
- Endpoints ADMIN/COMPLIANCE **a criar**:
  - `POST /admin/startups/:id/pin` — body `{ reason: string (min 20 chars) }`, retorna `409 Conflict` se já há 3 pinned; gera `AuditLog{action:'PIN_STARTUP'}`
  - `DELETE /admin/startups/:id/pin` — desativa pin
  - `GET /admin/marketplace/pinned` — lista dos 3 pinos ativos + justificativas
- Endpoint fundador **a criar**: `GET /api/startups/:id/marketplace-info` — retorna `{ score, breakdown, position, suggestions }` para dashboards fundadores
- **Job `RecalculateMarketplaceScore`** (cron 03:00 BRT) recalcula scores em batch + invalida cache Redis
- Cálculo de score atual já existe (`backendnode/src/api/admin/admin.service.ts:525-565`) — mas só é disparado manualmente por Compliance; precisa ser **agendado e automático**
- Limit de **3 pinos simultâneos** enforçado por UNIQUE constraint parcial via Prisma + validação no service

### Frontend
- **Home pública (`/`)** consome `/api/startups/featured` via BFF `app/routes/api/startups-featured.ts` (já existe) e renderiza via componente `app/components/landing/featured-rounds.tsx` (`Rodadas em Destaque` via `Carousel3D`)
- **Tooltip no card** explica transparência: pinos mostram "Em destaque por: parceria com aceleradora X"; auto-rank mostram "Score 88/100"
- **`/founder/dashboard`** ganha novo card **"Posição no Marketplace"** com score + breakdown colapsável + botão "Como melhorar?" abrindo checklist acionável
- **`/admin/marketplace`** (rota nova) para ADMIN/COMPLIANCE pinear/despinear startups com modal de justificativa obrigatória
- **BFFs existentes** que devem ser atualizados: `app/routes/api/startups-featured.ts`, `startups-recently-added.ts`, `startups-opportunities.ts` (todos já apontam para `/api/...` no BACKEND_URL)

### Compliance / LGPD
- **Pinning manual** gera `AuditLog` com IP + userAgent + actorId + reason (LGPD Art. 37 — registro de operações)
- **Motivo obrigatório** (≥ 20 chars) — força accountability
- **Alerta automático** ao DPO quando há pinning/unpinning (mesma base legal: Art. 7º V LGPD)
- **Detecção de outliers:** score mudou > 30 pontos/dia → alerta DPO (possível bug ou manipulação)
- **Privacidade:** score breakdown é visível só ao founder da startup + ADMIN + COMPLIANCE; visitantes veem tooltip resumido (sem números específicos)

### Configurações relacionadas (`finance_config`)
| Chave | Default | Uso |
|---|---|---|
| `marketplace.featured_limit` | 10 | Total de slots (pinned 3 + auto 7) |
| `marketplace.opportunities_limit` | 16 | Tamanho do catálogo paginado |
| `marketplace.recent_limit` | 5 | Aba "Recém-adicionados" |

### Frontend (Referência)
- Ver PRD `scripts/marketplace/PRD_MARKETPLACE_REGRAS.md` §3 (algoritmo detalhado), §5 (RF), §6 (NFR), §8 (fluxos).
- **Spec de implementação (pronto-para-codar):** `scripts/PRD_MARKETPLACE_IMPL.md` com DEC-MKT-01..03 resolvidas (defaults em §2), DDL Prisma exato (§3), contratos de API JSON exatos com request/response completos (§4), pseudocódigo TypeScript do `ScoreCalculatorService` (§5), wireframes ASCII detalhados do card founder + admin marketplace (§6), eventos NestJS EventEmitter2 mapeados (§7), sequência de 4 sprints com 18 tasks técnicas (§8) e critérios de aceite por RF (§9).

---

## [Roteamento Frontend] — Convenção de paths nos BFFs

### Geral
- Toda rota do frontend é registrada manualmente em `frontend/app/routes.ts` (`route(path, file)` ou `prefix("api", [...])`). **Não há roteamento file-based implícito** — adição de arquivos em `app/routes/` sem entrada correspondente em `routes.ts` resulta em 404 em runtime.
- BFFs vivem em `frontend/app/routes/api/`. Cada BFF importa `BACKEND_URL` de `frontend/app/lib/api-config.ts` (single source of truth — `import.meta.env.VITE_API_URL` resolvido em build).

### Frontend
- **Convenção obrigatória arquivo ↔ path:** o nome do arquivo de BFF usa **hífen** como separador (`startups-featured.ts`, `testimonials-investors.ts`, `marketplace-early-access-ranking.ts`) para evitar colisão com a heurística file-based em builds desatualizados. O **path HTTP registrado em `routes.ts` usa barra** (`api/startups/featured`, `api/testimonials/investors`, `api/marketplace/early-access/ranking`).
- **Ordem das rotas em `routes.ts`:** rotas estáticas (`startups/featured`, `startups/opportunities`, `startups/recently-added`) **DEVEM** estar registradas ANTES de qualquer rota com `:id` no mesmo nível (`startups/:id`). Ver âncora canônica em `frontend/app/routes.ts:54`.
- Loaders SSR (`routes/public/index.tsx`, `routes/private/*.tsx`) **DEVEM** chamar o fetch via path BFF local (com barra), ex.: `fetch('http://' + request.headers.get('host') + '/api/startups-featured')` ou simplesmente `fetch('http://iselftoken.com/api/startups-featured')` em produção. Chamar `BACKEND_URL + '/api/startups/featured'` direto é **proibido** — quebra 5 dos 6 endpoints da landing porque o NestJS não os serve nesse path (são aliasados pelos BFFs para `/marketplace/...`, `/depoimento`, `/startup-opinion`).
- Adicionar nova rota exige 3 passos coordenados: (1) criar arquivo em `routes/api/` com hífen, (2) registrar `route(path, file)` em `routes.ts` na ordem correta, (3) qualquer loader SSR que for usá-la deve importar o path HTTP **com barra** do registrado.

---

## [Integração Backend] — Status conhecido de features parciais

### Geral
- Documento `docs/STATUS.md` mantém o mapa vivo de quais páginas estão integradas com o backend, quais estão parciais, quais têm fallbacks vazios e quais endpoints backend não têm frontend consumer.
- Auditoria de integração foi feita na Sprint 1 (limpeza + fixes de path); ela **NÃO** implementa as features backend que frontend ainda não consome — apenas documenta o gap.

### Backend
- Endpoints backend **sem frontend consumer** (~50): agrupados por domínio em `docs/STATUS.md` seções 3.1–3.10. Principais:
  - Wallet: `POST /wallet/deposit`, `POST /wallet/withdraw`
  - Notifications: 4 endpoints em `/notifications` (componente frontend existe mas não chama API)
  - Payment V2: `/api/v2/payments/checkout`, `/status/:id`, `/transactions`, `/payouts`
  - Affiliate completo: 11 endpoints em `/affiliate/*`, `/founder/affiliate/*`, `/admin/affiliate/*`
  - Admin: payments/transactions detail, installments config, fundraising config
  - Coupon validate: `POST /coupons/validate` (público)

### Frontend
- **Páginas com integração parcial** (ver `docs/STATUS.md` seção 2):
  - `/founder/startups/:id/edit/time` — `onSave` é no-op com comentário explicativo; backend permite PATCH `/startup/:id` com `socios+teams` mas UI mantém estado local. Persistência em sprint futura.
  - `/compliance/users/:id/notas-selos` — read-only com banner "em desenvolvimento". Backend ainda não expõe mutações de notas/seals/rating em user-level (só existem em startup-level).
  - `/home` banner — lista vazia por design (backend não tem `/marketplace/banner`). Quando backend implementar, BFF já faz proxy.

### BFFs — Padrões de fallback
- Quando o backend não expõe o endpoint esperado, o BFF deve retornar **fallback defensivo** (ex.: lista vazia) com status 200, em vez de lançar 404. A UI deve exibir empty state.
- Exemplo: `routes/api/compliance.campaigns.ts` faz fallback para `/campaigns` (público) quando `/admin/compliance/campaigns` não existe.
- Exemplo: `routes/api/marketplace-banner.ts` retorna `{ data: [] }` quando backend não responde.

### Anti-patterns proibidos (fixados na Sprint 1)
- ❌ **Mock de loader retornando dados falsos quando backend falha** (ex.: `compliance-user-detail.tsx` retornava "João Silva" / `joao@example.com`). Substituído por `throw new Response("erro", { status })` + helper `normalizeUserDetail` em `app/lib/normalize.ts`.
- ❌ **Botões que fingem funcionar com `setTimeout` + `toast.success`** sem chamada real ao backend. Os 8 stubs foram substituídos por `useMutation` apontando a BFFs reais, ou desabilitados com banner explicativo quando o backend não tem endpoint.
- ❌ **`result.data \|\| fallback` quando `result.data` é truthy mas com shape parcial** (Pattern A). Migrar para helper `extractData()` + `normalizeUserDetail` que aplica defaults por campo sem confiar em `||` truthy check.
- ❌ **BFFs com path errado** (geram 404). Os 16 paths quebrados foram corrigidos — ver `docs/STATUS.md` seção 4 para detalhes.

### Regra de ouro para integração
- Toda nova feature que envolve UI + backend: criar (1) backend endpoint, (2) BFF com proxy limpo, (3) registro em `routes.ts`, (4) loader/action na página, (5) entrada na tabela de `docs/STATUS.md`. Nunca pular etapas.



## [Marketplace] — Páginas Pública e Privada da Startup

### Geral
- Cada startup/campanha possui duas experiências de detalhe: uma página pública de divulgação e uma página privada para investidores autenticados.
- A página pública não pode expor todos os detalhes da startup nem permitir compra direta de tokens.
- O investimento iniciado a partir da divulgação deve encaminhar o visitante para login ou cadastro e, após autenticação, para a página privada correspondente.
- A página privada deve apresentar os dados autorizados da startup e da campanha ativa para apoiar a decisão e permitir iniciar a compra de tokens.

### Backend
- O detalhe público e o detalhe privado devem possuir contratos de resposta separados, com seleção explícita de campos.
- Dados bancários, documentos privados e dados pessoais de investidores nunca fazem parte do contrato público.
- A criação do investimento continua sujeita às validações do backend e ao fluxo canônico de pagamento existente.

### Frontend
- A rota pública deve ficar fora do componente/layout autenticado.
- A rota privada deve permanecer protegida pelo layout e pelo fluxo de autenticação vigente.
- O CTA público deve preservar um redirect interno para a página privada, sem permitir redirecionamento para host externo.
- A página privada deve consumir dados de servidor via TanStack Query com hidratação SSR, sem duplicar as consultas de autenticação do layout.

### Decisões complementares
- Somente campanhas com status `OPEN` aparecem na home, na rota `/` e nas páginas de oportunidade pública/privada; campanhas `DRAFT`, `PAUSED`, `CLOSED`, `FUNDED` e `PAID_OUT` ficam fora da vitrine.
- A página pública exibe somente identidade, meta, valor captado, progresso e equity da campanha `OPEN`.
- O preço de compra do token é o valor oficial de `Campaign.tokenPrice`, configurado e mantido por Admin/Financeiro; ele não é exibido na página pública e deve ser validado pelo backend no investimento.
- Documentos da startup não são exibidos na página pública. Equipe e sócios são exibidos apenas na página privada, com dados autorizados e sem documentos pessoais.
- A URL pública canônica usa `/s/:slug`; `/s/:id` existe apenas como fallback e deve redirecionar permanentemente para o slug quando disponível. A URL privada `/startups/:id` não é indexável.


## [Investimento] — Checkout, Expiração e Confirmação de Tokens

### Geral
- Ao clicar em investir, o usuário inicia uma ordem vinculada a um `Investment`, um `Payment` e uma reserva de tokens.
- A ordem só é concluída quando o pagamento é confirmado e os efeitos de domínio terminam com o investimento `CONFIRMED` e os tokens emitidos.
- Se o usuário abandonar o checkout ou o prazo expirar sem pagamento, a ordem deve ser encerrada logicamente e não pode ser retomada; o usuário deve iniciar um novo investimento.
- A ordem não deve ser apagada fisicamente: Payment, Investment e Reservation devem permanecer para auditoria, suporte, conciliação financeira e LGPD.

### Backend
- A criação de Investment, Payment e TokenReservation deve ser atômica.
- O prazo oficial vem de `Payment.expiresAt`; a recomendação inicial para investimento é TTL configurável de 30 minutos, alinhado ao prazo da cobrança EFI.
- A expiração deve reconciliar o gateway antes de cancelar, evitando cancelar pagamentos confirmados tardiamente.
- Cancelamento ou expiração deve aplicar, de forma idempotente, `Payment.CANCELED`, `Investment.CANCELED` e `TokenReservation.DISCARDED`, com motivo e AuditLog.
- Novo estado `PaymentStatus.EXPIRED`: quando `expiresAt <= now` sem pagamento confirmado, o Payment transita para `EXPIRED` antes de qualquer ação de cancelamento. Se o gateway confirmar pagamento após o cron de expiração mas antes do cancelamento, o caminho de confirmação vence.
- Um pagamento `PAID` com efeitos ainda pendentes não pode ser apresentado como compra concluída; deve permanecer em processamento até os tokens serem emitidos.
- A página de confirmação deve consultar apenas o investimento do usuário autenticado e liberar o link de transparência somente após existir token confirmado.

### Frontend
- O checkout deve exibir countdown baseado em `expiresAt` retornado pelo backend, nunca em prazo fixo somente no navegador.
- Deve existir ação explícita “Cancelar pagamento e sair”. O cancelamento em `pagehide` pode ser best-effort, mas o TTL/cron é a garantia de consistência.
- Ao expirar, o checkout deve bloquear a interação com blur e overlay, informar “Pagamento expirado” e oferecer “Refazer investimento”.
- Após confirmação, deve existir uma página privada de sucesso mostrando startup, valor pago, total de tokens comprados e mensagem de confirmação.
- A página de sucesso deve oferecer “Acessar transparência da startup” somente quando o usuário possuir token confirmado.

## [Autenticação] — Registro de acesso e aviso após inatividade

### Geral
- Após a confirmação do 2FA, o acesso autenticado deve ser registrado uma única vez por sessão.
- Quando o último acesso autenticado registrado do usuário tiver ocorrido há mais de 24 horas, o sistema deve enviar um aviso de acesso por e-mail.
- O primeiro acesso sem histórico anterior não dispara aviso; apenas registra o acesso.

### Backend
- O usuário do registro deve ser obtido da sessão autenticada no backend, nunca do corpo enviado pelo navegador.
- O IP deve ser resolvido prioritariamente pelo backend a partir de `req.ip`, respeitando a política `trust proxy`; headers de encaminhamento enviados pelo cliente não são confiáveis por si só.
- Quando o BFF fizer a chamada server-side e o backend enxergar apenas loopback, rede privada ou IP ausente, o frontend pode enviar o IP público obtido uma única vez por `ipinfo.io`, com fallback para `ip-api.com`; esse valor é validado e usado apenas como metadata de acesso, nunca para autenticação ou autorização.
- O registro usa `AccessLog` com `type: AF2_VERIFIED`, contendo IP, User-Agent, método, rota e data/hora.
- A deduplicação por sessão deve ser garantida no Redis, e falhas no envio do aviso não podem invalidar nem bloquear a autenticação já concluída.

### Frontend
- Depois do sucesso do 2FA, o frontend chama o BFF de registro de acesso no máximo uma vez por montagem do fluxo e consulta `ipinfo.io`, usando `ip-api.com` como fallback; a falha dessa consulta é silenciosa.
- O frontend nunca usa o IP informado pelo navegador para autorizar operações ou substituir a sessão HTTP-only.
- Falhas no registro ou no envio do aviso são silenciosas para o usuário e não impedem o redirecionamento para a área autenticada.

---

## [Payout] — Gestão de Captações Finalizadas e Parcelas

### Geral
- A conclusão da captação ocorre por **meta atingida** (100% dos tokens vendidos) ou **tempo** (período expirado). Após conclusão, a startup entra em `FUNDED` → `AWAITING_PAYOUT_DECISION` (janela de processamento de ∼7 dias úteis, prorrogável).
- O Admin/Compliance decide entre **Prorrogar** (identificou potencial) ou **Finalizar Definitivamente** (define parcelas).
- Na prorrogação, o founder paga nova reserva de tokens **calculada apenas sobre o valor adicional** (não sobre o total captado). A nova meta é a soma do captado + valor adicional.
- Na finalização, o Compliance define parcelas (mínimo **12**), com juros conforme configuração do Financeiro. Regra: **1 parcela/mês**, não cumulativa, parcelas não sacadas não expiram.
- O founder solicita parcelas preenchendo o **relatório do mês** (destinação do recurso, lucro, marco, mensagem), que é publicado na página de transparência.
- Financeiro/Admin aprova/rejeita solicitações e marca como pago com comprovante.
- **Notificações**: (1) founder quando captação conclui (FUNDED/CLOSED), (2) admin/compliance com link para `/admin/payouts`, (3) founder quando prorrogação aprovada, (4) founder quando parcelas são definidas com link para `/founder/startups/:id/financeiro`.

### Backend
- Entidade `PayoutProcess`: id, startupId, campaignId, status, conclusionReason (META_ATINGIDA/TEMPO_EXPIRADO), conclusionNotes, decisionDeadline, concludedAt, payoutDecision, createdAt, updatedAt.
- Entidade `PayoutReport`: id, payoutProcessId, installmentId, solicitacaoId, usoRecurso, lucro, marco, mensagem, publicadoTransparencia, createdAt, updatedAt.
- Modelo `Installment` existente estendido com: txId, comprovanteUrl, scheduledDate, totalAmount, number.
- Gates de fase (visão admin): Fase 1 acessível quando existe `Payment TOKEN_RESERVATION`; Fase 2 quando `TAXA_COMPLIANCE = PAID`; Fase 3 quando todos = PAID.
- Gates de fase (visão founder): Etapa 1→2 liberada automaticamente quando `TOKEN_RESERVATION = PAID` (sem aprovação do Admin/Compliance). Etapas 2→3 e 3→4 ainda exigem aprovação do Admin/Compliance.
- Endpoint GET /api/admin/startups/:id/:phase/gate retorna { status, gate, reason }.
- Relatório obrigatório bloqueia aprovação de solicitação (regra do PRD_RECEBIMENTO §7.2).
- Comprovante obrigatório para marcar installment como pago.
- CNPJ mascarado em listagens (LGPD): `12.345.xxx/xxxx-xx`.
- **Audit Log** para todas as decisões de payout: prorrogar (com motivo), finalizar (com definição de parcelas), aprovar/rejeitar installment, marcar como pago (com txId). Campo: action, entity, entityId, decision, justification, performedBy (userId opaco + role), timestamp. Retenção mínima 5 anos (LGPD).
- **Notificações**: serviço envia emails (AWS SES) e notificações internas nos 4 eventos (conclusão, prorrogação, parcelas definidas, decision link para admin).

### Frontend
- `/admin/payouts`: página consolidada com 2 categorias (captação finalizada + solicitações de parcela).
- Cards de decisão mostram: captado, meta, progresso, tokens, janela de decisão com countdown.
- Prorrogar: botão primário, abre modal com novo período (+30/+60 dias).
- Finalizar: dropdown, abre modal "Definir Parcelas" (mín. 12, juros/config, preview tabela).
- Aprovar: habilitado somente com relatório do mês preenchido.
- Rejeitar: sempre disponível com modal de justificativa (mín. 20 caracteres).
- Marcar como pago: habilitado somente com comprovante anexado.
- Design tokens: preto puro #000000, magenta #d500f9, glass panels radius 3xl.
- Fase buttons na tabela: 🔓 ativo (bg-primary/10) / 🔒 trancado (bg-white/5, cursor-not-allowed, tooltip com motivo do gate).
- Transparência: comprovante PAID exibido no relatório mensal com permissão correta (founder + investidores).

---

## [Captação — Founder] — shouldRevalidate do layout (BUG-FT-003)

### Geral
- O layout `/founder/startups/:id/captacao` (e subrotas como `/retornos`, `/tese`, `/governanca`, `/recursos`, `/valores`) tem um `shouldRevalidate` custom para evitar refetch ao trocar entre abas (otimização de UX).
- **Bug**: este `shouldRevalidate` bloqueava também `revalidator.revalidate()` (chamado após save via `fetch` direto). Resultado: `CaptacaoProgressRail` continuava mostrando dados stale mesmo após salvar — todos os campos apareciam como "Pendente" indefinidamente.

### Backend
- N/A (correção é 100% frontend).

### Frontend
- Regra atualizada em `app/routes/private/edit-startup-captacao-revalidate.ts`:
  1. Muda `id` da startup → revalidar
  2. Entra na aba Recursos (mudança de URL) → revalidar
  3. **Revalidação manual** (mesma URL + sem `formMethod`) → revalidar (BUG-FT-003 fix)
  4. Form action POST com `actionResult.error` falsy → revalidar; com erro → não revalidar
  5. Default → não revalidar (otimização preservada)
- 8 testes unitários em `edit-startup-captacao-revalidate.test.ts` cobrindo todos os branches.

---

## [Curadoria Premium] — Ação "Coroar" (Score + Selos pós-Fase 3)

### Geral
- Apenas startups com a **Fase 3 (Detalhes de Captação) APROVADA** podem receber o tratamento de curadoria premium (boost de score e aplicação dos 4 selos curatoriais).
- 4 selos curatoriais disponíveis: **Alta Performance** (ACHIEVEMENT), **AWS Partner** (PARTNERSHIP), **Founders Hunter** (PARTNERSHIP), **Potencial Unicórnio** (ACHIEVEMENT).
- Score de marketplace pode ser incrementado em `–100..+100` (clamp final em 0..100). Aceita delta negativo (decremento) para permitir reduzir score via curadoria.
- Ação "Coroar" é exclusiva de role **ADMIN**; exclusiva do contexto pós-Fase 3.

### Backend
- Endpoint `PATCH /admin/startups/:id/score/increment` aceita `{ delta, reason? }` (validação via `IncrementScoreDto`).
- Validação obrigatória no service (`AdminService.incrementStartupScore`): se a última decisão da Fase 3 em `startup_review_decisions` não for `APPROVED`, retorna **403** com mensagem em PT-BR. Defesa em profundidade — o gating do frontend (botão não renderizado) é apenas affordance.
- Resultado é clampado em 0..100; `appliedDelta` pode ser menor que `delta` solicitado por clamp.
- Cada chamada grava em `AuditLog` com `action='STARTUP_SCORE_INCREMENTED'`, `oldValue` (score anterior), `newValue` (`{ score, delta }`), `ip` do admin.
- Aplicação/remoção dos 4 selos reusa `POST /admin/seals/startup/:id` e `DELETE /admin/seals/startup/:startupId/:sealId` (sem mudança).
- 4 selos seedados em `prisma/seed-premium-seals.ts` (idempotente por slug via `upsert`); tolera PNG ausente (loga warning e pula, sem falhar o seed). Slugs canônicos: `alta_performance`, `aws`, `founders_hunter`, `potencial_unicornio`.
- Comando: `pnpm run seed:premium`. O `prisma/seed.ts` principal também inclui os 4 (atualizado em Sprint S37 — Crown).
- Justificativa (`reason`, máx. 280 chars) opcional mas recomendada — gravada no AuditLog para LGPD/compliance.

### Frontend
- Botão "Coroar" (ícone `Crown` do lucide-react) em `/admin/startups` visível apenas quando `phase 3 reviewStatus === "APPROVED"`. Reusa `useQuery(adminStartupPaymentStatusQueryOptions(startupId))` (mesmo queryKey de `PhaseActions` — TanStack dedup).
- Modal único `AdminPremiumSealDialog` com 2 seções:
  1. **Score de marketplace** — score atual em destaque, input `±N` (–100..+100, ≠ 0), preview ao vivo do novo total (clamp 0..100), campo de justificativa opcional, botão "Aplicar mudança de score".
  2. **Selos premium** — grid 2×2 dos 4 selos, cada um com imagem, nome, descrição e botão Aplicar/Remover individual.
- Cada submissão é um `<Form method="post">` independente (granularidade: admin pode aplicar 1 selo sem mexer no score e vice-versa).
- Estado aplicado/não-aplicado vem de `useQuery(adminStartupSealsQueryOptions)` (compartilhado com o modal "Selos" existente).
- Toasts via Sonner; invalida queries `["admin-startups"]`, `["admin-startup-seals", id]` e `["admin-startup-payment-status", id]` após cada submissão bem-sucedida.
- Toasts/mensagens: PT-BR. Cor primária: magenta `#d500f9` (brand v1.2). Empty state de PNG ausente: `<img onError>` esconde a imagem quebrada sem quebrar layout.

## [Investidor] — Compra de Tokens, Wallet e Acesso à Transparência

### Geral
- Fluxo canônico: KYC `APPROVED` + `plano-investidor` ativo → `/startups/:id` (página privada) → `InvestmentSidebar` → mutação `POST /api/investments` → `/checkout/payment/:id` (PIX ou Cartão EFI) → webhook confirma pagamento → `confirmInvestment` (atômico: confirma reserva, atualiza `tokensSold`, marca `Investment.status=CONFIRMED`, define `allocatedAt`) → `TokensService.emitTokensForInvestment` emite 1 `Token` por `tokensQty` → tokens ficam visíveis em `/wallet` (lista expandível por startup) → investidor ganha acesso a `/founder/startups/:startupId/transparencia` via `TokenGateGuard` (existe Token vinculado ao user).
- Cada `Token` recebe `hash` SHA-256 único (UNIQUE constraint) + `shortCode` (últimos 8 chars do hash) para exibição amigável.
- Token é a chave de acesso à área de transparência (`TokenGateGuard` valida: ADMIN sempre passa; Founder da startup passa; existência de Token independente do status da campaign passa; demais = 403).

### Backend
- `GET /wallet/assets` (em `src/api/wallet/wallet.service.ts:65`) — retorna ativos do investidor agrupados por `(startupId, campaignId, investmentId)` apenas `CONFIRMED`. Cada asset contém: `tokens[]` (1 registro por token, com `id` UUID, `shortCode`, `purchaseVal`, `currentVal`, `acquiredAt`, `investmentId`) + agregados (`tokensCount`, `investedAmount`, `platformFeeAmount`, `totalCharged`, `currentValue`, `averageRoi`). AuthGuard + `plano-investidor` ativo (via `applySessionFilters`).
- `TokensService.getUserTokens()` — inclui `investmentId` (vínculo do aporte) e `shortCode` (derivado do hash, NÃO expõe hash completo).
- `TokensService.emitTokensForInvestment(investmentId)` — idempotente: re-chamar com mesmo `investmentId` é no-op (`existingTokens > 0` retorna 400 com mensagem "Tokens já emitidos para este investimento"). Geração do hash: `${userId}-${campaignId}-${i}-${Date.now()}-${randomBytes(8)}`.
- `Token.investmentId` (nullable) — distingue múltiplos aportes do mesmo investidor na mesma campanha. Tokens legados sem vínculo preservam `investmentId: null`.
- Snapshot financeiro (ADR-008): `currentValue = Σ (token.currentVal × token.quantity)` no endpoint `/wallet/assets`. `Investment.currentVal` espelha quando o selecionado.
- Sem exposição do `hash` completo no payload público (`/wallet/assets` retorna só `shortCode` por privacidade/LGPD).

### Frontend
- `/wallet` (BFF `/api/wallet/assets`) lista ativos em layout editorial com expansão por linha: cada startup vira um `EditorialAssetRow` que, ao clicar (ou no botão chevron), revela os tokens individuais com `shortCode` (em fonte mono magenta), `purchaseVal`, `currentVal`, `acquiredAt`.
- Botão "olho" do asset aponta para `/founder/startups/${startupId}/transparencia` (detalhe por startup), NÃO para `/transparencia` (lista geral).
- `/investments/:id/success` (InvestmentSuccess): link "Acessar transparência da startup" só com `Investment.status === 'CONFIRMED' && tokens.ids.length > 0` (CASE.md §1601-1623, regra "link só com token confirmado"). Token IDs emitidos aparecem em `<details>` expansível com botão de copiar para clipboard.
- Realtime: `usePaymentConfirmedSocket()` invalida `["wallet"]` ao receber `payment.confirmed`. BFF `/api/wallet/assets` é re-chamado automaticamente pelo `useRevalidator` no header da wallet (botão "Atualizar") ou por real-time invalidation.
- Item "Transparência" no sidebar só aparece com `plano-investidor` ativo (`sidebar.tsx:120`). Backend (TokenGateGuard) é a autoridade — frontend só controla affordance.
- Empty state: "Você ainda não possui tokens. Explore o marketplace para começar."
- BFF `/api/wallet/assets` em `app/routes/api/wallet.assets.ts` (proxy `GET ${BACKEND_URL}/wallet/assets` com cookie forward). Registrado em `app/routes.ts:302` antes das rotas `:id`.
